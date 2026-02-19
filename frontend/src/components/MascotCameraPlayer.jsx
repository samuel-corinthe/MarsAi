import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatTime(rawSeconds) {
  if (!Number.isFinite(rawSeconds) || rawSeconds < 0) return "00:00";

  const totalSeconds = Math.floor(rawSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
      seconds,
    ).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function PlayIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.3-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z" />
    </svg>
  );
}

function PauseIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 5a1 1 0 0 1 1-1h2.5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5zm5.5 0a1 1 0 0 1 1-1H16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-2.5a1 1 0 0 1-1-1V5z" />
    </svg>
  );
}

function SpeakerIcon({ muted, className = "h-4 w-4" }) {
  if (muted) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M4 10v4h4l5 4V6L8 10H4z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 9l5 6m0-6l-5 6" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M4 10v4h4l5 4V6L8 10H4z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 9a4 4 0 0 1 0 6" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 6a8 8 0 0 1 0 12" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FullscreenIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" strokeWidth="2.25" strokeLinecap="round" />
    </svg>
  );
}

function PlayerButton({
  label,
  onClick,
  className = "",
  children,
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-xl border border-cyan-200/25 bg-slate-950/80 text-cyan-100 shadow-[0_6px_24px_rgba(10,20,50,0.4)] transition hover:border-cyan-300/60 hover:bg-slate-900 ${className}`}
    >
      {children}
    </button>
  );
}

async function requestElementFullscreen(element) {
  if (!element) return false;

  const requestMethod =
    element.requestFullscreen ||
    element.webkitRequestFullscreen ||
    element.msRequestFullscreen;

  if (!requestMethod) return false;

  try {
    const result = requestMethod.call(element);
    if (result && typeof result.then === "function") {
      await result;
    }
    return true;
  } catch {
    return false;
  }
}

async function exitDocumentFullscreen() {
  const exitMethod =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.msExitFullscreen;

  if (!exitMethod) return false;

  try {
    const result = exitMethod.call(document);
    if (result && typeof result.then === "function") {
      await result;
    }
    return true;
  } catch {
    return false;
  }
}

const MascotCameraPlayer = ({ src, title, onClose }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hideControlsTimeoutRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [scrubValue, setScrubValue] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [showFullscreenControls, setShowFullscreenControls] = useState(true);
  const [isTouchLike, setIsTouchLike] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(hover: none), (pointer: coarse)").matches;
  });
  const [videoAspect, setVideoAspect] = useState(16 / 9);
  const fullscreenActive = isFullscreen || isPseudoFullscreen;
  const fullscreenControlsVisible = !fullscreenActive || showFullscreenControls;

  const clearHideControlsTimeout = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = null;
    }
  }, []);

  const revealFullscreenControls = useCallback(
    (delayMs) => {
      setShowFullscreenControls(true);
      clearHideControlsTimeout();
      if (!isTouchLike) return;
      const hideDelay = delayMs ?? 2600;
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowFullscreenControls(false);
      }, hideDelay);
    },
    [clearHideControlsTimeout, isTouchLike],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncFromVideo = () => {
      setDuration(video.duration || 0);
      setCurrentTime(video.currentTime || 0);
      setIsPlaying(!video.paused);
      setVolume(video.volume ?? 1);
      setMuted(Boolean(video.muted));
      setPlaybackRate(video.playbackRate || 1);
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setVideoAspect(video.videoWidth / video.videoHeight);
      }
    };

    const handleLoadedMetadata = () => {
      setIsReady(true);
      syncFromVideo();
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    };

    const handleTimeUpdate = () => {
      if (!isScrubbing) {
        setCurrentTime(video.currentTime || 0);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleDurationChange = () => setDuration(video.duration || 0);
    const handleVolumeChange = () => {
      setVolume(video.volume ?? 1);
      setMuted(Boolean(video.muted));
    };
    const handleRateChange = () => setPlaybackRate(video.playbackRate || 1);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("ratechange", handleRateChange);
    video.addEventListener("ended", handleEnded);

    if (video.readyState >= 1) {
      queueMicrotask(handleLoadedMetadata);
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("ratechange", handleRateChange);
      video.removeEventListener("ended", handleEnded);
    };
  }, [isScrubbing, src]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const touchLikeMedia = window.matchMedia("(hover: none), (pointer: coarse)");
    const handleTouchLikeChange = () => {
      setIsTouchLike(touchLikeMedia.matches);
    };

    if (touchLikeMedia.addEventListener) {
      touchLikeMedia.addEventListener("change", handleTouchLikeChange);
      return () => {
        touchLikeMedia.removeEventListener("change", handleTouchLikeChange);
      };
    }

    touchLikeMedia.addListener(handleTouchLikeChange);
    return () => {
      touchLikeMedia.removeListener(handleTouchLikeChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearHideControlsTimeout();
    };
  }, [clearHideControlsTimeout]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const hasNativeFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(hasNativeFullscreen);
      if (hasNativeFullscreen) {
        setIsPseudoFullscreen(false);
        revealFullscreenControls();
      } else {
        clearHideControlsTimeout();
        setShowFullscreenControls(true);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [clearHideControlsTimeout, revealFullscreenControls]);

  useEffect(() => {
    if (!isPseudoFullscreen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsPseudoFullscreen(false);
        clearHideControlsTimeout();
        setShowFullscreenControls(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [clearHideControlsTimeout, isPseudoFullscreen]);

  useEffect(() => {
    if (!fullscreenActive) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const isMobileViewport = window.matchMedia("(max-width: 1024px)").matches;
    const orientationApi = window.screen?.orientation;
    if (isMobileViewport && orientationApi?.lock) {
      orientationApi.lock("landscape").catch(() => {});
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      if (orientationApi?.unlock) {
        try {
          orientationApi.unlock();
        } catch {
          // Some browsers do not allow unlock calls.
        }
      }
    };
  }, [fullscreenActive]);

  const progressPercent = useMemo(() => {
    if (!duration) return 0;
    return clamp((currentTime / duration) * 100, 0, 100);
  }, [currentTime, duration]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
      } catch {
        // Ignore play interruption from browser policy.
      }
      return;
    }

    video.pause();
  };

  const seekBy = (seconds) => {
    const video = videoRef.current;
    if (!video) return;
    const target = clamp((video.currentTime || 0) + seconds, 0, duration || 0);
    video.currentTime = target;
    setCurrentTime(target);
    setScrubValue(target);
  };

  const handleSeekInput = (event) => {
    setIsScrubbing(true);
    setScrubValue(Number(event.target.value));
  };

  const commitSeek = (event) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Number(event.target.value);
    video.currentTime = target;
    setCurrentTime(target);
    setScrubValue(target);
    setIsScrubbing(false);
  };

  const cancelSeek = () => {
    setIsScrubbing(false);
    setScrubValue(currentTime);
  };

  const handleVolumeInput = (event) => {
    const video = videoRef.current;
    if (!video) return;
    const nextVolume = clamp(Number(event.target.value), 0, 1);
    video.volume = nextVolume;
    video.muted = nextVolume === 0;
    setVolume(nextVolume);
    setMuted(nextVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const cycleSpeed = () => {
    const video = videoRef.current;
    if (!video) return;

    const currentIndex = SPEED_OPTIONS.indexOf(playbackRate);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % SPEED_OPTIONS.length : 1;
    const nextRate = SPEED_OPTIONS[nextIndex];
    video.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const handleClose = async () => {
    if (isPseudoFullscreen) {
      setIsPseudoFullscreen(false);
    }
    if (document.fullscreenElement) {
      await exitDocumentFullscreen();
    }
    clearHideControlsTimeout();
    setShowFullscreenControls(true);
    if (typeof onClose === "function") {
      onClose();
    }
  };

  const toggleFullscreen = async () => {
    if (fullscreenActive) {
      if (isPseudoFullscreen) {
        setIsPseudoFullscreen(false);
      } else {
        await exitDocumentFullscreen();
      }
      clearHideControlsTimeout();
      setShowFullscreenControls(true);
      return;
    }

    const enteredNativeFullscreen = await requestElementFullscreen(containerRef.current);
    if (!enteredNativeFullscreen) {
      setIsPseudoFullscreen(true);
      revealFullscreenControls();
    }
  };

  const handleVideoAreaMouseEnter = () => {
    if (!fullscreenActive || isTouchLike) return;
    clearHideControlsTimeout();
    setShowFullscreenControls(true);
  };

  const handleVideoAreaMouseMove = () => {
    if (!fullscreenActive || isTouchLike) return;
    clearHideControlsTimeout();
    setShowFullscreenControls(true);
  };

  const handleVideoAreaMouseLeave = () => {
    if (!fullscreenActive || isTouchLike) return;
    clearHideControlsTimeout();
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowFullscreenControls(false);
    }, 320);
  };

  const handleVideoAreaClick = () => {
    if (!fullscreenActive || !isTouchLike) return;

    if (showFullscreenControls) {
      clearHideControlsTimeout();
      setShowFullscreenControls(false);
      return;
    }

    revealFullscreenControls();
  };

  const handleControlsMouseEnter = () => {
    if (!fullscreenActive || isTouchLike) return;
    clearHideControlsTimeout();
    setShowFullscreenControls(true);
  };

  const handleControlsMouseLeave = () => {
    if (!fullscreenActive || isTouchLike) return;
    clearHideControlsTimeout();
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowFullscreenControls(false);
    }, 320);
  };

  return (
    <div
      ref={containerRef}
      className={
        fullscreenActive
          ? "fixed inset-0 z-[120] m-0 h-[100dvh] w-screen bg-slate-950 p-2 sm:p-4"
          : "relative mb-12 mt-2 w-full"
      }
    >
      <div
        className={`relative overflow-hidden border border-cyan-300/20 bg-slate-950 shadow-[0_25px_80px_rgba(2,10,35,0.6)] ${fullscreenActive ? "h-full rounded-none p-3 sm:rounded-[18px] sm:p-4" : "rounded-[32px] p-4 md:p-6"}`}
      >
        <div className="pointer-events-none absolute -left-24 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-0 h-52 w-52 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-25 [background:linear-gradient(110deg,transparent_0%,rgba(56,189,248,0.08)_30%,transparent_52%,rgba(99,102,241,0.08)_72%,transparent_100%)]" />

        <div className="relative mb-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.95)]" />
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/90">
              {title ? `${title} - Neon Player` : "Neon Player"}
            </p>
          </div>

          {onClose && (
            <PlayerButton label="Close player" onClick={handleClose} className="h-9 w-9">
              <CloseIcon />
            </PlayerButton>
          )}
        </div>

        <div
          className="relative overflow-hidden rounded-[26px] border border-cyan-300/25 bg-black"
          onMouseEnter={handleVideoAreaMouseEnter}
          onMouseMove={handleVideoAreaMouseMove}
          onMouseLeave={handleVideoAreaMouseLeave}
          onClick={handleVideoAreaClick}
        >
          <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(34,211,238,0.18),transparent_42%),radial-gradient(circle_at_82%_78%,rgba(99,102,241,0.2),transparent_40%)]" />
          <div className="pointer-events-none absolute inset-0 z-10 opacity-20 [background:repeating-linear-gradient(180deg,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.06)_1px,transparent_1px,transparent_4px)]" />

          <video
            ref={videoRef}
            src={src}
            className={`relative z-0 mx-auto block w-full bg-black object-contain ${fullscreenActive ? "max-h-[calc(100dvh-200px)] sm:max-h-[calc(100dvh-180px)]" : "max-h-[72vh]"}`}
            style={{ aspectRatio: `${videoAspect}` }}
            preload="metadata"
            playsInline
            autoPlay
          />

          {!isReady && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70">
              <p className="rounded-full border border-cyan-300/30 bg-slate-900/80 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
                Loading Stream
              </p>
            </div>
          )}
        </div>

        <div
          className={
            fullscreenActive
              ? "pointer-events-none absolute inset-x-0 bottom-0 z-30 p-2 sm:p-4"
              : "relative mt-4"
          }
          onMouseEnter={handleControlsMouseEnter}
          onMouseLeave={handleControlsMouseLeave}
        >
          <div
            className={`rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-3 backdrop-blur-sm transition-all duration-200 md:p-4 ${fullscreenActive ? (fullscreenControlsVisible ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0") : "pointer-events-auto translate-y-0 opacity-100"}`}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="w-14 text-[11px] font-bold tabular-nums text-cyan-100/95">
                {formatTime(isScrubbing ? scrubValue : currentTime)}
              </span>

              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-1/2 left-0 h-1.5 w-full -translate-y-1/2 rounded-full bg-slate-700" />
                <div
                  className="pointer-events-none absolute inset-y-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400"
                  style={{ width: `${progressPercent}%` }}
                />
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.1"
                  value={isScrubbing ? scrubValue : currentTime}
                  onChange={handleSeekInput}
                  onMouseUp={commitSeek}
                  onTouchEnd={commitSeek}
                  onKeyUp={commitSeek}
                  onBlur={cancelSeek}
                  className="relative z-10 h-6 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-200 [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(15,23,42,0.85)] [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-cyan-200"
                  aria-label="Seek"
                />
              </div>

              <span className="w-14 text-right text-[11px] font-bold tabular-nums text-cyan-100/95">
                {formatTime(duration)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <PlayerButton label="Rewind 10 seconds" onClick={() => seekBy(-10)} className="h-10 w-10 text-xs font-black">
                -10
              </PlayerButton>

              <PlayerButton
                label={isPlaying ? "Pause" : "Play"}
                onClick={togglePlay}
                className="h-11 w-11 border-cyan-300/50 bg-cyan-500/15"
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </PlayerButton>

              <PlayerButton label="Forward 10 seconds" onClick={() => seekBy(10)} className="h-10 w-10 text-xs font-black">
                +10
              </PlayerButton>

              <div className="mx-1 h-6 w-px bg-cyan-100/20" />

              <PlayerButton label={muted ? "Unmute" : "Mute"} onClick={toggleMute} className="h-10 w-10">
                <SpeakerIcon muted={muted || volume === 0} />
              </PlayerButton>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={handleVolumeInput}
                className="h-8 w-24 cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-slate-700 [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-200 [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(2,6,23,0.75)] [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-slate-700 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-cyan-200"
                aria-label="Volume"
              />

              <PlayerButton label="Playback speed" onClick={cycleSpeed} className="h-10 min-w-[54px] px-2 text-xs font-black">
                {playbackRate}x
              </PlayerButton>

              <div className="ml-auto">
                <PlayerButton
                  label={fullscreenActive ? "Exit fullscreen" : "Fullscreen"}
                  onClick={toggleFullscreen}
                  className="h-10 w-10"
                >
                  <FullscreenIcon />
                </PlayerButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MascotCameraPlayer;

