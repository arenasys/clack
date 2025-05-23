import { RiAddCircleFill, RiEmotionFill } from "react-icons/ri";

import { useChatState, useChatStateShallow } from "../state";

import { useEffect, useRef, useState, useMemo } from "react";

import { MessageEntry } from "./Message";
import { EventType, MessageSendRequest } from "../events";

import { Attachments } from "./Attachments";

import { Autocomplete } from "./Autocomplete";

import { ChooseFiles, GetFileType, MakeSnowflake } from "../util";

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
  const textboxRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<{
    clear: () => void;
    complete: (word: string, completion: string) => void;
  }>();
  const autocompleteRef = useRef<{
    setWord: (word: string) => void;
    selectUp: () => void;
    selectDown: () => void;
    showing: () => boolean;
    completable: () => boolean;
    complete: () => void;
  }>();

  const currentChannel = useChatState((state) => state.gateway.currentChannel);
  const sendMessage = useChatState((state) => state.sendMessage);

  const setAttachments = useChatState((state) => state.setAttachments);
  const attaching = useChatState(
    (state) => state.gateway.currentFiles.length > 0
  );

  useEffect(() => {
    editorRef.current?.clear();
  }, [submit]);

  const autocomplete = (
    <Autocomplete
      ref={autocompleteRef}
      onSumbit={(word, completion) => {
        editorRef.current?.complete(word, completion);
      }}
    />
  );

  const editor = (
    <MarkdownTextbox
      ref={editorRef}
      onValue={(text: string, cursor: number) => {
        console.log("TEXT", text);

        if (cursor == -1) {
          autocompleteRef.current?.setWord("");
        } else {
          const currentWord = text.slice(0, cursor).split(/\s|>/g).pop();
          if (currentWord === undefined) {
            autocompleteRef.current?.setWord("");
          } else {
            autocompleteRef.current?.setWord(currentWord);
          }
        }

        setPlaintext(text);
      }}
    />
  );

  return (
    <>
      {autocomplete}
      {attaching && <Attachments />}
      <div
        id="textbox-container"
        className={"input-scrollbar" + (attaching ? " upload" : "")}
      >
        <button
          className="input-button clickable-button"
          onClick={() => {
            ChooseFiles().then((files) => {
              const newFiles = files.map((file) => {
                return {
                  id: MakeSnowflake(),
                  file: file,
                  filename: file.name,
                  spoilered: false,
                  type: GetFileType(file),
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
          ref={textboxRef}
          id="textbox"
          onKeyDown={(event) => {
            const autocomplete = autocompleteRef.current;
            if (autocomplete && autocomplete.showing()) {
              if (event.key === "ArrowUp") {
                event.preventDefault();
                autocomplete.selectUp();
                return;
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                autocomplete.selectDown();
                return;
              } else if (event.key === "Tab" && autocomplete.completable()) {
                event.preventDefault();
                autocomplete.complete();
                return;
              } else if (
                event.key === "Enter" &&
                !event.shiftKey &&
                autocomplete.completable()
              ) {
                event.preventDefault();
                autocomplete.complete();
                return;
              } else if (event.key === "Escape") {
                event.preventDefault();
                autocomplete.setWord("");
                return;
              }
            }

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
