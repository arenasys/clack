import { useEffect, useRef, useMemo, useState } from "react";

import { useChatState } from "../../../state";

import { Modal, ModalHandle } from "../../Common";

import { ErrorCodeMessages, EventTypeDescriptions } from "../../../events";

export default function ErrorModal() {
  const modalRef = useRef<ModalHandle>(null);

  const errorModal = useChatState((state) => state.errorModal);
  const setErrorModal = useChatState((state) => state.setErrorModal);

  if (errorModal == undefined) {
    return <></>;
  }

  const title = `Error ${errorModal.error.code}(${errorModal.error.request})`;

  const errorMessage =
    ErrorCodeMessages[errorModal.error.code] || "An unknown error occurred.";

  return (
    <Modal
      ref={modalRef}
      onClosing={() => {}}
      onClosed={() => {
        setErrorModal(undefined);
      }}
      closingTime={250}
    >
      <div
        className="error-modal modal-container"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="modal-content">
          <div className="title ">{title}</div>
          {errorMessage}
        </div>
        <div className="modal-footer">
          <button
            className="button"
            onClick={() => {
              modalRef.current?.close();
            }}
          >
            Ok
          </button>
        </div>
      </div>
    </Modal>
  );
}
