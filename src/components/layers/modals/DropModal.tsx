import { useEffect, useRef, useState } from "react";

import { FaFileUpload } from "react-icons/fa";

import { Modal, ModalHandle } from "../../Common";
import { useClackState, getClackState, ClackEvents } from "../../../state";
import { FilesToChatAttachments } from "../../../state/chat";

export default function DropModal() {
  const modalRef = useRef<ModalHandle>(null);
  const [isDragging, setIsDragging] = useState(false);

  const setAttachments = getClackState((state) => state.chat.setAttachments);

  const currentChannel = useClackState(ClackEvents.current, (state) =>
    state.chat.channels.get(state.chat.currentChannel)
  );

  useEffect(() => {
    const isValid = (e: DragEvent) => {
      return e.dataTransfer.types.includes("Files");
    };

    const handleDragOver = (e: DragEvent) => {
      if (!isValid(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (!isDragging) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!isValid(e)) return;
      if (
        e.clientX <= 0 ||
        e.clientY <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight
      ) {
        modalRef.current?.close();
      }
    };

    const handleDrop = (e: DragEvent) => {
      if (!isValid(e)) return;
      e.preventDefault();
      const attachments = FilesToChatAttachments([...e.dataTransfer.files]);
      setAttachments(attachments, [], []);

      modalRef.current?.close();
    };

    document.body.addEventListener("dragover", handleDragOver);
    document.body.addEventListener("dragleave", handleDragLeave);
    document.body.addEventListener("drop", handleDrop);

    return () => {
      document.body.removeEventListener("dragover", handleDragOver);
      document.body.removeEventListener("dragleave", handleDragLeave);
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
