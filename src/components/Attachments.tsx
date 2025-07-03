import { useEffect, useRef, useState, useMemo } from "react";

import { useClackState, getClackState, ClackEvents } from "../state";

import { IoMdEye, IoMdEyeOff, IoMdCreate } from "react-icons/io";
import { BiSolidTrash } from "react-icons/bi";

import { IconButton } from "./Common";
import { ChatPendingAttachment } from "../state/chat";
import { AttachmentType } from "../types";
import { GetFileIcon } from "../util";

export function UploadTile({ file }: { file: ChatPendingAttachment }) {
  const [spoilered, setSpoilered] = useState(file.spoilered);
  const [filename, setFilename] = useState(file.filename);

  const attachmentModal = useClackState(
    ClackEvents.attachmentModal,
    (state) => state.gui.attachmentModal
  );
  const setAttachmentModal = getClackState(
    (state) => state.gui.setAttachmentModal
  );
  const setAttachments = getClackState((state) => state.chat.setAttachments);

  useEffect(() => {
    setFilename(file.filename);
    setSpoilered(file.spoilered);
  }, [file]);

  const thumbnail = useMemo(() => {
    if (file.type === AttachmentType.Image) {
      return (
        <img src={file.blobURL} alt={filename} className="upload-thumbnail" />
      );
    } else if (file.type === AttachmentType.Video) {
      return (
        <video preload="None" src={file.blobURL} className="upload-thumbnail" />
      );
    } else {
      return GetFileIcon(file.filename, file.mimetype);
    }
    return null;
  }, [file]);

  return (
    <div className="upload-tile">
      <div className={"upload-container" + (spoilered ? " spoilered" : "")}>
        <div className="upload-thumbnail-container">
          <div className="upload-thumbnail-wrapper">{thumbnail}</div>{" "}
          {spoilered && (
            <div className="spoiler-overlay">
              <div className="spoiler-text">Spoiler</div>
            </div>
          )}
        </div>

        <div className="upload-name-container">
          <div className="upload-name">{filename}</div>
        </div>
        <div className="upload-actions">
          <IconButton
            tooltip={"Spoiler Attachment"}
            className="upload-actions-button"
            onClick={() => {
              setAttachments(
                [],
                [],
                [
                  {
                    ...file,
                    spoilered: !spoilered,
                  },
                ]
              );
              setSpoilered(!spoilered);
            }}
          >
            {spoilered ? (
              <IoMdEyeOff className="icon" />
            ) : (
              <IoMdEye className="icon" />
            )}
          </IconButton>
          <IconButton
            tooltip={"Modify Attachment"}
            className={`upload-actions-button ${
              attachmentModal?.file?.id === file.id ? "active" : ""
            }`}
            onClick={() => {
              setAttachmentModal({
                file: file,
              });
            }}
          >
            <IoMdCreate className="icon" />
          </IconButton>
          <IconButton
            tooltip={"Delete Attachment"}
            className="upload-actions-button red"
            onClick={() => {
              setAttachments([], [file], []);
            }}
          >
            <BiSolidTrash className="icon" style={{ padding: "1px" }} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

export function Attachments({ className }: { className?: string }) {
  const rowRef = useRef<HTMLDivElement>(null);

  const currentFiles = useClackState(
    ClackEvents.current,
    (state) => state.chat.currentFiles
  );

  return (
    <div id="upload-container" className={className}>
      <div ref={rowRef} className="upload-row input-scrollbar">
        {currentFiles.map((file, _) => {
          return <UploadTile key={file.id} file={file} />;
        })}
      </div>
    </div>
  );
}
