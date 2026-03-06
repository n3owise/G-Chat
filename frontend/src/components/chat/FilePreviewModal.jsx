import { useEffect, useRef } from 'react';

const formatSize = (bytes) => {
    if (!bytes) return '';
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
};

const DOC_EXTS = {
    pdf: { color: 'bg-red-500', label: 'PDF' },
    doc: { color: 'bg-blue-600', label: 'DOC' },
    docx: { color: 'bg-blue-600', label: 'DOCX' },
    xls: { color: 'bg-green-600', label: 'XLS' },
    xlsx: { color: 'bg-green-600', label: 'XLSX' },
    ppt: { color: 'bg-orange-500', label: 'PPT' },
    pptx: { color: 'bg-orange-500', label: 'PPTX' },
    zip: { color: 'bg-yellow-600', label: 'ZIP' },
    txt: { color: 'bg-gray-500', label: 'TXT' },
};

const FilePreviewModal = ({ file, fileType, onClose, onSend, uploading, uploadProgress }) => {
    const previewUrl = useRef(null);

    useEffect(() => {
        if (file && (fileType === 'image' || fileType === 'video')) {
            previewUrl.current = URL.createObjectURL(file);
        }
        return () => {
            if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
        };
    }, [file, fileType]);

    const ext = file?.name?.split('.').pop()?.toLowerCase();
    const docInfo = DOC_EXTS[ext] || { color: 'bg-gray-500', label: ext?.toUpperCase() || 'FILE' };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm">
                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 className="text-white font-semibold text-sm">
                    {fileType === 'image' ? '📷 Image' : fileType === 'video' ? '🎬 Video' : '📄 Document'}
                </h3>
                <div className="w-10" />
            </div>

            {/* Preview */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                {fileType === 'image' && previewUrl.current && (
                    <img src={previewUrl.current} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" />
                )}
                {fileType === 'video' && previewUrl.current && (
                    <video src={previewUrl.current} controls className="max-w-full max-h-full rounded-lg" />
                )}
                {fileType === 'document' && file && (
                    <div className="bg-white rounded-3xl p-10 flex flex-col items-center text-center max-w-xs">
                        <div className={`w-20 h-20 ${docInfo.color} rounded-2xl flex items-center justify-center text-white font-bold text-lg mb-4`}>
                            {docInfo.label}
                        </div>
                        <p className="font-semibold text-gray-800 mb-1 break-all text-sm leading-snug">{file.name}</p>
                        <p className="text-sm text-gray-400">{formatSize(file.size)}</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 pb-6 pt-3 bg-black/60 backdrop-blur-sm">
                {uploading ? (
                    <div className="space-y-2">
                        <div className="flex justify-between text-white text-sm">
                            <span>Uploading…</span>
                            <span className="font-semibold">{uploadProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={onSend}
                        className="w-full bg-primary text-white py-3.5 rounded-2xl font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition shadow-lg"
                    >
                        Send {fileType === 'image' ? 'Image' : fileType === 'video' ? 'Video' : 'Document'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default FilePreviewModal;
