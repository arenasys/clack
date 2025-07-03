import { useEffect, useRef, useMemo, useState } from "react";

import { useClackState, getClackState, ClackEvents } from "../../../state";

import { Message } from "../../Message";

import { ClickWrapper, Modal, ModalHandle } from "../../Common";

export default function DeleteMessageModal() {
  const modalRef = useRef<ModalHandle>(null);

  const deleteModal = useClackState(
    ClackEvents.deleteMessageModal,
    (state) => state.gui.messageDeleteModal
  );
  const setDeleteModal = getClackState(
    (state) => state.gui.setMessageDeleteModal
  );
  const deleteMessage = getClackState((state) => state.chat.deleteMessage);

  const messageContent = useMemo(() => {
    if (deleteModal == undefined) return <></>;
    return (
      <div className="message-display thin-scrollbar">
        <Message id={deleteModal.message} standalone={true} />
      </div>
    );
  }, [deleteModal]);

  if (deleteModal == undefined) {
    return <></>;
  }

  return (
    <Modal
      ref={modalRef}
      onClosing={() => {}}
      onClosed={() => {
        setDeleteModal(undefined);
      }}
      closingTime={250}
    >
      <div
        className="message-delete-modal modal-container"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="modal-content">
          <div className="title ">Delete Message</div>
          {"Are you sure you want to delete this message?"}
          {messageContent}
        </div>
        <div className="modal-footer">
          <button
            className="button link"
            onClick={() => {
              modalRef.current?.close();
            }}
          >
            Cancel
          </button>

          <button
            className="button"
            onClick={() => {
              deleteMessage(deleteModal.message);
              modalRef.current?.close();
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}
