/**
 * VideoPlayer.jsx — Netflix-style custom video player.
 *
 * Features:
 * - Large centered play/pause with fade
 * - Custom progress bar with time tooltip
 * - Volume control + mute
 * - Playback speed selector (0.5x – 2x)
 * - Fullscreen + Picture-in-Picture
 * - Keyboard shortcuts (Space/K, arrows, F, M, P, <, >)
 * - Auto-hide controls after 3s inactivity
 * - Zoom (1x–4x) with scroll/buttons, pan with drag
 * - Toggleable Ken Burns auto-zoom effect
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Volume1,
  Maximize, Minimize, PictureInPicture2, X,
  ZoomIn, ZoomOut, RotateCcw, Wand2, Settings,
  SkipBack, SkipForward
} from 'lucide-react';
import './VideoPlayer.css';

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds) {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoPlayer({ src, title, onClose }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const hideTimerRef = useRef(null);
  const kenBurnsRef = useRef(null);

  // Player state
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showCenterIcon, setShowCenterIcon] = useState(false);
  const [centerIconType, setCenterIconType] = useState('play');
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  // Zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [kenBurnsActive, setKenBurnsActive] = useState(false);
  const kenBurnsPhaseRef = useRef(0);

  // ---------------------------------------------------------------------------
  // Controls visibility (auto-hide after 3s)
  // ---------------------------------------------------------------------------
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);
    if (playing) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
      }, 3000);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing) {
      setShowControls(true);
      clearTimeout(hideTimerRef.current);
    } else {
      showControlsTemporarily();
    }
  }, [playing, showControlsTemporarily]);

  // ---------------------------------------------------------------------------
  // Center icon animation (play/pause/seek indicator)
  // ---------------------------------------------------------------------------
  const flashCenterIcon = useCallback((type) => {
    setCenterIconType(type);
    setShowCenterIcon(true);
    setTimeout(() => setShowCenterIcon(false), 600);
  }, []);

  // ---------------------------------------------------------------------------
  // Video event handlers
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration);
    const onProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('progress', onProgress);
    video.addEventListener('volumechange', onVolumeChange);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('volumechange', onVolumeChange);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Player controls
  // ---------------------------------------------------------------------------
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      flashCenterIcon('play');
    } else {
      video.pause();
      flashCenterIcon('pause');
    }
  }, [flashCenterIcon]);

  const seek = useCallback((time) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(time, duration));
  }, [duration]);

  const changeVolume = useCallback((val) => {
    const video = videoRef.current;
    if (!video) return;
    const v = Math.max(0, Math.min(1, val));
    video.volume = v;
    video.muted = v === 0;
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const changeSpeed = useCallback((speed) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;
    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn('Fullscreen not supported:', e);
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP not supported:', e);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Fullscreen change listener
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handler = (e) => {
      // Don't handle if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
          e.preventDefault();
          seek(currentTime - 10);
          flashCenterIcon('rewind');
          showControlsTemporarily();
          break;
        case 'arrowright':
          e.preventDefault();
          seek(currentTime + 10);
          flashCenterIcon('forward');
          showControlsTemporarily();
          break;
        case 'arrowup':
          e.preventDefault();
          changeVolume(volume + 0.1);
          showControlsTemporarily();
          break;
        case 'arrowdown':
          e.preventDefault();
          changeVolume(volume - 0.1);
          showControlsTemporarily();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          showControlsTemporarily();
          break;
        case 'p':
          e.preventDefault();
          togglePiP();
          break;
        case ',':
        case '<': {
          e.preventDefault();
          const idx = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
          if (idx > 0) changeSpeed(PLAYBACK_SPEEDS[idx - 1]);
          showControlsTemporarily();
          break;
        }
        case '.':
        case '>': {
          e.preventDefault();
          const idx = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
          if (idx < PLAYBACK_SPEEDS.length - 1) changeSpeed(PLAYBACK_SPEEDS[idx + 1]);
          showControlsTemporarily();
          break;
        }
        case 'escape':
          if (isFullscreen) {
            document.exitFullscreen();
          } else {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    togglePlay, seek, changeVolume, toggleMute, toggleFullscreen,
    togglePiP, changeSpeed, currentTime, volume, playbackSpeed,
    isFullscreen, onClose, flashCenterIcon, showControlsTemporarily
  ]);

  // ---------------------------------------------------------------------------
  // Progress bar interactions
  // ---------------------------------------------------------------------------
  const handleProgressHover = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    setHoverPosition(e.clientX - rect.left);
    setHoverTime(pos * duration);
  };

  const handleProgressClick = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    seek(pos * duration);
  };

  const handleProgressMouseDown = (e) => {
    setIsSeeking(true);
    handleProgressClick(e);

    const onMove = (e) => {
      const rect = progressRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seek(pos * duration);
    };
    const onUp = () => {
      setIsSeeking(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ---------------------------------------------------------------------------
  // Zoom controls
  // ---------------------------------------------------------------------------
  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 4));
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const zoomOut = useCallback(() => {
    setZoom(prev => {
      const next = Math.max(prev - 0.25, 1);
      if (next === 1) { setPanX(0); setPanY(0); }
      return next;
    });
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  // Mouse wheel zoom (Ctrl+scroll)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handler = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
      }
    };

    container.addEventListener('wheel', handler, { passive: false });
    return () => container.removeEventListener('wheel', handler);
  }, [zoomIn, zoomOut]);

  // ---------------------------------------------------------------------------
  // Pan controls (click-drag when zoomed)
  // ---------------------------------------------------------------------------
  const handlePanStart = (e) => {
    if (zoom <= 1) return;
    // Only start pan on the video area, not controls
    if (e.target.closest('.vp-controls') || e.target.closest('.vp-center-btn')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handlePanMove = useCallback((e) => {
    if (!isPanning) return;
    const maxPan = (zoom - 1) * 200;
    const newX = Math.max(-maxPan, Math.min(maxPan, e.clientX - panStart.x));
    const newY = Math.max(-maxPan, Math.min(maxPan, e.clientY - panStart.y));
    setPanX(newX);
    setPanY(newY);
  }, [isPanning, panStart, zoom]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handlePanMove);
      document.addEventListener('mouseup', handlePanEnd);
      return () => {
        document.removeEventListener('mousemove', handlePanMove);
        document.removeEventListener('mouseup', handlePanEnd);
      };
    }
  }, [isPanning, handlePanMove, handlePanEnd]);

  // Touch pan support
  const handleTouchStart = (e) => {
    if (zoom <= 1 || e.touches.length !== 1) return;
    if (e.target.closest('.vp-controls')) return;
    setIsPanning(true);
    setPanStart({ x: e.touches[0].clientX - panX, y: e.touches[0].clientY - panY });
  };

  const handleTouchMove = useCallback((e) => {
    if (!isPanning || e.touches.length !== 1) return;
    const maxPan = (zoom - 1) * 200;
    const newX = Math.max(-maxPan, Math.min(maxPan, e.touches[0].clientX - panStart.x));
    const newY = Math.max(-maxPan, Math.min(maxPan, e.touches[0].clientY - panStart.y));
    setPanX(newX);
    setPanY(newY);
  }, [isPanning, panStart, zoom]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Ken Burns auto-zoom effect
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (kenBurnsActive && playing) {
      const animate = () => {
        kenBurnsPhaseRef.current += 0.003;
        const phase = kenBurnsPhaseRef.current;

        // Smoothly oscillate zoom between 1.0 and 1.5
        const targetZoom = 1 + 0.25 * (Math.sin(phase) + 1);
        // Gentle pan drift
        const targetPanX = Math.cos(phase * 0.7) * 60;
        const targetPanY = Math.sin(phase * 0.5) * 40;

        setZoom(targetZoom);
        setPanX(targetPanX);
        setPanY(targetPanY);

        kenBurnsRef.current = requestAnimationFrame(animate);
      };
      kenBurnsRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(kenBurnsRef.current);
    } else if (!kenBurnsActive) {
      cancelAnimationFrame(kenBurnsRef.current);
    }
  }, [kenBurnsActive, playing]);

  const toggleKenBurns = useCallback(() => {
    setKenBurnsActive(prev => {
      if (prev) {
        // Reset when turning off
        setZoom(1);
        setPanX(0);
        setPanY(0);
        kenBurnsPhaseRef.current = 0;
      }
      return !prev;
    });
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  // ---------------------------------------------------------------------------
  // Volume icon
  // ---------------------------------------------------------------------------
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  // ---------------------------------------------------------------------------
  // Progress percentage
  // ---------------------------------------------------------------------------
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`vp-container ${showControls ? '' : 'vp-hide-cursor'}`}
      onMouseMove={showControlsTemporarily}
      onMouseDown={handlePanStart}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => {
        // Only toggle play when clicking on the video area (not controls)
        if (!e.target.closest('.vp-controls') && !e.target.closest('.vp-center-btn') && !isPanning && !e.target.closest('.vp-speed-menu')) {
          togglePlay();
        }
        showControlsTemporarily();
      }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        className="vp-video"
        style={{
          transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
          cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
          transition: kenBurnsActive ? 'transform 0.5s ease-out' : (isPanning ? 'none' : 'transform 0.2s ease'),
        }}
        autoPlay
        playsInline
        onClick={(e) => e.stopPropagation()}
      />

      {/* Center play/pause icon */}
      {showCenterIcon && (
        <div className="vp-center-icon">
          {centerIconType === 'play' && <Play size={48} fill="white" />}
          {centerIconType === 'pause' && <Pause size={48} fill="white" />}
          {centerIconType === 'rewind' && <SkipBack size={48} />}
          {centerIconType === 'forward' && <SkipForward size={48} />}
        </div>
      )}

      {/* Large center play button when paused and controls visible */}
      {!playing && showControls && !showCenterIcon && (
        <button className="vp-center-btn" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
          <Play size={56} fill="white" strokeWidth={0} />
        </button>
      )}

      {/* Top gradient + title bar */}
      <div className={`vp-top-bar ${showControls ? 'vp-visible' : ''}`}>
        <div className="vp-title-row">
          <span className="vp-title">{title}</span>
          <button className="vp-top-btn" onClick={(e) => { e.stopPropagation(); onClose(); }} title="Close">
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Bottom controls */}
      <div className={`vp-controls ${showControls ? 'vp-visible' : ''}`}>
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="vp-progress"
          onClick={(e) => { e.stopPropagation(); handleProgressClick(e); }}
          onMouseDown={(e) => { e.stopPropagation(); handleProgressMouseDown(e); }}
          onMouseMove={handleProgressHover}
          onMouseLeave={() => setHoverTime(null)}
        >
          <div className="vp-progress-buffered" style={{ width: `${bufferedPercent}%` }} />
          <div className="vp-progress-played" style={{ width: `${progressPercent}%` }} />
          <div className="vp-progress-thumb" style={{ left: `${progressPercent}%` }} />

          {/* Hover time tooltip */}
          {hoverTime !== null && (
            <div className="vp-progress-tooltip" style={{ left: hoverPosition }}>
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Controls row */}
        <div className="vp-controls-row">
          <div className="vp-controls-left">
            {/* Play/Pause */}
            <button className="vp-ctrl-btn" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
              {playing ? <Pause size={22} /> : <Play size={22} />}
            </button>

            {/* Skip buttons */}
            <button className="vp-ctrl-btn" onClick={(e) => { e.stopPropagation(); seek(currentTime - 10); flashCenterIcon('rewind'); }} title="Rewind 10s">
              <SkipBack size={18} />
            </button>
            <button className="vp-ctrl-btn" onClick={(e) => { e.stopPropagation(); seek(currentTime + 10); flashCenterIcon('forward'); }} title="Forward 10s">
              <SkipForward size={18} />
            </button>

            {/* Volume */}
            <div className="vp-volume-group">
              <button className="vp-ctrl-btn" onClick={(e) => { e.stopPropagation(); toggleMute(); }}>
                <VolumeIcon size={20} />
              </button>
              <input
                type="range"
                className="vp-volume-slider"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={(e) => { e.stopPropagation(); changeVolume(parseFloat(e.target.value)); }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Time display */}
            <span className="vp-time">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="vp-controls-right">
            {/* Zoom controls */}
            <div className="vp-zoom-group">
              <button className="vp-ctrl-btn" onClick={(e) => { e.stopPropagation(); zoomOut(); }} title="Zoom out">
                <ZoomOut size={18} />
              </button>
              <span className="vp-zoom-label">{zoom.toFixed(2)}x</span>
              <button className="vp-ctrl-btn" onClick={(e) => { e.stopPropagation(); zoomIn(); }} title="Zoom in">
                <ZoomIn size={18} />
              </button>
              {zoom > 1 && (
                <button className="vp-ctrl-btn" onClick={(e) => { e.stopPropagation(); resetZoom(); }} title="Reset zoom">
                  <RotateCcw size={16} />
                </button>
              )}
            </div>

            {/* Ken Burns toggle */}
            <button
              className={`vp-ctrl-btn ${kenBurnsActive ? 'vp-ctrl-active' : ''}`}
              onClick={(e) => { e.stopPropagation(); toggleKenBurns(); }}
              title="Auto-zoom (Ken Burns effect)"
            >
              <Wand2 size={18} />
            </button>

            {/* Speed selector */}
            <div className="vp-speed-wrapper" style={{ position: 'relative' }}>
              <button
                className="vp-ctrl-btn vp-speed-btn"
                onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu); }}
                title="Playback speed"
              >
                {playbackSpeed}x
              </button>
              {showSpeedMenu && (
                <div className="vp-speed-menu" onClick={(e) => e.stopPropagation()}>
                  {PLAYBACK_SPEEDS.map(speed => (
                    <button
                      key={speed}
                      className={`vp-speed-option ${playbackSpeed === speed ? 'vp-speed-active' : ''}`}
                      onClick={() => changeSpeed(speed)}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PiP */}
            <button className="vp-ctrl-btn" onClick={(e) => { e.stopPropagation(); togglePiP(); }} title="Picture-in-Picture">
              <PictureInPicture2 size={18} />
            </button>

            {/* Fullscreen */}
            <button className="vp-ctrl-btn" onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} title="Fullscreen (F)">
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
