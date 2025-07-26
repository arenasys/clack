import { useEffect, useRef, useMemo, useState } from "react";
import { BiSolidTrash, BiSolidImageAdd } from "react-icons/bi";

import { useClackState, getClackState, ClackEvents } from "../../../state";

import { IconButton, Modal, ModalHandle, SliderInput } from "../../Common";
import { GeneralModalContent } from "./GeneralModal";
import { ChooseFiles } from "../../../util";
import { set } from "date-fns";
import { vi } from "date-fns/locale";

type Point = {
  x: number;
  y: number;
};

type Size = {
  width: number;
  height: number;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = (e) => reject(new Error());
    img.src = URL.createObjectURL(file);
  });
}

export default function AvatarModal() {
  const modalRef = useRef<ModalHandle>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const dragStart = useRef<Point>(undefined);
  const dragEnd = useRef<Point>(undefined);
  const dragAnchor = useRef<Point>(undefined);
  const dragTimeout = useRef<number>(undefined);
  const dragPending = useRef<Point>(undefined);

  const [file, setFile] = useState<File>(undefined);
  const imageURL = useRef<string>(undefined);

  const avatarModal = useClackState(
    ClackEvents.avatarModal,
    (state) => state.gui.avatarModal
  );
  const setAvatarModal = getClackState((state) => state.gui.setAvatarModal);
  const setErrorModal = getClackState((state) => state.gui.setErrorModal);

  const [scale, setScale] = useState(1);
  const maxScale = useRef<number>(2);

  const [_, setKey] = useState(0);

  function forceRender() {
    setKey((prevKey) => prevKey + 1);
  }

  function selectFile(file: File) {
    getImageDimensions(file)
      .then((dim) => {
        if (dim.width < avatarModal.size || dim.height < avatarModal.size) {
          setErrorModal({
            error: `Please select an image larger than ${avatarModal.size}x${avatarModal.size} pixels. `,
          });
          return;
        }
        setViewer({ width: dim.width, height: dim.height }, file);
      })
      .catch(() => {
        setViewer({ width: 0, height: 0 }, file);
      });
  }

  const avatarAnchor = useRef<Point>(undefined);
  const avatarSize = useRef<Size>(undefined);

  const viewScale = useRef<number>(undefined);
  const viewPosition = useRef<Rect>(undefined);
  const overlaySize = useRef<number>(undefined);

  function updateViewPosition() {
    if (viewRef.current) {
      const rect = viewRef.current.getBoundingClientRect();
      viewPosition.current = {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      };
    }
  }

  function updateDragPosition() {
    if (dragStart.current && dragEnd.current) {
      dragAnchor.current = boundAnchor({
        x:
          avatarAnchor.current.x -
          (dragEnd.current.x - dragStart.current.x) / scale,
        y:
          avatarAnchor.current.y -
          (dragEnd.current.y - dragStart.current.y) / scale,
      });
    } else {
      dragAnchor.current = undefined;
    }
  }

  function boundAnchor(anchor: Point) {
    if (anchor == undefined || avatarSize.current == undefined) {
      return { x: 0, y: 0 };
    }
    const bounds = overlaySize.current / scale / 2;
    anchor.x = Math.max(
      bounds,
      Math.min(avatarSize.current.width - bounds, anchor.x)
    );
    anchor.y = Math.max(
      bounds,
      Math.min(avatarSize.current.height - bounds, anchor.y)
    );
    return anchor;
  }

  function setViewer(size: Size, file: File) {
    if (viewRef.current == null || size.width == 0 || size.height == 0) {
      setFile(undefined);
    }

    updateViewPosition();

    const overlayMargin = 48; // See avatar-modal-view-overlay
    overlaySize.current = Math.min(
      viewPosition.current.width - overlayMargin,
      viewPosition.current.height - overlayMargin
    );
    viewScale.current = Math.max(
      overlaySize.current / size.width,
      overlaySize.current / size.height
    );
    maxScale.current = Math.min(
      size.width / avatarModal.size,
      size.height / avatarModal.size
    );
    avatarSize.current = {
      width: size.width * viewScale.current,
      height: size.height * viewScale.current,
    };
    avatarAnchor.current = boundAnchor({
      x: avatarSize.current.width / 2,
      y: 0,
    });

    if (imageURL.current) {
      URL.revokeObjectURL(imageURL.current);
    }
    imageURL.current = URL.createObjectURL(file);

    setScale(1);
    setFile(file);
  }

  function toRelative(clientPos: Point) {
    updateViewPosition();

    if (viewPosition.current == undefined) {
      return { x: 0, y: 0 };
    }
    return {
      x: clientPos.x - viewPosition.current.x,
      y: clientPos.y - viewPosition.current.y,
    };
  }

  function setDrag(end: Point) {
    dragEnd.current = end;
    updateDragPosition();

    forceRender();
  }

  function startDrag(start: Point) {
    dragStart.current = start;
    dragEnd.current = start;

    updateDragPosition();
    forceRender();
  }

  function endDrag() {
    if (dragAnchor.current) {
      avatarAnchor.current = dragAnchor.current;
      dragStart.current = undefined;
      dragEnd.current = undefined;
      dragAnchor.current = undefined;
      updateDragPosition();
    }
  }

  function getAvatarSource(): Rect {
    const anchor = boundAnchor(dragAnchor.current || avatarAnchor.current);

    const viewSrc = {
      x: anchor.x - overlaySize.current / (2 * scale),
      y: anchor.y - overlaySize.current / (2 * scale),
      width: overlaySize.current / scale,
      height: overlaySize.current / scale,
    };
    const imgSrc = {
      x: viewSrc.x / viewScale.current,
      y: viewSrc.y / viewScale.current,
      width: viewSrc.width / viewScale.current,
      height: viewSrc.height / viewScale.current,
    };

    // Pixel-perfect when it matters
    if (
      Math.round(imgSrc.width) == avatarModal.size &&
      Math.round(imgSrc.height) == avatarModal.size
    ) {
      return {
        x: Math.round(imgSrc.x),
        y: Math.round(imgSrc.y),
        width: avatarModal.size,
        height: avatarModal.size,
      };
    }

    return imgSrc;
  }

  function getAvatarImage() {
    const canvas = new OffscreenCanvas(avatarModal.size, avatarModal.size);
    const ctx = canvas.getContext("2d");

    const src = getAvatarSource();

    ctx.drawImage(
      imgRef.current,
      src.x,
      src.y,
      src.width,
      src.height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.convertToBlob();
  }

  function reset() {
    setFile(undefined);
    setScale(1);
    if (imageURL.current) {
      URL.revokeObjectURL(imageURL.current);
      imageURL.current = undefined;
    }
  }

  useEffect(() => {
    if (file) {
      updateDragPosition();
    }

    const onMouseMove = (e: MouseEvent) => {
      if (dragStart.current && viewRef.current) {
        dragPending.current = toRelative({ x: e.clientX, y: e.clientY });
        if (!dragTimeout.current) {
          dragTimeout.current = window.setTimeout(() => {
            if (dragPending.current) {
              setDrag(dragPending.current);
              dragPending.current = undefined;
            }
            dragTimeout.current = undefined;
          }, 10);
        }
      }
    };
    const onMouseUp = () => {
      if (dragStart.current) {
        endDrag();
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [scale]);

  useEffect(() => {
    reset();
  }, [avatarModal]);

  if (avatarModal == undefined) {
    return <></>;
  }

  const anchor = boundAnchor(dragAnchor.current || avatarAnchor.current);

  const avatarPosition = viewPosition.current
    ? {
        x: viewPosition.current.width / 2 - anchor.x,
        y: viewPosition.current.height / 2 - anchor.y,
      }
    : { x: 0, y: 0 };

  if (file != undefined) {
    console.log("AVATAR SRC", getAvatarSource());
  }

  return (
    <Modal
      ref={modalRef}
      onClosing={() => {}}
      onClosed={() => {
        setAvatarModal(undefined);
      }}
      closingTime={250}
    >
      <GeneralModalContent
        modalRef={modalRef}
        onClose={() => {
          modalRef.current?.close();
        }}
        onAccept={() => {
          if (avatarModal.onAccept) {
            getAvatarImage().then((blob) => {
              avatarModal.onAccept(blob);
            });
          }
          modalRef.current?.close();
        }}
        title="Select Avatar"
      >
        <div className="avatar-modal-content">
          <div
            className="avatar-modal-view"
            ref={viewRef}
            onMouseDown={(e) => {
              if (file) {
                startDrag(toRelative({ x: e.clientX, y: e.clientY }));
              }
            }}
            onWheel={(e) => {
              if (file) {
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                setScale((prevScale) => {
                  return Math.max(
                    1,
                    Math.min(maxScale.current, prevScale + delta)
                  );
                });
              }
            }}
          >
            {file == undefined && (
              <div
                className="avatar-modal-empty"
                onClick={() => {
                  ChooseFiles(false, ".jpg, .jpeg, .png").then((files) => {
                    if (files.length > 0) {
                      selectFile(files[0]);
                    }
                  });
                }}
              >
                <BiSolidImageAdd />
                <div>Upload Image</div>
              </div>
            )}
            {file && (
              <>
                <div className="avatar-modal-view-overlay" />
                <img
                  ref={imgRef}
                  src={imageURL.current}
                  style={{
                    position: "absolute",
                    transformOrigin: `${anchor.x}px ${anchor.y}px`,
                    left: `${avatarPosition.x}px`,
                    top: `${avatarPosition.y}px`,
                    width: `${avatarSize.current.width}px`,
                    height: `${avatarSize.current.height}px`,
                    transform: `scale(${scale})`,
                  }}
                />
              </>
            )}
          </div>
          <div className="avatar-modal-controls">
            <button
              className="button link mini"
              onClick={() => {
                reset();
              }}
            >
              Reset
            </button>
            <SliderInput
              value={scale}
              min={1}
              max={maxScale.current}
              step={0.01}
              onChange={(value) => {
                if (file) {
                  setScale(value);
                }
              }}
            />
          </div>
        </div>
      </GeneralModalContent>
    </Modal>
  );
}
