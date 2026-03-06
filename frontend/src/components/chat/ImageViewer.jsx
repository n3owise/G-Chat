import { useEffect } from 'react';

const ImageViewer = ({ imageUrl, onClose }) => {
    // close on ESC
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm">
                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 className="text-white font-semibold text-sm">Photo</h3>
                {/* Download */}
                <a
                    href={imageUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition"
                    title="Download"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </a>
            </div>

            {/* Image (tap backdrop to close) */}
            <div className="flex-1 flex items-center justify-center p-2" onClick={onClose}>
                <img
                    src={imageUrl}
                    alt="Full size"
                    className="max-w-full max-h-full object-contain select-none"
                    onClick={e => e.stopPropagation()}
                />
            </div>
        </div>
    );
};

export default ImageViewer;
