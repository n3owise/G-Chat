import { useEffect } from 'react';

const ICONS = { success: '✓', error: '⚠', info: 'ℹ' };
const COLORS = {
    success: 'bg-gray-900 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white',
};

const Toast = ({ message, type = 'success', onClose }) => {
    useEffect(() => {
        const t = setTimeout(onClose, 3000);
        return () => clearTimeout(t);
    }, [onClose]);

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-slide-down pointer-events-none">
            <div className={`${COLORS[type]} flex items-center space-x-2 px-5 py-3 rounded-full shadow-2xl text-sm font-semibold whitespace-nowrap`}>
                <span className="text-base">{ICONS[type]}</span>
                <span>{message}</span>
            </div>
        </div>
    );
};

export default Toast;
