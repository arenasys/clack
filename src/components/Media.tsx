import React, { useEffect, useRef, useState } from "react";
import {
  PiPlayFill,
  PiPauseFill,
  PiWarningFill,
  PiArrowCounterClockwiseBold,
  PiCornersOutBold,
  PiCornersInBold,
} from "react-icons/pi";
import { MdVolumeUp, MdVolumeDown, MdVolumeOff } from "react-icons/md";

import { useChatState } from "../state";

import { Viewable } from "../models";

function formatSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const paddedSecs = secs.toString().padStart(2, "0");
  return `${minutes}:${paddedSecs}`;
}

var globalVolume: number = 1;

export function VideoDisplay({
  src,
  poster,
  preload,
  showTimestamps,
  showCover,
  onClick,
  videoRef,
}: {
  src: string;
  poster: string;
  preload: string;
  showTimestamps: boolean;
  showCover: boolean;
  onClick: () => boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isShowing, setIsShowing] = useState(!showCover);
  const [isShowingOverlay, setIsShowingOverlay] = useState(false);
  const [isShowingControls, setIsShowingControls] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isVolumeVisible, setIsVolumeVisible] = useState(false);
  const [isVolumeSliding, setIsVolumeSliding] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isErrored, setIsErrored] = useState(false);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [preview, setPreview] = useState(0);
  const [buffers, setBuffers] = useState(Array<{ start: number; end: number }>);
  const videoTimeout = useRef<number | null>(null);
  const seekTimeout = useRef<number | null>(null);
  const volumeTimeout = useRef<number | null>(null);
  const controlsTimeout = useRef<number | null>(null);

  const seekWasPlaying = useRef<boolean>(false);

  const setTooltipPopup = useChatState((state) => state.setTooltipPopup);

  function doSeek(e: MouseEvent, force: boolean = false) {
    if (!videoRef.current || !seekBarRef.current) return;

    const rect = seekBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));

    const newTime = percentage * videoRef.current.duration;

    if (seekTimeout.current) {
      window.clearTimeout(seekTimeout.current);
      seekTimeout.current = null;
    }

    if (percentage == 0) {
      force = true;
    }

    if (percentage == 1) {
      force = true;
    } else {
      setIsEnded(false);
    }

    if (force) {
      setTime(newTime);
      videoRef.current!.currentTime = newTime;
    } else {
      seekTimeout.current = window.setTimeout(() => {
        seekTimeout.current = null;
        setTime(newTime);
        videoRef.current!.currentTime = newTime;
      }, 50);
    }

    setTime(newTime);
    setPreview(percentage);
  }

  function doBuffers() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    var buffers = [];
    for (var i = 0; i < video.buffered.length; i++) {
      buffers.push({
        start: video.buffered.start(i) / video.duration,
        end: video.buffered.end(i) / video.duration,
      });
    }
    setBuffers(buffers);
  }

  function doVolume(e: MouseEvent) {
    if (!videoRef.current || !volumeBarRef.current) return;

    const rect = volumeBarRef.current.getBoundingClientRect();
    const y = rect.bottom - e.clientY;
    const percentage = Math.max(0, Math.min(1, y / rect.height));
    videoRef.current.volume = percentage;
    globalVolume = percentage;
  }

  function doHideVolume(hide: boolean) {
    if (volumeTimeout.current) {
      window.clearTimeout(volumeTimeout.current);
      volumeTimeout.current = null;
    }

    if (!hide) return;

    volumeTimeout.current = window.setTimeout(() => {
      volumeTimeout.current = null;
      setIsVolumeVisible(false);
    }, 150);
  }

  function doHideControls(hide: boolean) {
    if (controlsTimeout.current) {
      window.clearTimeout(controlsTimeout.current);
      controlsTimeout.current = null;
    }

    const timeout = hide ? 150 : 4000;
    controlsTimeout.current = window.setTimeout(() => {
      controlsTimeout.current = null;
      setIsShowingControls(false);
    }, timeout);
  }

  const onSeekMouseUp = (e: MouseEvent) => {
    doSeek(e, true);
    setIsSeeking(false);
    if (seekWasPlaying.current) {
      if (!videoRef.current!.ended) {
        console.log("MOUSE UP PLAY");
        videoRef.current!.play();
      }
    }
    document.removeEventListener("mousemove", doSeek);
    document.removeEventListener("mouseup", onSeekMouseUp);
  };

  const onSeekMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();

    seekWasPlaying.current = !videoRef.current!.paused;
    if (seekWasPlaying.current) {
      videoRef.current!.pause();
    }

    setIsSeeking(true);
    doSeek(e.nativeEvent);

    document.addEventListener("mousemove", doSeek);
    document.addEventListener("mouseup", onSeekMouseUp);
  };

  const onVolumeMouseUp = (e: MouseEvent) => {
    setIsVolumeSliding(false);
    document.removeEventListener("mousemove", doVolume);
    document.removeEventListener("mouseup", onVolumeMouseUp);
  };

  const onVolumeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();

    setIsVolumeSliding(true);
    doVolume(e.nativeEvent);

    document.addEventListener("mousemove", doVolume);
    document.addEventListener("mouseup", onVolumeMouseUp);
  };

  const onFullscreenChange = () => {
    setIsFullscreen(document.fullscreenElement == containerRef.current);
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (!isFullscreen) return;
    if (e.key == "Escape") {
      document.exitFullscreen();
      e.stopImmediatePropagation();
    }
    if (e.key == " ") {
      if (videoRef.current?.paused) {
        videoRef.current?.play();
      } else {
        videoRef.current?.pause();
      }
      e.stopImmediatePropagation();
    }
  };

  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (!isSeeking) {
      setIsPlaying(!video.paused);

      var ended = video.ended;
      if (video.currentTime == video.duration) ended = true;

      setIsEnded(ended);
    }
  }, [isSeeking]);

  useEffect(() => {
    if (!isSeeking) {
      videoTimeout.current = window.setInterval(() => {
        if (!videoRef.current) return;
        if (isSeeking) return;
        if (time != videoRef.current.currentTime) {
          setTime(videoRef.current.currentTime);
        }
      }, 50);
    } else {
      if (videoTimeout.current) {
        window.clearInterval(videoTimeout.current);
        videoTimeout.current = null;
      }
    }

    return () => {
      if (videoTimeout.current) {
        window.clearInterval(videoTimeout.current);
        videoTimeout.current = null;
      }
    };
  }, [isPlaying, isSeeking]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.addEventListener(
      "fullscreenchange",
      onFullscreenChange
    );

    return () => {
      if (!containerRef.current) return;
      containerRef.current.removeEventListener(
        "fullscreenchange",
        onFullscreenChange
      );
    };
  }, [containerRef.current]);

  useEffect(() => {
    document.addEventListener("keydown", onKeydown);
    return () => {
      document.removeEventListener("keydown", onKeydown);
    };
  }, [isFullscreen]);

  var showingControls = true;
  if (isPlaying) {
    showingControls =
      isSeeking || isVolumeSliding || isVolumeVisible || isShowingControls;
  }

  const controls = (
    <>
      <div className={"video-controls" + (!showingControls ? " hidden" : "")}>
        <div
          className="video-button play"
          onClick={() => {
            if (videoRef.current?.paused) {
              videoRef.current?.play();
            } else {
              videoRef.current?.pause();
            }
            setIsPlaying(!videoRef.current?.paused);
          }}
        >
          {isEnded && (
            <PiArrowCounterClockwiseBold className="video-button-icon pi" />
          )}
          {!isEnded && isPlaying && (
            <PiPauseFill className="video-button-icon pi" />
          )}
          {!isEnded && !isPlaying && (
            <PiPlayFill className="video-button-icon pi play" />
          )}
        </div>
        {showTimestamps && (
          <div className="video-duration">
            <span>{formatSeconds(time)}</span>
            <span className="video-duration-seperator">/</span>
            <span>{formatSeconds(duration)}</span>
          </div>
        )}
        <div className="video-timeline">
          <div
            className={"video-bar" + (isSeeking ? " active" : "")}
            ref={seekBarRef}
            onMouseMove={(e: React.MouseEvent<HTMLDivElement>) => {
              const rect = seekBarRef.current!.getBoundingClientRect();
              const percentage = Math.max(
                0,
                Math.min(1, (e.clientX - rect.left) / rect.width)
              );
              setPreview(percentage);
            }}
            onMouseDown={onSeekMouseDown}
          >
            <div className="video-bar-wrapper video-bar-ends">
              <div className="video-bar-layer video-bar-buffers">
                {buffers.map((buffer) => (
                  <div
                    key={buffer.start}
                    className="video-bar-layer video-bar-ends video-bar-buffer"
                    style={{
                      left: `${100 * buffer.start}%`,
                      width: `${100 * (buffer.end - buffer.start)}%`,
                    }}
                  />
                ))}
              </div>
              <div
                className="video-bar-layer video-bar-ends video-bar-preview"
                style={{
                  width: `${100 * preview}%`,
                }}
              />
              <div
                className="video-bar-layer video-bar-ends video-bar-progress"
                style={{
                  width: `${(100 * time) / duration}%`,
                }}
              >
                <span className="video-bar-grabber" />
              </div>
              <div
                className="video-bar-bubble"
                style={{
                  opacity: isSeeking ? 1 : undefined,
                  left: `${100 * preview}%`,
                }}
              >
                {formatSeconds(duration * preview)}
              </div>
            </div>
          </div>
        </div>
        <div className="video-volume-container">
          <div
            className="video-volume"
            style={{
              display: isVolumeVisible || isVolumeSliding ? "block" : "none",
            }}
            onMouseMove={() => {
              doHideVolume(false);
            }}
            onMouseLeave={() => {
              doHideVolume(true);
            }}
          >
            <div className="vertical">
              <div
                ref={volumeBarRef}
                className={
                  "video-volume-bar" + (isVolumeSliding ? " active" : "")
                }
                onMouseDown={onVolumeMouseDown}
              >
                <div
                  className="video-bar-wrapper video-bar-ends video-volume-slider"
                  style={{
                    width: `${100 * volume}%`,
                  }}
                >
                  <span className="video-bar-grabber" />
                </div>
              </div>
            </div>
          </div>
          <div
            className="video-button volume"
            onMouseMove={() => {
              setIsVolumeVisible(true);
            }}
            onMouseLeave={() => {
              doHideVolume(true);
            }}
            onClick={() => {
              if (volume == 0) {
                videoRef.current!.volume = globalVolume;
              } else {
                videoRef.current!.volume = 0;
              }
            }}
          >
            {volume == 0 && <MdVolumeOff className="video-button-icon md" />}
            {volume > 0 && volume < 0.5 && (
              <MdVolumeDown className="video-button-icon md" />
            )}
            {volume >= 0.5 && <MdVolumeUp className="video-button-icon md" />}
          </div>
        </div>
        <div
          ref={fullscreenRef}
          className="video-button fullscreen"
          onClick={() => {
            if (isFullscreen) {
              document.exitFullscreen();
            } else {
              containerRef.current!.requestFullscreen();
            }
          }}
          onMouseEnter={() => {
            var rect = fullscreenRef.current!.getBoundingClientRect();
            var containerRect = containerRef.current!.getBoundingClientRect();

            setTooltipPopup({
              content: "Full Screen",
              direction: "top",
              position: {
                x: rect.left + rect.width / 2,
                y: containerRect.bottom - 32 - 8,
              },
            });
          }}
          onMouseLeave={() => {
            setTooltipPopup(undefined);
          }}
        >
          {isFullscreen ? (
            <PiCornersInBold className="video-button-icon pi fullscreen" />
          ) : (
            <PiCornersOutBold className="video-button-icon pi fullscreen" />
          )}
        </div>
      </div>
    </>
  );

  const loader = (
    <div className="video-loader">
      <div className="loader"></div>
    </div>
  );

  return (
    <div
      className="video-container"
      ref={containerRef}
      onMouseLeave={() => {
        doHideControls(true);
      }}
      onMouseMove={() => {
        doHideControls(false);
        setIsShowingControls(true);
      }}
      onClick={() => {
        if (!isLoaded) {
          onClick();
        }
      }}
    >
      {!isLoaded && !isFullscreen && <img src={preload} />}
      {(isLoaded || !isErrored) && !isFullscreen && (
        <img
          src={poster}
          onLoad={() => {
            setIsLoaded(true);
          }}
          onError={() => {
            setIsErrored(true);
          }}
        />
      )}
      {isLoaded && (
        <>
          <video
            ref={videoRef}
            src={src}
            preload="metadata"
            style={{
              opacity: isLoaded ? 1 : 0,
              objectFit: isFullscreen ? "contain" : undefined,
            }}
            onPlay={() => {
              if (isSeeking) return;
              console.log("PLAY");
              setIsEnded(false);
              setIsPlaying(true);
            }}
            onPlaying={() => {
              setIsWaiting(false);
            }}
            onPause={() => {
              if (isShowing) {
                setIsShowingOverlay(true);
              }

              if (isSeeking) return;
              //console.log("PAUSE");
              setIsEnded(false);
              setIsPlaying(false);
            }}
            onEnded={() => {
              if (isSeeking) return;
              //console.log("ENDED");
              setIsEnded(true);
            }}
            onWaiting={() => {
              setIsWaiting(true);
            }}
            onStalled={() => {
              setIsWaiting(false);
            }}
            onSuspend={() => {
              setIsWaiting(false);
            }}
            onProgress={doBuffers}
            onDurationChange={() => {
              //console.log("DURATION CHANGE");
              setDuration(videoRef.current?.duration ?? 0);
            }}
            onTimeUpdate={doBuffers}
            onVolumeChange={() => {
              setVolume(videoRef.current!.volume);
            }}
            onError={(e) => {
              setIsErrored(true);
            }}
          />

          <div
            className={
              "video-overlay" +
              (!isShowingOverlay ? " hidden" : "") +
              (isPlaying ? " playing" : " paused")
            }
          >
            {isPlaying && <PiPlayFill className="video-overlay-icon" />}
            {!isPlaying && <PiPauseFill className="video-overlay-icon" />}
          </div>

          {!isErrored && (
            <>
              <div
                className={
                  "video-cover" +
                  (!isShowing ? " clickable" : "") +
                  (isErrored ? " error" : "")
                }
                onClick={() => {
                  if (isErrored) return;

                  if (!isShowing) {
                    const shouldShow = onClick();
                    if (!shouldShow) return;

                    videoRef.current!.volume = globalVolume;
                    setIsShowing(true);
                    videoRef.current?.play();
                    return;
                  }

                  if (videoRef.current?.paused) {
                    videoRef.current?.play();
                  } else {
                    videoRef.current?.pause();
                  }
                }}
              >
                {!isShowing && <PiPlayFill className="video-cover-icon play" />}
                {isShowing && isPlaying && isWaiting && loader}
              </div>

              {isShowing && controls}
            </>
          )}
        </>
      )}

      {isErrored && (
        <div className="media-error">
          <PiWarningFill className="media-error-icon" />
        </div>
      )}
    </div>
  );
}

export function ImageDisplay({
  src,
  preload,
  onClick,
}: {
  src: string;
  preload: string;
  onClick: () => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isErrored, setIsErrored] = useState(false);

  useEffect(() => {
    //setIsLoaded(false);
  }, [src]);

  return (
    <div
      className="media-wrapper"
      onClick={() => {
        onClick();
      }}
    >
      {!isLoaded && <PreloadDisplay src={preload} />}
      {
        <img
          src={src}
          onLoad={() => {
            setIsLoaded(true);
          }}
          onError={() => {
            setIsErrored(true);
          }}
          style={{
            opacity: isLoaded ? 1 : 0,
          }}
        />
      }
      {isErrored && (
        <div className="media-error">
          <PiWarningFill className="media-error-icon" />
        </div>
      )}
    </div>
  );
}

export function PreloadDisplay({ src }: { src: string }) {
  return (
    <>
      <div className="preload">
        <img src={src} />
        {/*<div className="preload-blur"></div>*/}
      </div>
    </>
  );
}
