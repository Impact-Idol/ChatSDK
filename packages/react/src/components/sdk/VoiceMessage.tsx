import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

export interface VoiceMessageProps {
  url: string;
  duration: number; // in seconds
  waveform: number[]; // 0-1 values
  isOwn?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export const VoiceMessage: React.FC<VoiceMessageProps> = ({
  url,
  duration,
  waveform,
  isOwn = false,
  onPlay,
  onPause,
  onEnded,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEnded?.();
    };

    const handleLoadedData = () => {
      setIsLoaded(true);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadeddata', handleLoadedData);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [onEnded]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        onPause?.();
      } else {
        await audio.play();
        setIsPlaying(true);
        onPlay?.();
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const container = progressRef.current;
    if (!audio || !container) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Normalize waveform to 30 bars
  const normalizedWaveform = React.useMemo(() => {
    const targetBars = 30;
    if (waveform.length === targetBars) return waveform;
    if (waveform.length === 0) return Array(targetBars).fill(0.3);

    const result: number[] = [];
    const step = waveform.length / targetBars;

    for (let i = 0; i < targetBars; i++) {
      const start = Math.floor(i * step);
      const end = Math.floor((i + 1) * step);
      let sum = 0;
      for (let j = start; j < end && j < waveform.length; j++) {
        sum += waveform[j];
      }
      result.push(sum / (end - start));
    }
    return result;
  }, [waveform]);

  return (
    <div className={clsx('chatsdk-voice-msg', isOwn && 'chatsdk-voice-msg-own')}>
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        className={clsx('chatsdk-voice-play', isPlaying && 'chatsdk-voice-playing')}
        onClick={togglePlayback}
        disabled={!isLoaded}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </button>

      {/* Waveform */}
      <div
        ref={progressRef}
        className="chatsdk-voice-waveform"
        onClick={handleProgressClick}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={0}
      >
        {normalizedWaveform.map((height, index) => {
          const barProgress = ((index + 1) / normalizedWaveform.length) * 100;
          const isActive = progress >= barProgress;

          return (
            <div
              key={index}
              className={clsx('chatsdk-waveform-bar', isActive && 'chatsdk-waveform-bar-active')}
              style={{
                height: `${Math.max(4, height * 28)}px`,
                animationDelay: isPlaying ? `${index * 30}ms` : '0ms',
              }}
            />
          );
        })}
      </div>

      {/* Time */}
      <span className="chatsdk-voice-time">
        {formatTime(isPlaying ? currentTime : duration)}
      </span>

      <style>{`
        .chatsdk-voice-msg {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
          padding: var(--chatsdk-space-3);
          background: var(--chatsdk-message-bubble);
          border-radius: var(--chatsdk-radius-2xl);
          min-width: 240px;
          max-width: 300px;
        }

        .chatsdk-voice-msg-own {
          background: var(--chatsdk-message-bubble-own);
        }

        .chatsdk-voice-msg-own .chatsdk-voice-play {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .chatsdk-voice-msg-own .chatsdk-voice-play:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .chatsdk-voice-msg-own .chatsdk-waveform-bar {
          background: rgba(255, 255, 255, 0.4);
        }

        .chatsdk-voice-msg-own .chatsdk-waveform-bar-active {
          background: white;
        }

        .chatsdk-voice-msg-own .chatsdk-voice-time {
          color: rgba(255, 255, 255, 0.8);
        }

        .chatsdk-voice-play {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--chatsdk-primary);
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .chatsdk-voice-play:hover {
          transform: scale(1.05);
        }

        .chatsdk-voice-play:active {
          transform: scale(0.95);
        }

        .chatsdk-voice-play:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .chatsdk-voice-play svg {
          width: 18px;
          height: 18px;
          margin-left: 2px;
        }

        .chatsdk-voice-playing svg {
          margin-left: 0;
        }

        .chatsdk-voice-waveform {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 32px;
          gap: 2px;
          cursor: pointer;
          padding: 2px 0;
        }

        .chatsdk-waveform-bar {
          width: 3px;
          background: var(--chatsdk-border-strong);
          border-radius: 2px;
          transition: background 0.1s ease, height 0.15s ease;
        }

        .chatsdk-waveform-bar-active {
          background: var(--chatsdk-primary);
        }

        .chatsdk-voice-waveform:hover .chatsdk-waveform-bar {
          opacity: 0.8;
        }

        .chatsdk-voice-time {
          font-size: var(--chatsdk-text-xs);
          font-weight: 500;
          font-variant-numeric: tabular-nums;
          color: var(--chatsdk-muted-foreground);
          flex-shrink: 0;
          min-width: 36px;
          text-align: right;
        }
      `}</style>
    </div>
  );
};

export default VoiceMessage;
