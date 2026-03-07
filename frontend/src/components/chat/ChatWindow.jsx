import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
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
    const { sendMessage: supabaseSend, isConnected, messages: realtimeMessages } = useSocket();

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

    // ── Load historical messages ──
    useEffect(() => {
        let cancelled = false;
        const fetchHistory = async () => {
            try {
                const { data, error } = await supabase
                    .from('messages')
                    .select('*')
                    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUser.id}),and(sender_id.eq.${otherUser.id},receiver_id.eq.${user.id})`)
                    .order('created_at', { ascending: true });

                if (!cancelled && !error) {
                    setMessages(data || []);
                    // Mark as read logic
                    const unread = (data || [])
                        .filter(m => m.receiver_id === user.id && !m.is_read)
                        .map(m => m.id);

                    if (unread.length) {
                        await supabase
                            .from('messages')
                            .update({ is_read: true, read_at: new Date().toISOString() })
                            .in('id', unread);
                    }
                }
            } catch (e) {
                console.error('History fetch error:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchHistory();
        return () => { cancelled = true; };
    }, [otherUser.id, user.id]);

    // ── Handle Real-time Messages from Context ──
    useEffect(() => {
        if (realtimeMessages.length > 0) {
            const lastMsg = realtimeMessages[realtimeMessages.length - 1];
            // Only add if it's from the current conversation
            if (lastMsg.sender_id === otherUser.id) {
                setMessages(prev => {
                    if (prev.find(m => m.id === lastMsg.id)) return prev;
                    return [...prev, lastMsg];
                });

                // Mark as read in Supabase
                supabase.from('messages')
                    .update({ is_read: true, read_at: new Date().toISOString() })
                    .eq('id', lastMsg.id)
                    .then(() => { });
            }
        }
    }, [realtimeMessages, otherUser.id]);

    // ── Fake typing indicator (Supabase Realtime doesn't have native typing yet, we'll keep it simple) ──
    // In a full migration, we would use Supabase Presence for typing.

    useEffect(() => { if (!loading) scrollToBottom(false); }, [loading]);

    useEffect(() => { if (messages.length) scrollToBottom(); }, [messages.length]);
    useEffect(() => { if (editingId) setTimeout(() => editInputRef.current?.focus(), 50); }, [editingId]);

    // ── Text send (optimistic) ──
    const handleSend = async (text) => {
        const tempId = `temp_${Date.now()}`;
        const newMsg = {
            id: tempId,
            sender_id: user.id,
            receiver_id: otherUser.id,
            message_type: 'text',
            content: text,
            created_at: new Date().toISOString(),
            is_read: false,
            is_deleted_for_everyone: false,
        };

        setMessages(prev => [...prev, newMsg]);

        const result = await supabaseSend({
            receiver_id: otherUser.id,
            content: text,
            message_type: 'text'
        });

        if (!result.success) {
            showToast('Failed to send message', 'error');
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
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

    // ── Upload & send file (Supabase Storage) ──
    const handleSendFile = async () => {
        if (!selectedFile || !fileType) return;
        setUploading(true);
        setUploadProgress(0);

        try {
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;
            const bucketName = 'chat-media';

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, selectedFile, {
                    onUploadProgress: (e) => {
                        setUploadProgress(Math.round((e.loaded * 100) / (e.total || 1)));
                    }
                });

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            // 3. Send Message via SocketContext (which inserts into DB)
            const result = await supabaseSend({
                receiver_id: otherUser.id,
                content: publicUrl,
                message_type: fileType, // image, video, document
                file_url: publicUrl,
                file_name: selectedFile.name,
                file_size: selectedFile.size
            });

            if (result.success) {
                showToast('File sent!');
            } else {
                throw new Error('Failed to send file message');
            }

        } catch (e) {
            console.error('File upload error:', e.message);
            showToast(e.message || 'Upload failed', 'error');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            setShowFilePreview(false);
            setSelectedFile(null);
            setFileType(null);
        }
    };

    const handleSendVoice = async (audioBlob, onProgress) => {
        try {
            const fileName = `${user.id}-${Date.now()}.webm`;
            const filePath = `${fileName}`;
            const bucketName = 'voice-notes';

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, audioBlob, {
                    onUploadProgress: (e) => {
                        onProgress(Math.round((e.loaded * 100) / (e.total || 1)));
                    }
                });

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            // 3. Send Message
            const result = await supabaseSend({
                receiver_id: otherUser.id,
                content: 'Voice Message',
                message_type: 'voice',
                file_url: publicUrl,
                file_name: fileName,
                file_size: audioBlob.size
            });

            if (result.success) {
                showToast('Voice message sent!');
            } else {
                throw new Error('Failed to send voice message');
            }
        } catch (e) {
            console.error('Voice upload error:', e.message);
            showToast('Failed to send voice', 'error');
            throw e;
        }
    };

    // ── Message action dispatchers ──
    const handleLongPress = (msg) => { setSelectedMessage(msg); setShowActionMenu(true); };

    const handleAction = async (actionId) => {
        if (!selectedMessage) return;
        const { id } = selectedMessage;
        switch (actionId) {
            case 'edit':
                setEditingId(id);
                setEditText(selectedMessage.content);
                break;
            case 'copy':
                try { await navigator.clipboard.writeText(selectedMessage.content); showToast('Copied'); }
                catch { showToast('Copy failed', 'error'); }
                break;
            case 'delete-for-me':
                // Note: For-me deletion normally requires a join table, 
                // but for simplicity we'll just remove it from local state or mark it.
                setMessages(prev => prev.filter(m => m.id !== id));
                showToast('Removed from view');
                break;
            case 'delete-for-everyone': {
                if (!window.confirm('Delete for everyone?')) break;
                try {
                    const { error } = await supabase
                        .from('messages')
                        .update({ is_deleted_for_everyone: true, content: 'This message was deleted' })
                        .eq('id', id);
                    if (error) throw error;
                    showToast('Deleted for everyone');
                } catch (e) {
                    console.error('Delete error:', e.message);
                    showToast('Failed to delete', 'error');
                }
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
            const { error } = await supabase
                .from('messages')
                .update({ content: editText.trim(), is_edited: true })
                .eq('id', editingId);
            if (error) throw error;
            showToast('Edited');
        } catch (e) {
            console.error('Edit error:', e.message);
            showToast('Failed to edit', 'error');
        }
        setEditingId(null); setEditText('');
    };

    const handleForward = async (receiverIds) => {
        try {
            const forwardMsgs = receiverIds.map(rid => ({
                sender_id: user.id,
                receiver_id: rid,
                content: selectedMessage.content,
                message_type: selectedMessage.message_type,
                file_url: selectedMessage.file_url,
                file_name: selectedMessage.file_name,
                file_size: selectedMessage.file_size
            }));

            const { error } = await supabase
                .from('messages')
                .insert(forwardMsgs);

            if (error) throw error;
            showToast(`Forwarded to ${receiverIds.length}`);
        } catch (e) {
            console.error('Forward error:', e.message);
            showToast('Failed to forward', 'error');
        }
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
                                    const isMine = msg.sender_id === user.id;
                                    const nextSame = idx < group.messages.length - 1 && group.messages[idx + 1].sender_id === msg.sender_id;
                                    if (editingId === msg.id) {
                                        return (
                                            <div key={msg.id} className="flex flex-col items-end mb-2 px-2">
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
                                            key={msg.id}
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
