import { useEffect, useRef, useState, useMemo } from "react";

import { useChatState, useChatStateShallow } from "../state";

import { IoMdEye, IoMdEyeOff, IoMdCreate } from "react-icons/io";
import { BiSolidTrash } from "react-icons/bi";

import { IconButton } from "./Common";
import { GatewayPendingAttachment } from "../gateway";
import { FileType } from "../models";
import { set } from "date-fns";

export function UploadTile({ file }: { file: GatewayPendingAttachment }) {
  const [spoilered, setSpoilered] = useState(file.spoilered);
  const [filename, setFilename] = useState(file.filename);

  const setAttachmentModal = useChatState((state) => state.setAttachmentModal);
  const setAttachments = useChatState((state) => state.setAttachments);

  useEffect(() => {
    setFilename(file.filename);
    setSpoilered(file.spoilered);
  }, [file]);

  const thumbnail = useMemo(() => {
    if (file.type === FileType.Image) {
      return (
        <img src={file.blobURL} alt={filename} className="upload-thumbnail" />
      );
    } else if (file.type === FileType.Video) {
      return (
        <video preload="None" src={file.blobURL} className="upload-thumbnail" />
      );
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
            iconClasses="red"
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

export function Attachments() {
  const rowRef = useRef<HTMLDivElement>(null);

  const currentFilesCount = useChatState(
    (state) => state.gateway.currentFiles.length
  );
  const currentFiles = useChatState((state) => state.gateway.currentFiles);

  return (
    <div id="upload-container">
      <div ref={rowRef} className="upload-row input-scrollbar">
        {currentFiles.map((file, index) => {
          return <UploadTile key={file.id} file={file} />;
        })}
      </div>
    </div>
  );
}
