import { useEffect, useRef, useMemo, useState } from "react";

import { useClackState, getClackState, ClackEvents } from "../../../state";

import { Modal, ModalHandle } from "../../Common";

import { ErrorCodeMessages, EventTypeDescriptions } from "../../../types";
import { GeneralModalContent } from "./GeneralModal";

export default function ErrorModal() {
  const modalRef = useRef<ModalHandle>(null);

  const errorModal = useClackState(
    ClackEvents.errorModal,
    (state) => state.gui.errorModal
  );
  const setErrorModal = getClackState((state) => state.gui.setErrorModal);

  if (errorModal == undefined) {
    return <></>;
  }

  var title: string;
  var message: string;

  if (typeof errorModal.error === "string") {
    title = "Error";
    message = errorModal.error;
  } else {
    title = `Error ${errorModal.error.code}(${errorModal.error.request})`;
    message =
      ErrorCodeMessages[errorModal.error.code] || "An unknown error occurred.";
  }

  return (
    <Modal
      ref={modalRef}
      onClosing={() => {}}
      onClosed={() => {
        setErrorModal(undefined);
      }}
      closingTime={250}
    >
      <GeneralModalContent
        modalRef={modalRef}
        onClose={() => {
          modalRef.current?.close();
        }}
        className="error-modal"
        title={title}
        description={message}
        closeLabel="Ok"
      />
    </Modal>
  );
}
