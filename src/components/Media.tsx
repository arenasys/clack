import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  PiPlayFill,
  PiPauseFill,
  PiWarningFill,
  PiArrowCounterClockwiseBold,
  PiCornersOutBold,
  PiCornersInBold,
  PiDownloadSimpleBold
} from "react-icons/pi";
import { MdFileDownload, MdVolumeUp, MdVolumeDown, MdVolumeOff } from "react-icons/md";
import { IoMdDownload } from "react-icons/io";
import { useClackState, getClackState, ClackEvents } from "../state";

import { Viewable } from "../types";
import { fadeAllMedia } from "./Common";

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
  isThumbnail,
  onClick,
  videoRef,
}: {
  src: string;
  poster: string;
  preload: string;
  showTimestamps: boolean;
  showCover: boolean;
  isThumbnail?: boolean;
  onClick: () => boolean;
  videoRef?: React.RefObject<HTMLVideoElement>;
}) {
  const fallbackRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef ?? fallbackRef;

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

  const setTooltipPopup = getClackState((state) => state.gui.setTooltipPopup);

  function doPlay() {
    if (!ref.current) return;
    ref.current.volume = volume;
    if (ref.current.paused) {
      fadeAllMedia();
      ref.current.play();
    }
  }

  function doToggle() {
    if (!ref.current) return;
    if (ref.current.paused) {
      doPlay();
    } else {
      ref.current.pause();
    }
  }

  function doSeek(e: MouseEvent, force: boolean = false) {
    if (!ref.current || !seekBarRef.current) return;

    const rect = seekBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));

    const newTime = percentage * ref.current.duration;

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
      ref.current!.currentTime = newTime;
    } else {
      seekTimeout.current = window.setTimeout(() => {
        seekTimeout.current = null;
        setTime(newTime);
        ref.current!.currentTime = newTime;
      }, 50);
    }

    setTime(newTime);
    setPreview(percentage);
  }

  function doBuffers() {
    if (!ref.current) return;
    const video = ref.current;
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
    if (!ref.current || !volumeBarRef.current) return;

    const rect = volumeBarRef.current.getBoundingClientRect();
    const y = rect.bottom - e.clientY;
    const percentage = Math.max(0, Math.min(1, y / rect.height));
    setVolume(percentage);
    ref.current.volume = percentage;
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
      if (!ref.current!.ended) {
        console.log("MOUSE UP PLAY");
        doPlay();
      }
    }
    document.removeEventListener("mousemove", doSeek);
    document.removeEventListener("mouseup", onSeekMouseUp);
  };

  const onSeekMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();

    seekWasPlaying.current = !ref.current!.paused;
    if (seekWasPlaying.current) {
      ref.current!.pause();
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

  const doOnKeyDown = (e: KeyboardEvent) => {
    if (isThumbnail) return;

    console.log("KEY DOWN", e.key);

    if (e.key == "Escape") {
      if (isFullscreen) {
        document.exitFullscreen();
      } else {
        containerRef.current?.blur();
      }
      e.preventDefault();
    }
    if (e.key == " ") {
      console.log("TOGGLE PLAY");
      doToggle();
      e.preventDefault();
    }
    var deltaTime = 0;
    if (e.key == "ArrowLeft") {
      deltaTime = e.shiftKey ? -1 : -5;
      e.preventDefault();
    }
    if (e.key == "ArrowRight") {
      deltaTime = e.shiftKey ? 1 : 5;
      e.preventDefault();
    }

    if (deltaTime != 0) {
      const newTime = Math.max(0, ref.current.currentTime + deltaTime);
      setTime(newTime);
      ref.current.currentTime = newTime;
    }

    if (e.defaultPrevented) {
      setIsShowingControls(true);
      doHideControls(false);
    }
  };

  useEffect(() => {
    if (!ref.current) return;
    const video = ref.current;
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
        if (!ref.current) return;
        if (isSeeking) return;
        if (time != ref.current.currentTime) {
          setTime(ref.current.currentTime);
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
    if (!isFullscreen) return;
    function onKeydown(e: KeyboardEvent) {
      doOnKeyDown(e);
    }
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
            doToggle();
            setIsPlaying(!ref.current?.paused);
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
                ref.current!.volume = globalVolume;
                setVolume(globalVolume);
              } else {
                ref.current!.volume = 0;
                setVolume(0);
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
      tabIndex={-1}
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
      onKeyDown={(e) => {
        doOnKeyDown(e.nativeEvent);
      }}
    >
      {!isLoaded && !isFullscreen && !isErrored && <img src={preload} />}
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
            ref={ref}
            src={src}
            preload="metadata"
            style={{
              opacity: isShowing ? 1 : 0,
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
              setDuration(ref.current?.duration ?? 0);
            }}
            onTimeUpdate={doBuffers}
            onVolumeChange={() => {
              //setVolume(ref.current!.volume);
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

                    ref.current!.volume = globalVolume;
                    setIsShowing(true);
                    doPlay();
                    return;
                  }

                  doToggle();
                }}
              >
                {!isShowing && <PiPlayFill className="video-cover-icon play" />}
                {/*<a
                  download
                  href={src}
                  rel="noreferrer noopener"
                  target="_blank"
                  className="video-download-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                ><IoMdDownload/></a>*/}
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
  debug,
}: {
  src: string;
  preload: string;
  onClick: () => void;
  debug?: boolean;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loadedSrc, setLoadedSrc] = useState<string>("");
  const [isErrored, setIsErrored] = useState(false);

  useEffect(() => {
    setLoadedSrc("");
  }, [src]);

  var loaded = loadedSrc == src;
  return (
    <div
      className="media-wrapper"
      onClick={() => {
        onClick();
      }}
    >
      {!loaded && <PreloadDisplay src={preload} />}
      {
        <img
          ref={imgRef}
          src={src}
          onLoad={() => {
            imgRef.current.style.display = "block";
            setLoadedSrc(src);
          }}
          onError={() => {
            setIsErrored(true);
          }}
          style={{
            display: loaded && !isErrored ? "block" : "none",
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

export function AnimatedImageDisplay({
  src,
  preview,
  preload,
  onClick,
  debug,
}: {
  src: string;
  preview: string;
  preload: string;
  onClick: () => void;
  debug?: boolean;
}) {
  const previewRef = useRef<HTMLImageElement>(null);
  const animatedRef = useRef<HTMLImageElement>(null);
  const [previewLoadedSrc, setPreviewLoadedSrc] = useState("");
  const [animatedLoadedSrc, setAnimatedLoadedSrc] = useState("");

  const [isErrored, setIsErrored] = useState(false);

  var previewLoaded = previewLoadedSrc == src;
  var animatedLoaded = animatedLoadedSrc == src;
  return (
    <div
      className="media-wrapper"
      onClick={() => {
        onClick();
      }}
    >
      {!previewLoaded && <PreloadDisplay src={preload} />}
      {!animatedLoaded && (
        <img
          ref={previewRef}
          src={preview}
          onLoad={() => {
            previewRef.current.style.display = "block";
            setPreviewLoadedSrc(src);
          }}
          onError={() => {
            setIsErrored(true);
          }}
          style={{
            display: previewLoaded ? "block" : "none",
          }}
        />
      )}
      {
        <img
          ref={animatedRef}
          src={src}
          onLoad={() => {
            animatedRef.current.style.display = "block";
            setAnimatedLoadedSrc(src);
          }}
          onError={() => {
            setIsErrored(true);
          }}
          style={{
            display: (animatedLoaded && !isErrored) ? "block" : "none",
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
