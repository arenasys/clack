import { useEffect, useRef, useMemo, useState } from "react";

import { useClackState, getClackState, ClackEvents } from "../../../state";

import { Modal, ModalHandle } from "../../Common";

import { ErrorCodeMessages, EventTypeDescriptions } from "../../../types";

export function GeneralModalContent({
  onClose,
  onAccept,
  acceptLabel,
  closeLabel,
  className,
  title,
  description,
  children,
}: {
  modalRef: React.RefObject<ModalHandle>;
  onClose: () => void;
  onAccept?: () => void;
  acceptLabel?: string;
  closeLabel?: string;
  className?: string;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={"modal-container" + (className ? ` ${className}` : "")}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <div className="modal-content">
        <div className="title">{title}</div>
        {description && <span>{description}</span>}
      </div>

      {children}

      <div className="modal-footer">
        {onClose != undefined && (
          <button
            className={"button" + (onAccept ? " link" : "")}
            onClick={() => {
              onClose();
            }}
          >
            {closeLabel ?? "Close"}
          </button>
        )}
        {onAccept != undefined && (
          <button
            className="button"
            onClick={() => {
              onAccept();
            }}
          >
            {acceptLabel ?? "Accept"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function GeneralModal() {
  const modalRef = useRef<ModalHandle>(null);

  const generalModal = useClackState(
    ClackEvents.generalModal,
    (state) => state.gui.generalModal
  );
  const setGeneralModal = getClackState((state) => state.gui.setGeneralModal);

  console.log("GeneralModal", generalModal);

  function DoClose() {
    modalRef.current?.close();
  }

  function DoAccept() {
    if (generalModal.onAccept) {
      const data: Record<string, string> = {};
      generalModal.onAccept(data);
    }
    modalRef.current?.close();
  }

  if (generalModal == undefined) {
    return <></>;
  }

  return (
    <Modal
      ref={modalRef}
      onClosing={() => {
        if (generalModal.onClose) {
          generalModal.onClose();
        }
      }}
      onClosed={() => {
        setGeneralModal(undefined);
      }}
      closingTime={250}
    >
      <GeneralModalContent
        modalRef={modalRef}
        onClose={DoClose}
        onAccept={DoAccept}
        acceptLabel={generalModal.acceptLabel}
        closeLabel={generalModal.closeLabel}
        className={generalModal.className}
        title={generalModal.title}
        description={generalModal.description}
      ></GeneralModalContent>
    </Modal>
  );
}
