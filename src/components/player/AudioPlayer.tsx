import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, SkipBack, Volume2 } from 'lucide-react';
import { formatTime } from '../../lib/utils';

interface AudioPlayerProps {
  file: File | string;
  isHost: boolean;
  playing: boolean;
  currentTime: number;
  onStateChange: (state: { playing?: boolean; currentTime?: number; duration?: number }) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  file,
  isHost,
  playing,
  currentTime,
  onStateChange,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [localTime, setLocalTime] = useState(0);
  const [volume, setVolume] = useState(0.8);

  const url = typeof file === 'string' ? file : URL.createObjectURL(file);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      onStateChange({ duration: audio.duration });
    };

    const handleTimeUpdate = () => {
      setLocalTime(audio.currentTime);
      // Host broadcasts time updates occasionally or on pause
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      if (typeof file !== 'string') URL.revokeObjectURL(url);
    };
  }, [url]);

  // Sync with props
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing && audio.paused) {
      audio.play().catch(console.error);
    } else if (!playing && !audio.paused) {
      audio.pause();
    }

    const diff = Math.abs(audio.currentTime - currentTime);
    if (diff > 1) {
      audio.currentTime = currentTime;
    }
  }, [playing, currentTime]);

  const handlePlayPause = () => {
    if (!isHost) return;
    onStateChange({ playing: !playing, currentTime: audioRef.current?.currentTime });
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHost) return;
    const time = parseFloat(e.target.value);
    onStateChange({ currentTime: time });
  };

  return (
    <div className="bg-[#151619] p-6 rounded-xl border border-white/5 shadow-2xl space-y-4">
      <audio ref={audioRef} src={url} className="hidden" />
      
      <div className="flex flex-col items-center gap-6">
        {/* Track Title Placeholder */}
        <div className="text-center space-y-1">
          <div className="text-xs font-mono uppercase tracking-widest text-[#8E9299]">Now Playing</div>
          <div className="text-lg font-medium text-white">
            {typeof file === 'string' ? 'Streaming Audio' : file.name}
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex items-center gap-8">
          <button 
            onClick={() => isHost && onStateChange({ currentTime: 0 })}
            className="text-[#8E9299] hover:text-white transition-colors disabled:opacity-50"
            disabled={!isHost}
          >
            <SkipBack size={24} />
          </button>
          
          <button 
            onClick={handlePlayPause}
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10 disabled:opacity-50"
            disabled={!isHost}
          >
            {playing ? <Pause fill="black" size={32} /> : <Play fill="black" size={32} className="ml-1" />}
          </button>

          <div className="flex items-center gap-2 text-[#8E9299]">
            <Volume2 size={20} />
            <input 
              type="range" 
              min="0" max="1" step="0.01" 
              value={volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                if (audioRef.current) audioRef.current.volume = v;
              }}
              className="w-20 accent-white h-1 rounded-full cursor-pointer"
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-2">
          <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            value={localTime}
            onChange={handleSeek}
            disabled={!isHost}
            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white hover:accent-gray-300"
          />
          <div className="flex justify-between font-mono text-[10px] text-[#8E9299] tracking-tighter">
            <span>{formatTime(localTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
