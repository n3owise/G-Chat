import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../hooks/useAuth';

const MessageInput = ({ onSend, otherUserUID, disabled, onAttachmentClick, onVoiceClick }) => {
    const [text, setText] = useState('');
    const { socket, isConnected } = useSocket();
    const { user } = useAuth();
    const typingRef = useRef(null);
    const textareaRef = useRef(null);

    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }, [text]);

    const emitTyping = (isTyping) => {
        if (socket && isConnected) {
            socket.emit('typing', { receiver_uid: otherUserUID, is_typing: isTyping });
        }
    };

    const handleChange = (e) => {
        setText(e.target.value);
        emitTyping(true);
        clearTimeout(typingRef.current);
        typingRef.current = setTimeout(() => emitTyping(false), 2000);
    };

    const handleSend = () => {
        if (!text.trim()) return;
        onSend(text.trim());
        setText('');
        emitTyping(false);
        clearTimeout(typingRef.current);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="bg-white border-t border-gray-200 px-3 py-2 flex items-end space-x-2 safe-area-bottom">
            {/* Attachment placeholder */}
            <button
                type="button"
                onClick={onAttachmentClick}
                className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-primary hover:bg-gray-100 transition flex-shrink-0 mb-0.5"
                title="Attach file"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
            </button>

            {/* Text area */}
            <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 flex items-end">
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message…"
                    rows={1}
                    disabled={disabled}
                    className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none resize-none leading-snug min-h-[22px] max-h-28"
                />
            </div>

            {/* Send / Mic */}
            {text.trim() ? (
                <button
                    type="button"
                    onClick={handleSend}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 active:scale-95 transition flex-shrink-0 shadow-md"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                </button>
            ) : (
                <button
                    type="button"
                    onClick={() => {
                        emitTyping(false);
                        onVoiceClick?.();
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 active:scale-95 transition flex-shrink-0 shadow-md"
                    title="Voice Recording"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                </button>
            )}
        </div>
    );
};

export default MessageInput;
