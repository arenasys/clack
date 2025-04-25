import { RiAddCircleFill, RiEmotionFill } from "react-icons/ri";

import { useChatState, useChatStateShallow } from "../state";

import { useEffect, useRef, useState, useMemo } from "react";

import { MessageEntry } from "./Message";
import { EventType, MessageSendRequest } from "../events";

import { Attachments } from "./Attachments";

import { chooseFiles, getFileType, makeSnowflake } from "../util";

import MarkdownTextbox from "./Input";
import List from "./List";

export function Chat() {
  const messageView = useChatState((state) => state.gateway.currentMessages);
  const anchor = useChatState((state) => state.gateway.getChatScroll() ?? "");
  const setAnchor = useChatState((state) => state.setChatScroll);

  return (
    <List
      id="chat-view"
      className="thick-scrollbar"
      data={messageView}
      anchor={anchor}
      setAnchor={setAnchor}
      entry={(id: string) => {
        return <MessageEntry key={id} id={id} />;
      }}
      defaultBottom={true}
    ></List>
  );
}

export function Input() {
  const [submit, setSubmit] = useState(0);
  const [plaintext, setPlaintext] = useState("");
  const textboxRef = useRef<{
    clear: () => void;
  }>();

  const currentChannel = useChatState((state) => state.gateway.currentChannel);
  const sendMessage = useChatState((state) => state.sendMessage);

  const setAttachments = useChatState((state) => state.setAttachments);
  const attaching = useChatState(
    (state) => state.gateway.currentFiles.length > 0
  );

  useEffect(() => {
    textboxRef.current?.clear();
  }, [submit]);

  const editor = (
    <MarkdownTextbox
      ref={textboxRef}
      onValue={(text: string) => {
        setPlaintext(text);
      }}
    />
  );

  return (
    <>
      {attaching && <Attachments />}
      <div
        id="textbox-container"
        className={"input-scrollbar" + (attaching ? " upload" : "")}
      >
        <button
          className="input-button clickable-button"
          onClick={() => {
            chooseFiles().then((files) => {
              const newFiles = files.map((file) => {
                return {
                  id: makeSnowflake(),
                  file: file,
                  filename: file.name,
                  spoilered: false,
                  type: getFileType(file),
                  blobURL: "",
                };
              });

              setAttachments(newFiles, [], []);
            });
          }}
        >
          <RiAddCircleFill className="input-icon" />
        </button>
        <div
          id="textbox"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (currentChannel !== undefined) {
                sendMessage(plaintext);

                console.log("SEND", `"${plaintext}"`);
                setSubmit(submit + 1);
              }
            }
          }}
        >
          {editor}
        </div>
        <button className="input-button clickable-button">
          <RiEmotionFill className="input-icon" />
        </button>
      </div>
    </>
  );
}

export default Chat;
