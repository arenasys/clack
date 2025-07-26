import { useEffect, useRef, useMemo, useState } from "react";

import { useClackState, getClackState, ClackEvents } from "../../../state";

import { AttachmentType } from "../../../types";

import { ClickWrapper, Modal, ModalHandle } from "../../Common";

export default function AttachmentModal() {
  const modalRef = useRef<ModalHandle>(null);

  const attachmentModal = useClackState(
    ClackEvents.attachmentModal,
    (state) => state.gui.attachmentModal
  );
  const setAttachmentModal = getClackState(
    (state) => state.gui.setAttachmentModal
  );
  const setAttachments = getClackState((state) => state.chat.setAttachments);

  const [filename, setFilename] = useState<string>("");
  const [spoilered, setSpoilered] = useState<boolean>(false);

  useEffect(() => {
    if (attachmentModal == undefined) return;

    const file = attachmentModal.file;

    setFilename(file.filename);
    setSpoilered(file.spoilered);
  }, [attachmentModal]);

  const originalName = attachmentModal?.file.file.name || "";

  const thumbnail = useMemo(() => {
    const file = attachmentModal?.file;
    if (file == undefined) return null;
    if (file.type === AttachmentType.Image) {
      return <img src={file.blobURL} className="attachment-modal-thumbnail" />;
    } else if (file.type === AttachmentType.Video) {
      return (
        <video
          preload="None"
          src={file.blobURL}
          className="attachment-modal-thumbnail"
        />
      );
    }
    return null;
  }, [attachmentModal?.file]);

  if (attachmentModal == undefined) {
    return <></>;
  }

  return (
    <Modal
      ref={modalRef}
      onClosing={() => {}}
      onClosed={() => {
        setAttachmentModal(undefined);
      }}
      closingTime={250}
    >
      <div
        className="attachment-modal modal-container"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {thumbnail}

        <div className="modal-content">
          {" "}
          <div className="attachment-modal-title title ">
            {attachmentModal.file.filename}
          </div>
          <div>
            <div className="attachment-modal-label label">Filename</div>
            <input
              type="text"
              className="attachment-modal-input text-input"
              value={filename}
              onChange={(e) => {
                setFilename(e.target.value);
              }}
            />
          </div>
          <div className="attachment-modal-input toggle-input-container">
            <div className="toggle-input-label subtitle">
              Spoiler Attachment
            </div>
            <input
              type="checkbox"
              className="toggle-input"
              checked={spoilered}
              onChange={(e) => {
                setSpoilered(e.target.checked);
              }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="attachment-modal-button button link"
            onClick={() => modalRef.current?.close()}
          >
            Cancel
          </button>

          <button
            className="attachment-modal-button button"
            onClick={() => {
              if (attachmentModal == undefined) return;

              var file = {
                ...attachmentModal.file,
              };
              file.filename = filename;

              file.spoilered = spoilered;
              setAttachments([], [], [file]);

              modalRef.current?.close();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
