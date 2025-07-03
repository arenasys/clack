import { useEffect, useRef, useMemo, useState } from "react";
import { Viewable, AttachmentType } from "../../../types";

import { PiArrowLeftBold, PiArrowRightBold } from "react-icons/pi";

import { useClackState, getClackState, ClackEvents } from "../../../state";
import { VideoDisplay, ImageDisplay } from "../../Media";
import { Modal, ModalHandle } from "../../Common";

const mod = (n: number, m: number) => ((n % m) + m) % m;

export default function ViewerModal() {
  const modalRef = useRef<ModalHandle>(null);
  const viewerModal = useClackState(
    ClackEvents.viewerModal,
    (state) => state.gui.viewerModal
  );
  const setViewerModal = getClackState((state) => state.gui.setViewerModal);

  const [isClosing, setIsClosing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const item = viewerModal?.items[viewerModal!.index];

  function doLeft() {
    if (viewerModal == undefined) return;
    if (viewerModal.items.length <= 1) return;
    setViewerModal({
      items: viewerModal.items,
      index: mod(viewerModal.index - 1, viewerModal.items.length),
    });
  }

  function doRight() {
    if (viewerModal == undefined) return;
    if (viewerModal.items.length <= 1) return;
    setViewerModal({
      items: viewerModal.items,
      index: mod(viewerModal.index + 1, viewerModal.items.length),
    });
  }

  function onKeydown(e: KeyboardEvent) {
    if (isClosing) return;

    if (e.key == "Escape") {
      modalRef.current?.close();
    }

    if (viewerModal == undefined) return;

    if (e.key == "ArrowLeft") {
      doLeft();
    }
    if (e.key == "ArrowRight") {
      doRight();
    }

    if (e.key == " ") {
      if (videoRef.current == null) return;
      const ourVideo = videoRef.current!;

      if (ourVideo.paused) {
        ourVideo.play();
      } else {
        ourVideo.pause();
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
    }
  }

  useEffect(() => {
    setIsClosing(false);
    setIsLoaded(false);

    /*for (const item of viewerModal?.items ?? []) {
      if (item.type == AttachmentType.Video) {
        const video = document.createElement("video");
        video.src = item.originalURL!;
        video.preload = "metadata";
        video.load();
        console.log("Preloading video", item.originalURL);
      }
      if (item.type == AttachmentType.Image) {
        const img = new Image();
        img.src = item.displayURL!;
        console.log("Preloading image", item.displayURL);
      }
    }*/

    window.removeEventListener("keydown", onKeydown);

    if (viewerModal != undefined) {
      window.addEventListener("keydown", onKeydown);
    }
    return () => {
      window.removeEventListener("keydown", onKeydown);
    };
  }, [viewerModal]);

  var media = useMemo(() => {
    if (item == undefined) {
      return null;
    }

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
      inner = (
        <ImageDisplay
          src={item!.displayURL!}
          preload={item!.preload}
          onClick={() => {}}
        />
      );
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
          videoRef={videoRef}
        />
      );
    }

    var outer = (
      <div
        className={"viewer-attachment"}
        onClick={(e) => {
          e.stopPropagation();
        }}
        style={{
          width: displayWidth,
          height: displayHeight,
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

    return {
      inner: inner,
      outer: outer,
      width: displayWidth,
      height: displayHeight,
      multi: (viewerModal?.items.length ?? 0) > 1,
    };
  }, [item]);

  if (viewerModal == undefined || item == undefined || media == null) {
    return <></>;
  }

  function onClosing() {
    setIsClosing(true);

    if (videoRef.current) {
      const video = videoRef.current;
      let step = video.volume / 10;

      let fade = setInterval(() => {
        if (video.volume > step) {
          video.volume = Math.max(video.volume - step, 0);
        } else {
          video.volume = 0;
          clearInterval(fade);
        }
      }, 25);
    }
  }

  function onClosed() {
    setViewerModal(undefined);
  }

  return (
    <Modal
      ref={modalRef}
      onClosing={onClosing}
      onClosed={onClosed}
      closingTime={250}
    >
      <div className="viewer-controls">
        {media.multi && (
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
        {media.multi && (
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

      {media.outer}
    </Modal>
  );
}
