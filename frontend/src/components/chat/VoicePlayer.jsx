import { useState, useRef, useEffect } from 'react';

const VoicePlayer = ({ voiceUrl, isMine, duration }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(duration || 0);
    const [playbackRate, setPlaybackRate] = useState(1);

    const audioRef = useRef(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => {
            if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
                setAudioDuration(audio.duration);
            }
        };
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('durationchange', updateDuration);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('durationchange', updateDuration);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            // Logic to pause other playing audios could be implemented via a global state or context
            // For now, we just play this one
            audio.play().catch(err => console.error("Playback failed", err));
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e) => {
        const audio = audioRef.current;
        if (!audio || !audioDuration) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        audio.currentTime = percentage * audioDuration;
    };

    const togglePlaybackRate = () => {
        const rates = [1, 1.5, 2];
        const currentIndex = rates.indexOf(playbackRate);
        const nextRate = rates[(currentIndex + 1) % rates.length];
        setPlaybackRate(nextRate);
        if (audioRef.current) {
            audioRef.current.playbackRate = nextRate;
        }
    };

    const formatTime = (seconds) => {
        if (seconds === undefined || seconds === null || isNaN(seconds) || seconds === Infinity) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

    return (
        <div className="flex items-center space-x-3 py-2 min-w-[220px] max-w-full overflow-hidden">
            <audio ref={audioRef} src={voiceUrl} preload="metadata" />

            {/* Play/Pause Button */}
            <button
                onClick={togglePlay}
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isMine ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-primary/10 hover:bg-primary/20 text-primary'
                    } transition shadow-sm active:scale-90`}
            >
                {isPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                )}
            </button>

            {/* Waveform / Progress Bar */}
            <div className="flex-1 space-y-1.5 overflow-hidden">
                <div
                    onClick={handleSeek}
                    className="h-8 flex items-end space-x-0.5 cursor-pointer group"
                >
                    {[...Array(25)].map((_, i) => {
                        const barProgress = (i / 25) * 100;
                        const isActive = barProgress <= progress;
                        // Deterministic random heights based on index
                        const height = ((i * 13) % 60) + 30;
                        return (
                            <div
                                key={i}
                                className={`flex-1 rounded-full transition-all duration-150 ${isActive
                                        ? isMine ? 'bg-white' : 'bg-primary'
                                        : isMine ? 'bg-white/30' : 'bg-gray-300'
                                    } group-hover:opacity-80`}
                                style={{
                                    height: `${height}%`
                                }}
                            ></div>
                        );
                    })}
                </div>

                {/* Time Display */}
                <div className="flex items-center justify-between text-[10px] font-bold tracking-tighter uppercase opacity-80">
                    <span className={isMine ? 'text-white' : 'text-gray-500'}>
                        {formatTime(currentTime)}
                    </span>
                    <span className={isMine ? 'text-white' : 'text-gray-500'}>
                        {formatTime(audioDuration)}
                    </span>
                </div>
            </div>

            {/* Playback Speed */}
            <button
                onClick={togglePlaybackRate}
                className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border flex-shrink-0 ${isMine
                        ? 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                    } transition active:scale-95`}
            >
                {playbackRate}x
            </button>
        </div>
    );
};

export default VoicePlayer;
