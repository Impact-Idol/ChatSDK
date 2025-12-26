import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

export interface VideoMessageProps {
  url: string;
  thumbnailUrl?: string;
  duration: number; // in seconds
  width?: number;
  height?: number;
  isOwn?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onFullscreen?: () => void;
}

export const VideoMessage: React.FC<VideoMessageProps> = ({
  url,
  thumbnailUrl,
  duration,
  width = 280,
  height = 160,
  isOwn = false,
  onPlay,
  onPause,
  onEnded,
  onFullscreen,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const controlsTimeout = useRef<NodeJS.Timeout>();

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setShowControls(true);
      onEnded?.();
    };

    const handleLoadedData = () => {
      setIsLoaded(true);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [onEnded]);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (isPlaying) {
        video.pause();
        onPause?.();
      } else {
        await video.play();
        onPlay?.();
        hideControlsAfterDelay();
      }
    } catch (error) {
      console.error('Video playback error:', error);
    }
  };

  const hideControlsAfterDelay = () => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2000);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (isPlaying) {
      hideControlsAfterDelay();
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const container = progressRef.current;
    if (!video || !container) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(!isMuted);
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
    onFullscreen?.();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={clsx('chatsdk-video-msg', isOwn && 'chatsdk-video-msg-own')}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      style={{ width, maxWidth: '100%' }}
    >
      <div className="chatsdk-video-container">
        <video
          ref={videoRef}
          src={url}
          poster={thumbnailUrl}
          preload="metadata"
          className="chatsdk-video-player"
          onClick={togglePlayback}
          playsInline
        />

        {/* Play overlay when not playing */}
        {!isPlaying && (
          <button
            className="chatsdk-video-play-overlay"
            onClick={togglePlayback}
            disabled={!isLoaded}
            aria-label="Play video"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>
        )}

        {/* Duration badge */}
        {!isPlaying && (
          <div className="chatsdk-video-duration">
            {formatTime(duration)}
          </div>
        )}

        {/* Controls overlay */}
        <div className={clsx('chatsdk-video-controls', showControls && 'chatsdk-video-controls-visible')}>
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="chatsdk-video-progress"
            onClick={handleProgressClick}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            tabIndex={0}
          >
            <div
              className="chatsdk-video-progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Bottom controls */}
          <div className="chatsdk-video-controls-row">
            <button
              className="chatsdk-video-btn"
              onClick={togglePlayback}
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

            <span className="chatsdk-video-time">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="chatsdk-video-controls-right">
              <button
                className="chatsdk-video-btn"
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                )}
              </button>

              <button
                className="chatsdk-video-btn"
                onClick={handleFullscreen}
                aria-label="Fullscreen"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .chatsdk-video-msg {
          border-radius: var(--chatsdk-radius-xl);
          overflow: hidden;
          background: #000;
        }

        .chatsdk-video-container {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
        }

        .chatsdk-video-player {
          width: 100%;
          height: 100%;
          object-fit: cover;
          cursor: pointer;
        }

        .chatsdk-video-play-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .chatsdk-video-play-overlay:hover {
          background: rgba(0, 0, 0, 0.8);
          transform: translate(-50%, -50%) scale(1.1);
        }

        .chatsdk-video-play-overlay:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .chatsdk-video-play-overlay svg {
          width: 24px;
          height: 24px;
          margin-left: 3px;
        }

        .chatsdk-video-duration {
          position: absolute;
          bottom: var(--chatsdk-space-2);
          right: var(--chatsdk-space-2);
          padding: 2px 6px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          font-size: var(--chatsdk-text-xs);
          font-weight: 500;
          border-radius: var(--chatsdk-radius-sm);
        }

        .chatsdk-video-controls {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
          padding: var(--chatsdk-space-3);
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .chatsdk-video-controls-visible {
          opacity: 1;
        }

        .chatsdk-video-progress {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          cursor: pointer;
          margin-bottom: var(--chatsdk-space-2);
        }

        .chatsdk-video-progress:hover {
          height: 6px;
        }

        .chatsdk-video-progress-bar {
          height: 100%;
          background: var(--chatsdk-primary);
          border-radius: 2px;
          transition: width 0.1s linear;
        }

        .chatsdk-video-controls-row {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
        }

        .chatsdk-video-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          border-radius: var(--chatsdk-radius-sm);
          transition: background 0.15s ease;
        }

        .chatsdk-video-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .chatsdk-video-btn svg {
          width: 16px;
          height: 16px;
        }

        .chatsdk-video-time {
          font-size: var(--chatsdk-text-xs);
          color: white;
          font-variant-numeric: tabular-nums;
        }

        .chatsdk-video-controls-right {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-1);
        }
      `}</style>
    </div>
  );
};

export default VideoMessage;
