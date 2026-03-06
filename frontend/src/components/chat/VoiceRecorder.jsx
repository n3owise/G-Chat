import { useState, useRef, useEffect } from 'react';

const VoiceRecorder = ({ onClose, onSend, otherUserUID }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const streamRef = useRef(null);

    const MAX_DURATION = 300; // 5 minutes in seconds

    useEffect(() => {
        startRecording();
        return () => {
            stopRecording();
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
            };

            mediaRecorder.start();
            setIsRecording(true);

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => {
                    if (prev >= MAX_DURATION - 1) {
                        handleStopRecording();
                        return MAX_DURATION;
                    }
                    return prev + 1;
                });
            }, 1000);

        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Unable to access microphone. Please grant permission.');
            onClose();
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);

            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        }
    };

    const handleSend = async () => {
        if (!audioBlob) return;

        setUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
            formData.append('voice', audioFile);
            formData.append('receiverUID', otherUserUID);

            await onSend(formData, (progress) => {
                setUploadProgress(progress);
            });

            onClose();
        } catch (error) {
            console.error('Send voice error:', error);
            alert('Failed to send voice message');
        } finally {
            setUploading(false);
        }
    };

    const handleCancel = () => {
        handleStopRecording();
        onClose();
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl animate-slide-up">
                {/* Recording Indicator */}
                <div className="text-center mb-6">
                    {isRecording ? (
                        <>
                            <div className="w-24 h-24 bg-red-500 rounded-full mx-auto mb-6 flex items-center justify-center animate-pulse shadow-lg shadow-red-200">
                                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <p className="text-3xl font-bold text-gray-800 mb-2">{formatTime(recordingTime)}</p>
                            <p className="text-sm font-semibold text-red-500 uppercase tracking-wider">Recording...</p>

                            {/* Waveform Animation */}
                            <div className="flex items-center justify-center space-x-1.5 mt-6 h-10">
                                {[...Array(15)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-1.5 bg-primary rounded-full animate-wave"
                                        style={{
                                            height: `${20 + Math.random() * 80}%`,
                                            animationDelay: `${i * 0.1}s`
                                        }}
                                    ></div>
                                ))}
                            </div>
                        </>
                    ) : audioUrl ? (
                        <>
                            <div className="w-24 h-24 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg shadow-green-200">
                                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <p className="text-3xl font-bold text-gray-800 mb-2">{formatTime(recordingTime)}</p>
                            <p className="text-sm font-semibold text-green-600 uppercase tracking-wider">Ready to Send</p>

                            {/* Audio Player */}
                            <div className="mt-6 p-4 bg-gray-50 rounded-2xl">
                                <audio src={audioUrl} controls className="w-full" />
                            </div>
                        </>
                    ) : null}
                </div>

                {/* Upload Progress */}
                {uploading && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">
                            <span>Uploading Voice Message</span>
                            <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-primary h-full transition-all duration-300 rounded-full"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex space-x-3">
                    {isRecording ? (
                        <>
                            <button
                                onClick={handleCancel}
                                className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold text-sm hover:bg-gray-200 transition active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleStopRecording}
                                className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold text-sm hover:bg-red-600 transition active:scale-95 shadow-lg shadow-red-200"
                            >
                                Stop
                            </button>
                        </>
                    ) : audioUrl ? (
                        <>
                            <button
                                onClick={handleCancel}
                                disabled={uploading}
                                className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold text-sm hover:bg-gray-200 transition active:scale-95 disabled:opacity-50"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={uploading}
                                className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold text-sm hover:bg-primary/90 transition active:scale-95 disabled:bg-gray-300 shadow-lg shadow-primary/20"
                            >
                                {uploading ? 'Sending...' : 'Send Message'}
                            </button>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default VoiceRecorder;
