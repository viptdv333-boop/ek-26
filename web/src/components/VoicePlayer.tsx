import { useState, useRef, useEffect } from 'react';

interface Props {
  url: string;
  isMine: boolean;
}

export function VoicePlayer({ url, isMine }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnded = () => { setPlaying(false); setCurrentTime(0); };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setPlaying(!playing);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 min-w-[200px] px-3.5 py-2">
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause */}
      <button onClick={toggle} className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isMine ? 'bg-white/20 hover:bg-white/30' : 'bg-accent/20 hover:bg-accent/30'} transition-colors`}>
        {playing ? (
          <svg className={`w-4 h-4 ${isMine ? 'text-white' : 'text-accent'}`} fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className={`w-4 h-4 ${isMine ? 'text-white' : 'text-accent'}`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Waveform bars + progress */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="relative h-6 flex items-center cursor-pointer" onClick={seek}>
          {/* Static waveform bars */}
          <div className="flex items-center gap-[2px] w-full h-full">
            {Array.from({ length: 30 }, (_, i) => {
              const h = [60, 80, 40, 90, 50, 70, 85, 45, 65, 75, 55, 95, 35, 80, 60, 70, 45, 85, 50, 90, 40, 75, 65, 55, 80, 45, 70, 60, 85, 50][i % 30];
              const filled = (i / 30) * 100 < progress;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    filled
                      ? isMine ? 'bg-white/80' : 'bg-accent'
                      : isMine ? 'bg-white/25' : 'bg-gray-500/40'
                  }`}
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>
        </div>
        <div className={`flex justify-between text-[10px] ${isMine ? 'text-white/50' : 'text-gray-500'}`}>
          <span>{fmt(currentTime)}</span>
          <span>{duration ? fmt(duration) : '--:--'}</span>
        </div>
      </div>
    </div>
  );
}
