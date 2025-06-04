import {
  useEffect,
  useRef,
  useState,
  useMemo,
  ReactNode,
  forwardRef,
  useImperativeHandle,
} from "react";

import { useChatState, useChatStateShallow } from "../state";
import { GetTooltipPosition } from "../util";
import { wrap } from "underscore";

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
  const setTooltipPopup = useChatState((state) => state.setTooltipPopup);
  const clearTooltipPopup = useChatState((state) => state.clearTooltipPopup);

  const tooltipIndexRef = useRef<number | null>(null);

  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered && tooltip) {
      var rect = ref.current!.getBoundingClientRect();

      const index = setTooltipPopup({
        content: tooltip,
        direction: tooltipDirection,
        position: GetTooltipPosition(rect, tooltipDirection),
      });
      //console.log("SETTING TOOLTIP", tooltip, index);
      tooltipIndexRef.current = index;
    } else {
      if (tooltipIndexRef.current != null) {
        clearTooltipPopup(tooltipIndexRef.current);
      }
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
  tooltipDirection = "top",
  tooltipDelay = 0,
  className = "",
}: {
  children?: any;
  tooltip: string;
  tooltipDelay?: number;
  tooltipDirection?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const setTooltipPopup = useChatState((state) => state.setTooltipPopup);
  const clearTooltipPopup = useChatState((state) => state.clearTooltipPopup);

  const tooltipIndexRef = useRef<number | null>(null);

  const tooltipTimeout = useRef<number | null>(null);

  const [isHovered, setIsHovered] = useState(false);

  function setTooltip() {
    var rect = ref.current!.getBoundingClientRect();

    const index = setTooltipPopup({
      content: tooltip,
      direction: tooltipDirection,
      position: GetTooltipPosition(rect, tooltipDirection),
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
      tooltipTimeout.current = window.setTimeout(setTooltip, tooltipDelay);
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
  onClick: (e: PointerEvent) => void;
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
        requestAnimationFrame(() => onClick(e));
      }
      pointerDowned.current = false;
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
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
          console.log("CLOSING MODAL");
          doClose();
        }}
      >
        <div
          className={`layer-container layer-popup modal-background ${
            isClosing ? "closing" : ""
          }`}
        >
          {children}
        </div>
      </ClickWrapper>
    );
  }
);
