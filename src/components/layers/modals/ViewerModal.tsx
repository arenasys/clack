import {
  useEffect,
  useRef,
  useMemo,
  useState,
  memo,
  useLayoutEffect,
} from "react";

import { Viewable, AttachmentType } from "../../../types";

import { PiArrowLeftBold, PiArrowRightBold } from "react-icons/pi";

import { useClackState, getClackState, ClackEvents } from "../../../state";
import { VideoDisplay, ImageDisplay, AnimatedImageDisplay } from "../../Media";
import { Modal, ModalHandle, fadeAllMedia, fadeMedia } from "../../Common";

const mod = (n: number, m: number) => ((n % m) + m) % m;

export default function ViewerModal() {
  const modalRef = useRef<ModalHandle>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const viewerModal = useClackState(
    ClackEvents.viewerModal,
    (state) => state.gui.viewerModal
  );
  const setViewerModal = getClackState((state) => state.gui.setViewerModal);

  const [isClosing, setIsClosing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  function getVideoRef() {
    if (viewerModal == undefined) return undefined;
    const container = document.getElementById(
      `viewer-track-item-${viewerModal.index}`
    );
    const video = container?.querySelector("video") ?? undefined;
    return video as HTMLVideoElement | undefined;
  }

  function pauseVideo() {
    const videoRef = getVideoRef();
    if (videoRef && !videoRef.paused) {
      fadeMedia(videoRef);
    }
  }

  function doLeft() {
    if (viewerModal == undefined) return;
    if (viewerModal.items.length <= 1) return;
    pauseVideo();
    setViewerModal({
      items: viewerModal.items,
      index: mod(viewerModal.index - 1, viewerModal.items.length),
    });
  }

  function doRight() {
    if (viewerModal == undefined) return;
    if (viewerModal.items.length <= 1) return;
    pauseVideo();
    setViewerModal({
      items: viewerModal.items,
      index: mod(viewerModal.index + 1, viewerModal.items.length),
    });
  }

  function onKeydown(e: KeyboardEvent) {
    if (isClosing) return;

    if (e.key == "Escape") {
      modalRef.current?.close();
      e.preventDefault();
    }

    if (viewerModal == undefined) return;

    if (e.key == "ArrowLeft") {
      doLeft();
      e.stopPropagation();
      e.preventDefault();
    }
    if (e.key == "ArrowRight") {
      doRight();
      e.stopPropagation();
      e.preventDefault();
    }
  }

  useEffect(() => {
    setIsClosing(false);
    setIsLoaded(false);

    window.removeEventListener("keydown", onKeydown, { capture: true });

    if (viewerModal != undefined) {
      window.addEventListener("keydown", onKeydown, { capture: true });
    }
    return () => {
      window.removeEventListener("keydown", onKeydown, { capture: true });
    };
  }, [viewerModal]);

  useEffect(() => {
    if (viewerModal == undefined) return;
    fadeAllMedia();
  }, [viewerModal === undefined]);

  useEffect(() => {
    if (viewerModal == undefined || isClosing) return;
    const selectedViewable = trackRef.current?.querySelector<HTMLDivElement>(
      `#viewer-track-item-${viewerModal.index}`
    );
    if (!selectedViewable) return;
    const ref =
      selectedViewable.querySelector<HTMLDivElement>(".viewer-attachment");
    if (!ref) return;
    ref.focus();
  }, [viewerModal]);

  if (viewerModal == undefined) {
    return <></>;
  }

  function onClosing() {
    setIsClosing(true);
    fadeAllMedia();
  }

  function onClosed() {
    setViewerModal(undefined);
  }

  const isMulti = viewerModal.items.length > 1;

  return (
    <Modal
      ref={modalRef}
      onClosing={onClosing}
      onClosed={onClosed}
      closingTime={250}
    >
      <div className="viewer-controls">
        {isMulti && (
          <div
            className="viewer-button viewer-left-button"
            onClick={(e) => {
              doLeft();
              e.stopPropagation();
            }}
          >
            <PiArrowLeftBold className="viewer-button-icon" />
          </div>
        )}
        {isMulti && (
          <div
            className="viewer-button viewer-right-button"
            onClick={(e) => {
              doRight();
              e.stopPropagation();
            }}
          >
            <PiArrowRightBold className="viewer-button-icon" />
          </div>
        )}
      </div>

      <div
        ref={trackRef}
        className="viewer-track"
        style={{
          left: `-${viewerModal.index * 100}vw`,
          transformOrigin: `${(viewerModal.index + 0.5) * 100}vw center`,
        }}
      >
        {viewerModal.items.map((item, index) => (
          <div
            id={`viewer-track-item-${index}`}
            className={`viewer-track-item ${
              viewerModal.index == index ? " visible" : ""
            }`}
            key={item.id}
          >
            <ViewerMedia item={item} />
          </div>
        ))}
      </div>
    </Modal>
  );
}

export const ViewerMedia = memo(
  function ViewerMedia({ item }: { item: Viewable }) {
    const ref = useRef<HTMLDivElement>(null);
    if (item == undefined) {
      return null;
    }

    const loaded = useRef<boolean>(false);

    useEffect(() => {
      loaded.current = true;
    }, [item]);

    var maxWidth = 963;
    var maxHeight = 703;

    var attachWidth = item!.width;
    var attachHeight = item!.height;

    var displayWidth: number = 0;
    var displayHeight: number = 0;

    if (maxWidth / maxHeight > attachWidth / attachHeight) {
      displayHeight = Math.min(attachHeight, maxHeight);
      displayWidth = (attachWidth / attachHeight) * displayHeight;
    } else {
      displayWidth = Math.min(attachWidth, maxWidth);
      displayHeight = (attachHeight / attachWidth) * displayWidth;
    }

    var inner: JSX.Element | null = null;
    if (item!.type == AttachmentType.Image) {
      if (item!.mimetype == "image/gif") {
        inner = (
          <AnimatedImageDisplay
            src={item!.originalURL!}
            preview={item!.previewURL!}
            preload={item!.preload}
            onClick={() => {}}
            debug={true}
          />
        );
      } else {
        inner = (
          <ImageDisplay
            src={item!.displayURL!}
            preload={item!.preload}
            onClick={() => {}}
            debug={true}
          />
        );
      }
    }

    if (item!.type == AttachmentType.Video) {
      inner = (
        <VideoDisplay
          src={item!.originalURL!}
          poster={item!.displayURL!}
          preload={item!.preload}
          showTimestamps={true}
          showCover={false}
          onClick={() => {
            return true;
          }}
        />
      );
    }

    return (
      <div
        ref={ref}
        className={"viewer-attachment"}
        onClick={(e) => {
          e.stopPropagation();
        }}
        style={{
          width: displayWidth,
          height: displayHeight,
        }}
        tabIndex={-1}
        onFocus={(e) => {
          const video =
            ref.current?.querySelector<HTMLDivElement>(".video-container");
          if (video) video.focus();
        }}
      >
        <div className="viewer-options-container">
          <a
            className="link"
            href={item.originalURL}
            rel="noreferrer noopener"
            target="_blank"
          >
            Open in Browser
          </a>
        </div>
        <div className="viewer-media-container">{inner}</div>
      </div>
    );
  },
  (prev, next) => prev.item.id === next.item.id
);
