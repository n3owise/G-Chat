import { useEffect, useRef } from 'react';

const ICONS = {
    edit: { emoji: '✏️', label: 'Edit' },
    'delete-for-me': { emoji: '🗑️', label: 'Delete for Me' },
    'delete-for-everyone': { emoji: '❌', label: 'Delete for Everyone', danger: true },
    forward: { emoji: '↗️', label: 'Forward' },
    copy: { emoji: '📋', label: 'Copy Text' },
};

const MessageActionMenu = ({ message, isMine, onClose, onAction }) => {
    const sheetRef = useRef(null);

    // Close on outside touch
    useEffect(() => {
        const handler = (e) => {
            if (sheetRef.current && !sheetRef.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('touchstart', handler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('touchstart', handler);
        };
    }, [onClose]);

    // Determine available actions
    const withinWindow = message.edit_deadline && new Date() <= new Date(message.edit_deadline);
    const actions = [];

    if (isMine && withinWindow && message.message_type === 'text' && !message.is_deleted_for_everyone) {
        actions.push('edit');
    }
    if (isMine && withinWindow && !message.is_deleted_for_everyone) {
        actions.push('delete-for-everyone');
    }
    actions.push('delete-for-me');
    if (!message.is_deleted_for_everyone) {
        if (message.message_type === 'text') actions.push('copy');
        actions.push('forward');
    }

    return (
        <>
            {/* Dark backdrop */}
            <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onClose} />

            {/* Bottom sheet */}
            <div
                ref={sheetRef}
                className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] bg-white rounded-t-3xl z-50 shadow-2xl animate-slide-up overflow-hidden"
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Message preview */}
                {!message.is_deleted_for_everyone && message.message_text && (
                    <div className="mx-4 mb-3 px-4 py-2.5 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-xs text-gray-400 mb-0.5">Message</p>
                        <p className="text-sm text-gray-700 line-clamp-2">{message.message_text}</p>
                    </div>
                )}

                {/* Action buttons */}
                <div className="divide-y divide-gray-100 mx-2 rounded-2xl overflow-hidden border border-gray-100 mb-2">
                    {actions.map(actionId => {
                        const { emoji, label, danger } = ICONS[actionId];
                        return (
                            <button
                                key={actionId}
                                onClick={() => { onAction(actionId); onClose(); }}
                                className={`w-full flex items-center space-x-4 px-5 py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition ${danger ? 'text-red-600' : 'text-gray-800'}`}
                            >
                                <span className="text-xl w-7 text-center">{emoji}</span>
                                <span className="font-medium text-sm">{label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Cancel */}
                <div className="mx-2 mb-4">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-gray-100 rounded-2xl font-semibold text-gray-600 hover:bg-gray-200 transition text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </>
    );
};

export default MessageActionMenu;
