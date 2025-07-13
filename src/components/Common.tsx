import {
  useEffect,
  useRef,
  useState,
  useMemo,
  ReactNode,
  forwardRef,
  useImperativeHandle,
} from "react";

import { useClackState, getClackState, ClackEvents } from "../state";
import { GetTooltipPosition } from "../util";
import { point } from "slate";
import { ErrorBoundary } from "react-error-boundary";
import { FallbackModal } from "./Error";

export function IconButton({
  children,
  tooltip,
  tooltipDirection = "top",
  className = "",
  onClick,
}: {
  children?: any;
  tooltip?: string;
  tooltipDirection?: "top" | "bottom" | "left" | "right";
  className?: string;
  onClick?: (rect: DOMRect) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const setTooltipPopup = getClackState((state) => state.gui.setTooltipPopup);
  const clearTooltipPopup = getClackState(
    (state) => state.gui.clearTooltipPopup
  );
  const updateTooltipPopup = getClackState(
    (state) => state.gui.updateTooltipPopup
  );

  const tooltipIndexRef = useRef<number | null>(null);

  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered && tooltip) {
      var rect = ref.current!.getBoundingClientRect();

      const index = setTooltipPopup({
        content: tooltip,
        direction: tooltipDirection,
        position: GetTooltipPosition(rect, tooltipDirection),
        ref: ref.current,
      });
      tooltipIndexRef.current = index;
    } else {
      if (tooltipIndexRef.current != null) {
        clearTooltipPopup(tooltipIndexRef.current);
      }
    }
  }, [isHovered]);

  useEffect(() => {
    if (tooltipIndexRef.current != null) {
      if (tooltip) {
        updateTooltipPopup(tooltipIndexRef.current, tooltip);
      } else {
        clearTooltipPopup(tooltipIndexRef.current);
      }
    }
  }, [tooltip]);

  useEffect(() => {
    return () => {
      if (tooltipIndexRef.current != null) {
        var index = tooltipIndexRef.current;
        setTimeout(() => {
          clearTooltipPopup(index);
        }, 0);
      }
    };
  }, []);

  return (
    <button
      ref={ref}
      className={"icon-button " + className}
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      onClick={() => {
        var rect = ref.current!.getBoundingClientRect();
        if (onClick) onClick(rect);
      }}
    >
      {children}
    </button>
  );
}

export function TooltipWrapper({
  children,
  tooltip,
  direction = "top",
  delay = 0,
  className = "",
  ...rest
}: {
  children?: any;
  tooltip: string;
  delay?: number;
  direction?: "top" | "bottom" | "left" | "right";
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>) {
  const ref = useRef<HTMLSpanElement>(null);
  const setTooltipPopup = getClackState((state) => state.gui.setTooltipPopup);
  const clearTooltipPopup = getClackState(
    (state) => state.gui.clearTooltipPopup
  );

  const tooltipIndexRef = useRef<number | null>(null);

  const tooltipTimeout = useRef<number | null>(null);

  const [isHovered, setIsHovered] = useState(false);

  function setTooltip() {
    var rect = ref.current!.getBoundingClientRect();

    const index = setTooltipPopup({
      content: tooltip,
      direction: direction,
      position: GetTooltipPosition(rect, direction),
    });
    tooltipIndexRef.current = index;
  }

  function clearTooltip() {
    if (tooltipIndexRef.current != null) {
      clearTooltipPopup(tooltipIndexRef.current);
    }
  }

  useEffect(() => {
    if (tooltipTimeout.current != null) {
      window.clearTimeout(tooltipTimeout.current);
    }
    if (isHovered) {
      tooltipTimeout.current = window.setTimeout(setTooltip, delay);
    } else {
      clearTooltip();
    }
  }, [isHovered, tooltip]);

  useEffect(() => {
    return () => {
      if (tooltipIndexRef.current != null) {
        var index = tooltipIndexRef.current;
        setTimeout(() => {
          clearTooltipPopup(index);
        }, 0);
      }
    };
  }, []);

  return (
    <span
      ref={ref}
      className={"tooltip-wrapper " + className}
      {...rest}
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      {children}
    </span>
  );
}

export function ClickWrapper({
  passthrough = false,
  children,
  onClick,
}: {
  passthrough?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pointerDowned = useRef(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    function isClickOnWrapper(x: number, y: number) {
      if (wrapperRef.current == null) return false;
      const wrapper = wrapperRef.current;
      const el = document.elementFromPoint(x, y);
      if (el == null) return false;
      if (passthrough && !wrapperRef.current.contains(el)) return true;
      if (!passthrough && el === wrapper) return true;
      return false;
    }

    function onPointerDown(e: PointerEvent) {
      pointerDowned.current = isClickOnWrapper(e.clientX, e.clientY);
    }

    function onPointerUp(e: PointerEvent) {
      if (pointerDowned.current && isClickOnWrapper(e.clientX, e.clientY)) {
        requestAnimationFrame(() => onClick());
      }
      pointerDowned.current = false;
    }

    function onContextMenu(e: MouseEvent) {
      if (pointerDowned.current && isClickOnWrapper(e.clientX, e.clientY)) {
        requestAnimationFrame(() => onClick());
      }
      pointerDowned.current = false;
      e.preventDefault();
    }

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("contextmenu", onContextMenu, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("contextmenu", onContextMenu, true);
    };
  }, [onClick]);

  return (
    <div
      ref={wrapperRef}
      className={`click-wrapper ${passthrough ? "passthrough" : ""}`}
    >
      {children}
    </div>
  );
}

interface ModalProps {
  onClosing: () => void;
  onClosed: () => void;
  closingTime?: number;
  children: ReactNode;
}

export interface ModalHandle {
  close: () => void;
}

export const Modal = forwardRef<ModalHandle, ModalProps>(
  ({ onClosing, onClosed, closingTime, children }, ref) => {
    const [isClosing, setIsClosing] = useState(false);
    const closingTimeout = useRef<number | undefined>(undefined);

    function doClose() {
      setIsClosing(true);
      onClosing();

      if (closingTimeout.current != undefined) {
        window.clearTimeout(closingTimeout.current);
      }

      if (closingTime) {
        closingTimeout.current = window.setTimeout(() => {
          onClosed();
        }, closingTime);
      } else {
        onClosed();
      }
    }

    useImperativeHandle(ref, () => ({
      close: () => {
        doClose();
      },
    }));

    return (
      <ClickWrapper
        onClick={() => {
          doClose();
        }}
      >
        <div
          className={`layer-container layer-popup modal-background ${
            isClosing ? "closing" : ""
          }`}
        >
          <ErrorBoundary FallbackComponent={FallbackModal}>
            {children}
          </ErrorBoundary>
        </div>
      </ClickWrapper>
    );
  }
);

export function fadeMedia(media: HTMLMediaElement | null) {
  if (!media || media.paused) return;

  let step = media.volume / 10;

  let fade = setInterval(() => {
    if (media.volume > step) {
      media.volume = Math.max(media.volume - step, 0);
    } else {
      media.volume = 0;
      media.pause();
      clearInterval(fade);
    }
  }, 25);
}

export function fadeAllMedia() {
  const videos = document.querySelectorAll("video");
  const audios = document.querySelectorAll("audio");

  videos.forEach((video) => {
    if (video instanceof HTMLVideoElement) {
      fadeMedia(video);
    }
  });

  audios.forEach((audio) => {
    if (audio instanceof HTMLAudioElement) {
      fadeMedia(audio);
    }
  });
}
