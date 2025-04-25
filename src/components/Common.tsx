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
import { getTooltipPosition } from "../util";

export function IconButton({
  children,
  tooltip,
  tooltipDirection = "top",
  iconClasses = "",
  onClick,
}: {
  children: any;
  tooltip: string;
  tooltipDirection?: "top" | "bottom" | "left" | "right";
  iconClasses?: string;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const setTooltipPopup = useChatState((state) => state.setTooltipPopup);
  const clearTooltipPopup = useChatState((state) => state.clearTooltipPopup);

  const tooltipIndexRef = useRef<number | null>(null);

  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) {
      var rect = ref.current!.getBoundingClientRect();

      const index = setTooltipPopup({
        content: tooltip,
        direction: tooltipDirection,
        position: getTooltipPosition(rect, tooltipDirection),
      });
      console.log("SETTING TOOLTIP", tooltip, index);
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
      className={"icon-button " + iconClasses}
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      onClick={onClick}
    >
      {children}
    </button>
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
    const pointerDowned = useRef(false);

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
      <div
        className={`layer-container modal-background${
          isClosing ? " closing" : ""
        }`}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            pointerDowned.current = true;
          }
        }}
        onPointerUp={(e) => {
          if (e.target === e.currentTarget && pointerDowned.current) {
            doClose();
          }
          pointerDowned.current = false;
        }}
        onPointerLeave={() => {
          pointerDowned.current = false;
        }}
        onPointerCancel={() => {
          pointerDowned.current = false;
        }}
      >
        {children}
      </div>
    );
  }
);
