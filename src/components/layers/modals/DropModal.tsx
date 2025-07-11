import { useEffect, useRef, useState } from "react";

import { FaFileUpload } from "react-icons/fa";

import { Modal, ModalHandle } from "../../Common";
import { useClackState, getClackState, ClackEvents } from "../../../state";
import { FilesToChatAttachments } from "../../../state/chat";

export default function DragDropModal() {
  const modalRef = useRef<ModalHandle>(null);
  const boundaryCounter = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const setAttachments = getClackState((state) => state.chat.setAttachments);

  const currentChannel = useClackState(ClackEvents.current, (state) =>
    state.chat.channels.get(state.chat.currentChannel)
  );

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      const isValid = e.dataTransfer.types.includes("Files");
      boundaryCounter.current += 1;
      if (!isValid) return;
      e.preventDefault();
      if (boundaryCounter.current === 1) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      const isValid = e.dataTransfer.types.includes("Files");
      boundaryCounter.current -= 1;
      if (!isValid) return;
      e.preventDefault();
      if (boundaryCounter.current == 0) {
        modalRef.current?.close();
      }
    };

    const handleDragOver = (e: DragEvent) => {
      const isValid = e.dataTransfer.types.includes("Files");
      if (!isValid) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const attachments = FilesToChatAttachments([...e.dataTransfer.files]);
      setAttachments(attachments, [], []);
      boundaryCounter.current = 0;
      modalRef.current?.close();
    };

    document.body.addEventListener("dragenter", handleDragEnter);
    document.body.addEventListener("dragleave", handleDragLeave);
    document.body.addEventListener("dragover", handleDragOver);
    document.body.addEventListener("drop", handleDrop);

    return () => {
      document.body.removeEventListener("dragenter", handleDragEnter);
      document.body.removeEventListener("dragleave", handleDragLeave);
      document.body.removeEventListener("dragover", handleDragOver);
      document.body.removeEventListener("drop", handleDrop);
    };
  }, [setIsDragging]);

  if (!isDragging) {
    return <></>;
  }

  return (
    <Modal
      ref={modalRef}
      onClosing={() => {}}
      onClosed={() => {
        setIsDragging(false);
      }}
      closingTime={250}
    >
      <div className="drop-modal modal-container">
        <div className="drop-modal-content">
          <FaFileUpload className="drop-modal-icon" />
          <span>
            <span className="drop-modal-text">{"Upload to "}</span>
            <span className="drop-modal-channel">
              #{currentChannel?.name || "Unknown Channel"}
            </span>
          </span>
        </div>
      </div>
    </Modal>
  );
}
