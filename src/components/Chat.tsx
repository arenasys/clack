import { RiAddCircleFill, RiEmotionFill } from "react-icons/ri";

import { useChatState, useChatStateShallow } from "../state";

import { useEffect, useRef, useState, useMemo } from "react";

import { MessageEntry } from "./Message";
import { EventType, MessageSendRequest } from "../events";

import { Attachments } from "./Attachments";

import { Autocomplete, AutocompleteRef } from "./Autocomplete";

import { ChooseFiles, GetFileType, MakeSnowflake } from "../util";

import { MarkdownTextbox, MarkdownTextboxRef } from "./Input";
import List from "./List";
import { Descendant } from "slate";

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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textboxRef = useRef<MarkdownTextboxRef>();
  const autocompleteRef = useRef<AutocompleteRef>();

  const currentChannel = useChatState((state) => state.gateway.currentChannel);
  const sendMessage = useChatState((state) => state.sendMessage);

  const setAttachments = useChatState((state) => state.setAttachments);
  const attaching = useChatState(
    (state) => state.gateway.currentFiles.length > 0
  );
  function addFiles(files: File[]) {
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
  }

  const setEmojiPickerPopup = useChatState(
    (state) => state.setEmojiPickerPopup
  );

  useEffect(() => {
    textboxRef.current?.clear();
  }, [submit]);

  const autocomplete = (
    <Autocomplete
      ref={autocompleteRef}
      onComplete={(word: string, completion: string) => {
        if (textboxRef.current) {
          textboxRef.current.complete(word, completion);
        }
      }}
    />
  );

  const currentChanneName = useChatStateShallow((state) => {
    const c = state.gateway.currentChannel;
    if (c === undefined) return "unknown";
    return state.gateway.channels.get(c)!.name;
  });

  const currentEditorState = useChatState(
    (state) => state.gateway.currentEditor
  );
  const setEditorState = useChatState((state) => {
    return state.setEditorState;
  });

  useEffect(() => {
    if (textboxRef.current) {
      const state = (
        currentEditorState == "" ? [] : JSON.parse(currentEditorState)
      ) as Descendant[];
      textboxRef.current.setValue(state);
    }
  }, [currentChannel]);

  const editor = (
    <MarkdownTextbox
      ref={textboxRef}
      placeholder={`Message #${currentChanneName}`}
      onValue={(text: string, cursor: number, value: Descendant[]) => {
        autocompleteRef.current?.onValue(text, cursor);
        setPlaintext(text.trim());
        setEditorState(JSON.stringify(value));
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
              addFiles(files);
            });
          }}
        >
          <RiAddCircleFill className="input-icon" />
        </button>
        <div
          ref={wrapperRef}
          id="textbox"
          onKeyDown={(event) => {
            if (autocompleteRef.current?.onKeyDown(event)) return;

            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (currentChannel !== undefined) {
                sendMessage(plaintext);

                console.log("SEND", `"${plaintext}"`);
                setSubmit(submit + 1);
              }
            }
          }}
          onPaste={(e) => {
            if (e.clipboardData.files.length !== 0) {
              addFiles(Array.from(e.clipboardData.files));
            }
          }}
        >
          {editor}
        </div>
        <button
          className="input-button clickable-button"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();

            setEmojiPickerPopup({
              position: {
                x: rect.right,
                y: rect.top - 10,
              },
              direction: "top",
              onPick: (emoji: string) => {
                if (textboxRef.current) {
                  textboxRef.current.insert(emoji + " ");
                }
              },
            });
          }}
        >
          <RiEmotionFill className="input-icon" />
        </button>
      </div>
    </>
  );
}

export default Chat;
