import { useRef } from 'react';

const ACCEPT = {
    image: 'image/jpeg,image/jpg,image/png,image/gif,image/webp',
    video: 'video/mp4,video/quicktime,video/avi,video/x-matroska,video/webm',
    document: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip',
};

const TYPES = [
    {
        id: 'image',
        label: 'Image',
        color: 'bg-blue-100',
        iconColor: 'text-primary',
        icon: (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
    },
    {
        id: 'video',
        label: 'Video',
        color: 'bg-purple-100',
        iconColor: 'text-purple-600',
        icon: (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
        ),
    },
    {
        id: 'document',
        label: 'Document',
        color: 'bg-green-100',
        iconColor: 'text-green-600',
        icon: (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
    },
];

const FileAttachmentMenu = ({ onClose, onFileSelect }) => {
    const refs = { image: useRef(null), video: useRef(null), document: useRef(null) };

    const handleChange = (e, type) => {
        const file = e.target.files?.[0];
        if (!file) return;
        onFileSelect(file, type);
        onClose();
        e.target.value = ''; // reset so same file can be reselected
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]" onClick={onClose} />
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[396px] bg-white rounded-3xl z-50 shadow-2xl animate-slide-up overflow-hidden">
                <div className="p-5">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="font-bold text-gray-800">Share File</h3>
                        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {TYPES.map(({ id, label, color, iconColor, icon }) => (
                            <button
                                key={id}
                                onClick={() => refs[id].current?.click()}
                                className="flex flex-col items-center space-y-2.5 p-4 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition"
                            >
                                <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center ${iconColor}`}>
                                    {icon}
                                </div>
                                <span className="text-xs font-semibold text-gray-600">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Hidden inputs */}
                {TYPES.map(({ id }) => (
                    <input
                        key={id}
                        ref={refs[id]}
                        type="file"
                        accept={ACCEPT[id]}
                        onChange={e => handleChange(e, id)}
                        className="hidden"
                    />
                ))}
            </div>
        </>
    );
};

export default FileAttachmentMenu;
