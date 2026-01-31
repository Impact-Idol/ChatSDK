import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
export const VoiceRecorder = ({ onRecordingComplete, onCancel, maxDuration = 300, // 5 minutes default
 }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [duration, setDuration] = useState(0);
    const [waveform, setWaveform] = useState([]);
    const [isLocked, setIsLocked] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef();
    const animationRef = useRef();
    const startTimeRef = useRef(0);
    const pausedDurationRef = useRef(0);
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    const updateWaveform = useCallback(() => {
        if (!analyserRef.current || !isRecording || isPaused)
            return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        // Get average amplitude
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalized = average / 255;
        setWaveform((prev) => {
            const newWaveform = [...prev, normalized];
            // Keep last 50 samples for visualization
            return newWaveform.slice(-50);
        });
        animationRef.current = requestAnimationFrame(updateWaveform);
    }, [isRecording, isPaused]);
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Set up audio context for visualization
            audioContextRef.current = new AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);
            // Set up media recorder
            mediaRecorderRef.current = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
            });
            chunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType });
                onRecordingComplete?.(blob, duration, waveform);
                // Clean up
                stream.getTracks().forEach((track) => track.stop());
                audioContextRef.current?.close();
            };
            mediaRecorderRef.current.start(100);
            setIsRecording(true);
            startTimeRef.current = Date.now();
            // Start timer
            timerRef.current = setInterval(() => {
                const elapsed = (Date.now() - startTimeRef.current) / 1000 + pausedDurationRef.current;
                setDuration(Math.floor(elapsed));
                if (elapsed >= maxDuration) {
                    stopRecording();
                }
            }, 100);
            // Start waveform visualization
            updateWaveform();
        }
        catch (error) {
            console.error('Failed to start recording:', error);
        }
    };
    const pauseRecording = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            pausedDurationRef.current = duration;
            if (timerRef.current)
                clearInterval(timerRef.current);
            if (animationRef.current)
                cancelAnimationFrame(animationRef.current);
        }
    };
    const resumeRecording = () => {
        if (mediaRecorderRef.current?.state === 'paused') {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            startTimeRef.current = Date.now();
            timerRef.current = setInterval(() => {
                const elapsed = (Date.now() - startTimeRef.current) / 1000 + pausedDurationRef.current;
                setDuration(Math.floor(elapsed));
                if (elapsed >= maxDuration) {
                    stopRecording();
                }
            }, 100);
            updateWaveform();
        }
    };
    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        setIsPaused(false);
        if (timerRef.current)
            clearInterval(timerRef.current);
        if (animationRef.current)
            cancelAnimationFrame(animationRef.current);
    };
    const cancelRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            // Don't call onRecordingComplete
            mediaRecorderRef.current.onstop = null;
        }
        setIsRecording(false);
        setIsPaused(false);
        setDuration(0);
        setWaveform([]);
        if (timerRef.current)
            clearInterval(timerRef.current);
        if (animationRef.current)
            cancelAnimationFrame(animationRef.current);
        onCancel?.();
    };
    useEffect(() => {
        return () => {
            if (timerRef.current)
                clearInterval(timerRef.current);
            if (animationRef.current)
                cancelAnimationFrame(animationRef.current);
            audioContextRef.current?.close();
        };
    }, []);
    if (!isRecording) {
        return (_jsxs("button", { className: "chatsdk-recorder-start", onClick: startRecording, "aria-label": "Start recording", children: [_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" }), _jsx("path", { d: "M19 10v2a7 7 0 0 1-14 0v-2" }), _jsx("line", { x1: "12", y1: "19", x2: "12", y2: "23" }), _jsx("line", { x1: "8", y1: "23", x2: "16", y2: "23" })] }), _jsx("style", { children: `
          .chatsdk-recorder-start {
            width: 56px;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--chatsdk-primary);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: var(--chatsdk-shadow-lg);
          }

          .chatsdk-recorder-start:hover {
            transform: scale(1.05);
            background: var(--chatsdk-primary-hover);
          }

          .chatsdk-recorder-start:active {
            transform: scale(0.95);
          }

          .chatsdk-recorder-start svg {
            width: 24px;
            height: 24px;
          }
        ` })] }));
    }
    return (_jsxs("div", { className: clsx('chatsdk-recorder', isLocked && 'chatsdk-recorder-locked'), children: [_jsxs("div", { className: "chatsdk-recorder-indicator", children: [_jsx("span", { className: "chatsdk-recorder-dot" }), _jsx("span", { className: "chatsdk-recorder-label", children: "Recording" })] }), _jsx("span", { className: "chatsdk-recorder-duration", children: formatTime(duration) }), _jsx("div", { className: "chatsdk-recorder-waveform", children: waveform.map((height, index) => (_jsx("div", { className: "chatsdk-recorder-bar", style: { height: `${Math.max(4, height * 32)}px` } }, index))) }), _jsxs("div", { className: "chatsdk-recorder-controls", children: [_jsx("button", { className: "chatsdk-recorder-cancel", onClick: cancelRecording, "aria-label": "Cancel", children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) }), _jsx("button", { className: "chatsdk-recorder-pause", onClick: isPaused ? resumeRecording : pauseRecording, "aria-label": isPaused ? 'Resume' : 'Pause', children: isPaused ? (_jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", children: _jsx("polygon", { points: "5 3 19 12 5 21 5 3" }) })) : (_jsxs("svg", { viewBox: "0 0 24 24", fill: "currentColor", children: [_jsx("rect", { x: "6", y: "4", width: "4", height: "16", rx: "1" }), _jsx("rect", { x: "14", y: "4", width: "4", height: "16", rx: "1" })] })) }), _jsx("button", { className: "chatsdk-recorder-send", onClick: stopRecording, "aria-label": "Send", children: _jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", children: _jsx("path", { d: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" }) }) })] }), _jsx("style", { children: `
        .chatsdk-recorder {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
          padding: var(--chatsdk-space-4);
          background: var(--chatsdk-background);
          border: 1px solid var(--chatsdk-border);
          border-radius: var(--chatsdk-radius-2xl);
          box-shadow: var(--chatsdk-shadow-lg);
          animation: chatsdk-slide-up 0.2s ease;
        }

        @keyframes chatsdk-slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .chatsdk-recorder-indicator {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
        }

        .chatsdk-recorder-dot {
          width: 10px;
          height: 10px;
          background: var(--chatsdk-destructive);
          border-radius: 50%;
          animation: chatsdk-pulse 1s infinite;
        }

        @keyframes chatsdk-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }

        .chatsdk-recorder-label {
          font-size: var(--chatsdk-text-sm);
          font-weight: 500;
          color: var(--chatsdk-destructive);
        }

        .chatsdk-recorder-duration {
          font-size: var(--chatsdk-text-lg);
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          color: var(--chatsdk-foreground);
          min-width: 48px;
        }

        .chatsdk-recorder-waveform {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 2px;
          height: 36px;
          min-width: 100px;
          overflow: hidden;
        }

        .chatsdk-recorder-bar {
          width: 3px;
          background: var(--chatsdk-primary);
          border-radius: 2px;
          flex-shrink: 0;
          transition: height 0.1s ease;
        }

        .chatsdk-recorder-controls {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
        }

        .chatsdk-recorder-cancel,
        .chatsdk-recorder-pause {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--chatsdk-muted);
          border: none;
          border-radius: 50%;
          cursor: pointer;
          color: var(--chatsdk-foreground);
          transition: all 0.15s ease;
        }

        .chatsdk-recorder-cancel:hover,
        .chatsdk-recorder-pause:hover {
          background: var(--chatsdk-secondary-hover);
        }

        .chatsdk-recorder-cancel svg,
        .chatsdk-recorder-pause svg {
          width: 18px;
          height: 18px;
        }

        .chatsdk-recorder-send {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--chatsdk-primary);
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .chatsdk-recorder-send:hover {
          transform: scale(1.05);
          background: var(--chatsdk-primary-hover);
        }

        .chatsdk-recorder-send svg {
          width: 20px;
          height: 20px;
          margin-left: 2px;
        }
      ` })] }));
};
export default VoiceRecorder;
