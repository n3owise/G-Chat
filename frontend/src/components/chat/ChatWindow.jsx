import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Avatar from '../common/Avatar';
import Message from './Message';
import MessageInput from './MessageInput';
import MessageActionMenu from './MessageActionMenu';
import ForwardModal from './ForwardModal';
import FileAttachmentMenu from './FileAttachmentMenu';
import FilePreviewModal from './FilePreviewModal';
import ImageViewer from './ImageViewer';
import VoiceRecorder from './VoiceRecorder';
import Toast from '../common/Toast';
import Loader from '../common/Loader';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../hooks/useAuth';

// ─── Date helpers ─────────────────────────────────────
const formatLastSeen = (ls) => {
    if (!ls) return 'a while ago';
    const d = new Date(ls), now = new Date();
    const mins = Math.floor((now - d) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString();
};

const formatDateDivider = (date) => {
    const today = new Date(), yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const groupByDate = (messages) => {
    const groups = [];
    let cur = null, grp = null;
    messages.forEach(m => {
        const ds = formatDateDivider(new Date(m.created_at));
        if (ds !== cur) { if (grp) groups.push(grp); cur = ds; grp = { date: ds, messages: [] }; }
        grp.messages.push(m);
    });
    if (grp) groups.push(grp);
    return groups;
};

const MAX_FILE_MB = 100;

// ─── ChatWindow ─────────────────────────────────────────
const ChatWindow = ({ otherUser, onBack }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { socket, sendMessage: socketSend, isConnected } = useSocket();

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [otherOnline, setOtherOnline] = useState(otherUser?.is_online || false);

    // Text action state
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [showActionMenu, setShowActionMenu] = useState(false);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');

    // File upload state
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileType, setFileType] = useState(null);
    const [showFilePreview, setShowFilePreview] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [imageViewerUrl, setImageViewerUrl] = useState(null);
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

    // Toast
    const [toast, setToast] = useState(null);
    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type, key: Date.now() });
    }, []);

    const bottomRef = useRef(null);
    const typingRef = useRef(null);
    const editInputRef = useRef(null);

    const scrollToBottom = useCallback((smooth = true) => {
        bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
    }, []);

    // ── Load messages ──
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await api.get(`/messages/${otherUser.uid}`);
                if (!cancelled && res.data.success) {
                    setMessages(res.data.messages);
                    const unread = res.data.messages
                        .filter(m => m.receiver_uid === user.uid && !m.is_read)
                        .map(m => m.message_id);
                    if (unread.length) {
                        api.post('/messages/read', { messageIds: unread }).catch(() => { });
                        unread.forEach(id => {
                            const m = res.data.messages.find(x => x.message_id === id);
                            if (m) socket?.emit('message_read', { message_id: id, sender_uid: m.sender_uid });
                        });
                    }
                }
            } catch (e) { console.error(e); }
            finally { if (!cancelled) setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [otherUser.uid, user.uid]);

    useEffect(() => { if (!loading) scrollToBottom(false); }, [loading]);

    // ── Socket events ──
    useEffect(() => {
        if (!socket) return;

        const onReceive = (msg) => {
            if (msg.sender_uid === otherUser.uid || msg.receiver_uid === otherUser.uid) {
                setMessages(prev => prev.find(m => m.message_id === msg.message_id) ? prev : [...prev, msg]);
                if (msg.receiver_uid === user.uid) {
                    api.post('/messages/read', { messageIds: [msg.message_id] }).catch(() => { });
                    socket.emit('message_read', { message_id: msg.message_id, sender_uid: msg.sender_uid });
                }
            }
        };

        const onSent = (msg) => {
            if (msg.receiver_uid === otherUser.uid) {
                setMessages(prev => {
                    const idx = prev.findIndex(m => m.message_id === msg.message_id || (msg.temp_id && m.temp_id === msg.temp_id));
                    if (idx >= 0) { const u = [...prev]; u[idx] = msg; return u; }
                    return [...prev, msg];
                });
            }
        };

        const onStatus = ({ message_id, is_read, is_delivered }) => {
            setMessages(prev => prev.map(m =>
                m.message_id === message_id ? { ...m, is_read: is_read ?? m.is_read, is_delivered: is_delivered ?? m.is_delivered } : m
            ));
        };

        const onEdited = (upd) => setMessages(prev => prev.map(m => m.message_id === upd.message_id ? { ...m, ...upd } : m));
        const onDelEvery = ({ message_id }) => setMessages(prev => prev.map(m => m.message_id === message_id ? { ...m, is_deleted_for_everyone: true } : m));
        const onTyping = ({ sender_uid, is_typing }) => {
            if (sender_uid === otherUser.uid) {
                setIsTyping(is_typing);
                clearTimeout(typingRef.current);
                if (is_typing) typingRef.current = setTimeout(() => setIsTyping(false), 4000);
            }
        };
        const onOnline = ({ uid, isOnline }) => { if (uid === otherUser.uid) setOtherOnline(isOnline); };

        socket.on('receive_message', onReceive);
        socket.on('message_sent', onSent);
        socket.on('message_status_update', onStatus);
        socket.on('message_edited', onEdited);
        socket.on('message_deleted_for_everyone', onDelEvery);
        socket.on('user_typing', onTyping);
        socket.on('user_online', onOnline);

        return () => {
            socket.off('receive_message', onReceive);
            socket.off('message_sent', onSent);
            socket.off('message_status_update', onStatus);
            socket.off('message_edited', onEdited);
            socket.off('message_deleted_for_everyone', onDelEvery);
            socket.off('user_typing', onTyping);
            socket.off('user_online', onOnline);
        };
    }, [socket, otherUser.uid, user.uid]);

    useEffect(() => { if (messages.length) scrollToBottom(); }, [messages.length]);
    useEffect(() => { if (editingId) setTimeout(() => editInputRef.current?.focus(), 50); }, [editingId]);

    // ── Text send (optimistic) ──
    const handleSend = (text) => {
        const tempId = `temp_${Date.now()}`;
        setMessages(prev => [...prev, {
            message_id: tempId, temp_id: tempId,
            sender_uid: user.uid, receiver_uid: otherUser.uid,
            message_type: 'text', message_text: text,
            created_at: new Date().toISOString(),
            is_delivered: false, is_read: false, is_edited: false, is_deleted_for_everyone: false,
        }]);
        socketSend({ receiver_uid: otherUser.uid, content: text, message_type: 'text', temp_id: tempId });
    };

    // ── File select → validate → preview ──
    const handleFileSelect = (file, type) => {
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
            showToast(`File must be under ${MAX_FILE_MB}MB`, 'error');
            return;
        }
        setSelectedFile(file);
        setFileType(type);
        setShowFilePreview(true);
    };

    // ── Upload & send file ──
    const handleSendFile = async () => {
        if (!selectedFile || !fileType) return;
        setUploading(true);
        setUploadProgress(0);

        const ENDPOINT = { image: 'send-image', video: 'send-video', document: 'send-document' };
        const FIELD = { image: 'image', video: 'video', document: 'document' };

        try {
            const formData = new FormData();
            formData.append(FIELD[fileType], selectedFile);
            formData.append('receiverUID', otherUser.uid);

            await api.post(`/messages/${ENDPOINT[fileType]}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (e) => {
                    setUploadProgress(Math.round((e.loaded * 100) / (e.total || 1)));
                },
            });

            showToast('File sent!');
        } catch (e) {
            showToast(e.response?.data?.message || 'Upload failed', 'error');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            setShowFilePreview(false);
            setSelectedFile(null);
            setFileType(null);
        }
    };

    const handleSendVoice = async (formData, onProgress) => {
        try {
            await api.post('/messages/send-voice', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (e) => {
                    onProgress(Math.round((e.loaded * 100) / (e.total || 1)));
                },
            });
            showToast('Voice message sent!');
        } catch (e) {
            console.error(e);
            showToast(e.response?.data?.message || 'Failed to send voice', 'error');
            throw e;
        }
    };

    // ── Message action dispatchers ──
    const handleLongPress = (msg) => { setSelectedMessage(msg); setShowActionMenu(true); };

    const handleAction = async (actionId) => {
        if (!selectedMessage) return;
        const { message_id } = selectedMessage;
        switch (actionId) {
            case 'edit':
                setEditingId(message_id);
                setEditText(selectedMessage.message_text);
                break;
            case 'copy':
                try { await navigator.clipboard.writeText(selectedMessage.message_text); showToast('Copied'); }
                catch { showToast('Copy failed', 'error'); }
                break;
            case 'delete-for-me':
                try {
                    await api.delete(`/messages/${message_id}/delete-for-me`);
                    setMessages(prev => prev.filter(m => m.message_id !== message_id));
                    showToast('Message deleted');
                } catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); }
                break;
            case 'delete-for-everyone': {
                if (!window.confirm('Delete for everyone?')) break;
                try {
                    await api.delete(`/messages/${message_id}/delete-for-everyone`);
                    showToast('Deleted for everyone');
                } catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); }
                break;
            }
            case 'forward':
                setShowForwardModal(true);
                break;
            default: break;
        }
    };

    const handleSaveEdit = async () => {
        if (!editText.trim() || !editingId) return;
        try {
            await api.put(`/messages/${editingId}/edit`, { newText: editText.trim() });
            showToast('Edited');
        } catch (e) { showToast(e.response?.data?.message || 'Failed', 'error'); }
        setEditingId(null); setEditText('');
    };

    const handleForward = async (receiverUIDs) => {
        await api.post('/messages/forward', { messageId: selectedMessage.message_id, receiverUIDs });
        showToast(`Forwarded to ${receiverUIDs.length}`);
    };

    const dates = groupByDate(messages);

    return (
        <div className="flex flex-col h-[100dvh] bg-[#EBF0F4]">
            {/* ── Header ── */}
            <div className="bg-primary text-white flex items-center px-2 py-2.5 space-x-2 shadow-md flex-shrink-0 z-50">
                <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button onClick={() => navigate(`/profile/${otherUser.uid}`)} className="flex items-center space-x-2.5 flex-1 min-w-0 hover:bg-white/5 rounded-xl px-2 py-1 transition">
                    <div className="relative flex-shrink-0">
                        <Avatar user={otherUser} size="small" />
                        {otherOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-primary rounded-full" />}
                    </div>
                    <div className="text-left min-w-0">
                        <p className="font-semibold text-sm leading-tight truncate">{otherUser.name}</p>
                        <p className="text-[11px] text-white/70 leading-tight">
                            {isTyping ? <span className="text-green-300 font-medium">typing…</span>
                                : otherOnline ? 'Online' : formatLastSeen(otherUser.last_seen)}
                        </p>
                    </div>
                </button>
            </div>

            {/* ── Offline Banner ── */}
            {!isConnected && (
                <div className="bg-amber-400 text-amber-900 text-[11px] font-semibold text-center py-1 flex-shrink-0">
                    ⚠️ No connection — messages will queue and send when reconnected
                </div>
            )}

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
                {loading ? <Loader text="Loading messages…" /> :
                    messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <Avatar user={otherUser} size="large" />
                            <p className="font-semibold text-gray-600 text-sm mt-4">{otherUser.name}</p>
                            <p className="text-xs text-gray-400 mt-1">Say hello! 👋</p>
                        </div>
                    ) : (
                        dates.map((group, gi) => (
                            <div key={gi}>
                                <div className="flex justify-center my-3">
                                    <span className="text-[11px] text-gray-500 bg-white/70 px-3 py-1 rounded-full shadow-sm">{group.date}</span>
                                </div>
                                {group.messages.map((msg, idx) => {
                                    const isMine = msg.sender_uid === user.uid;
                                    const nextSame = idx < group.messages.length - 1 && group.messages[idx + 1].sender_uid === msg.sender_uid;
                                    if (editingId === msg.message_id) {
                                        return (
                                            <div key={msg.message_id} className="flex flex-col items-end mb-2 px-2">
                                                <div className="w-full bg-white rounded-2xl shadow-md border border-primary/30 p-3">
                                                    <p className="text-[10px] text-primary font-semibold mb-1.5 uppercase tracking-wider">Editing</p>
                                                    <textarea
                                                        ref={editInputRef}
                                                        value={editText}
                                                        onChange={e => setEditText(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); } if (e.key === 'Escape') { setEditingId(null); setEditText(''); } }}
                                                        className="w-full text-sm text-gray-800 outline-none resize-none min-h-[52px] max-h-28"
                                                        rows={2}
                                                    />
                                                    <div className="flex space-x-2 mt-2">
                                                        <button onClick={() => { setEditingId(null); setEditText(''); }} className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">Cancel</button>
                                                        <button onClick={handleSaveEdit} disabled={!editText.trim()} className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-40">Save</button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <Message
                                            key={msg.message_id}
                                            message={msg}
                                            isMine={isMine}
                                            showAvatar={!nextSame}
                                            otherUser={otherUser}
                                            onLongPress={handleLongPress}
                                            onImageClick={url => setImageViewerUrl(url)}
                                        />
                                    );
                                })}
                            </div>
                        ))
                    )
                }
                <div ref={bottomRef} className="h-2" />
            </div>

            {/* ── Input ── */}
            <MessageInput
                onSend={handleSend}
                otherUserUID={otherUser.uid}
                onAttachmentClick={() => setShowAttachMenu(true)}
                onVoiceClick={() => setShowVoiceRecorder(true)}
            />

            {/* ── Overlays ── */}
            {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {showActionMenu && selectedMessage && (
                <MessageActionMenu
                    message={selectedMessage}
                    isMine={selectedMessage.sender_uid === user.uid}
                    onClose={() => setShowActionMenu(false)}
                    onAction={handleAction}
                />
            )}
            {showForwardModal && selectedMessage && (
                <ForwardModal
                    message={selectedMessage}
                    onClose={() => { setShowForwardModal(false); setSelectedMessage(null); }}
                    onForward={handleForward}
                />
            )}
            {showAttachMenu && (
                <FileAttachmentMenu
                    onClose={() => setShowAttachMenu(false)}
                    onFileSelect={handleFileSelect}
                />
            )}
            {showFilePreview && selectedFile && (
                <FilePreviewModal
                    file={selectedFile}
                    fileType={fileType}
                    onClose={() => { setShowFilePreview(false); setSelectedFile(null); setFileType(null); }}
                    onSend={handleSendFile}
                    uploading={uploading}
                    uploadProgress={uploadProgress}
                />
            )}
            {imageViewerUrl && (
                <ImageViewer imageUrl={imageViewerUrl} onClose={() => setImageViewerUrl(null)} />
            )}
            {showVoiceRecorder && (
                <VoiceRecorder
                    onClose={() => setShowVoiceRecorder(false)}
                    onSend={handleSendVoice}
                    otherUserUID={otherUser.uid}
                />
            )}
        </div>
    );
};

export default ChatWindow;
