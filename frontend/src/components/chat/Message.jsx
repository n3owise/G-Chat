import { useState, useRef } from 'react';
import VoicePlayer from './VoicePlayer';

// ─── Helpers ──────────────────────────────────────────
const formatSize = (bytes) => {
    if (!bytes) return '';
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
};

const getStatusTick = (msg, isMine) => {
    if (!isMine) return null;
    if (msg.is_read) return <span className="text-blue-400 text-[11px] font-bold ml-1">✓✓</span>;
    if (msg.is_delivered) return <span className="text-gray-400 text-[11px] font-bold ml-1">✓✓</span>;
    return <span className="text-gray-400 text-[11px] ml-1">✓</span>;
};

const DOC_COLORS = {
    pdf: 'bg-red-500', doc: 'bg-blue-600', docx: 'bg-blue-600',
    xls: 'bg-green-600', xlsx: 'bg-green-600',
    ppt: 'bg-orange-500', pptx: 'bg-orange-500',
    zip: 'bg-yellow-600', txt: 'bg-gray-500',
};

// ─── Footer (timestamp + ticks) ───────────────────────
const MsgFooter = ({ time, msg, isMine }) => (
    <div className={`flex items-center space-x-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
        {msg.is_edited && <span className={`text-[10px] ${isMine ? 'text-white/60' : 'text-gray-400'}`}>edited</span>}
        <span className={`text-[10px] ${isMine ? 'text-white/70' : 'text-gray-400'}`}>{time}</span>
        {getStatusTick(msg, isMine)}
    </div>
);

// ─── Message Component ─────────────────────────────────
const Message = ({ message, isMine, showAvatar, otherUser, onLongPress, onImageClick }) => {
    const pressTimerRef = useRef(null);
    const [pressing, setPressing] = useState(false);

    const time = new Date(message.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const handleTouchStart = () => {
        setPressing(true);
        pressTimerRef.current = setTimeout(() => { setPressing(false); onLongPress?.(message); }, 500);
    };
    const handleTouchEnd = () => { clearTimeout(pressTimerRef.current); setPressing(false); };
    const handleContextMenu = (e) => { e.preventDefault(); onLongPress?.(message); };

    // ── Deleted tombstone
    if (message.is_deleted_for_everyone) {
        return (
            <div className={`flex mb-1 ${isMine ? 'justify-end' : 'justify-start'} px-1`}>
                <span className="text-xs text-gray-400 italic px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200">
                    🚫 This message was deleted
                </span>
            </div>
        );
    }

    // ── Content by type
    const renderContent = () => {
        // Voice
        if (message.message_type === 'voice') {
            return (
                <VoicePlayer
                    voiceUrl={message.file_url}
                    isMine={isMine}
                    duration={0}
                />
            );
        }

        // Image
        if (message.message_type === 'image') {
            return (
                <>
                    <button
                        className="block rounded-xl overflow-hidden max-w-[220px] active:opacity-80 transition"
                        onClick={() => onImageClick?.(message.file_url)}
                    >
                        <img
                            src={message.file_url}
                            alt={message.file_name || 'Image'}
                            className="w-full h-auto object-cover"
                            loading="lazy"
                        />
                    </button>
                    <MsgFooter time={time} msg={message} isMine={isMine} />
                </>
            );
        }

        // Video
        if (message.message_type === 'video') {
            return (
                <>
                    <video
                        src={message.file_url}
                        controls
                        className="rounded-xl max-w-[240px] w-full"
                        preload="metadata"
                    />
                    <MsgFooter time={time} msg={message} isMine={isMine} />
                </>
            );
        }

        // File / Document
        if (message.message_type === 'file') {
            const ext = message.file_name?.split('.').pop()?.toLowerCase();
            const dotColor = DOC_COLORS[ext] || 'bg-gray-500';
            return (
                <a
                    href={message.file_url}
                    download={message.file_name}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-3 py-1 max-w-[220px]"
                    onClick={e => e.stopPropagation()}
                >
                    <div className={`w-10 h-10 ${dotColor} rounded-xl flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold`}>
                        {ext?.toUpperCase().slice(0, 4) || '📄'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${isMine ? 'text-white' : 'text-gray-800'}`}>{message.file_name}</p>
                        <p className={`text-[10px] ${isMine ? 'text-white/60' : 'text-gray-400'}`}>{formatSize(message.file_size)}</p>
                    </div>
                    <div className={`flex-shrink-0 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </div>
                </a>
            );
        }

        // Default: text
        return (
            <>
                <p className="whitespace-pre-wrap break-words leading-snug text-sm">{message.message_text}</p>
                <MsgFooter time={time} msg={message} isMine={isMine} />
            </>
        );
    };

    return (
        <div className={`flex items-end mb-0.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar / spacer */}
            <div className="w-7 flex-shrink-0 mx-1">
                {!isMine && showAvatar ? (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-[10px] font-bold">
                        {otherUser?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                ) : null}
            </div>

            {/* Bubble */}
            <div
                className={`max-w-[74%] select-none transition-opacity ${pressing ? 'opacity-60' : 'opacity-100'}`}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onContextMenu={handleContextMenu}
            >
                {message.is_forwarded && (
                    <p className={`text-[10px] mb-0.5 ${isMine ? 'text-right text-white/60' : 'text-gray-400'}`}>↗ Forwarded</p>
                )}
                <div
                    className={`px-3.5 py-2 rounded-2xl shadow-sm ${message.message_type !== 'image' && message.message_type !== 'video'
                        ? isMine ? 'bg-primary text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm'
                        : 'bg-transparent p-0 shadow-none'
                        }`}
                >
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default Message;
