import { RiAddCircleFill, RiEmotionFill } from "react-icons/ri";
import { IoClose } from "react-icons/io5";
import { IoIosArrowDown } from "react-icons/io";

import {
  useClackState,
  useClackStateDynamic,
  getClackState,
  ClackEvents,
} from "../state";
import { FilesToChatAttachments } from "../state/chat";

import { useEffect, useRef, useState, useMemo } from "react";

import { MessageEntry } from "./Message";
import { EventType, MessageSendRequest } from "../types";

import { Attachments } from "./Attachments";

import { Autocomplete, AutocompleteRef } from "./Autocomplete";

import { ErrorBoundary } from "react-error-boundary";
import { Fallback } from "./Error";

import {
  ChooseFiles,
  FormatColor,
  GetFileType,
  MakeSnowflake,
  isElementEditable,
} from "../util";

import { MarkdownTextbox, MarkdownTextboxRef } from "./Input";
import { IconButton, TooltipWrapper } from "./Common";
import List from "./List";
import { Descendant } from "slate";
import { is } from "date-fns/locale";

export function Chat() {
  const messageView = useClackState(
    ClackEvents.current,
    (state) => state.chat.currentMessages
  );
  useClackState(ClackEvents.anchor, () => {});
  const setAnchor = getClackState((state) => state.chat.setChatScroll);
  const setTooltipPopup = getClackState((state) => state.gui.setTooltipPopup);

  /*function setAnchorTimeout(
    top: string,
    center: string,
    bottom: string,
    fetching: boolean
  ) {
    setTimeout(() => {
      setAnchor(top, center, bottom, fetching);
    }, 0);
  }*/

  function getAnchor() {
    return getClackState((state) => state.chat.getChatScroll() ?? "");
  }

  return (
    <List
      id="chat-view"
      className="thick-scrollbar"
      data={messageView}
      getAnchor={getAnchor}
      setAnchor={setAnchor}
      entry={(id: string) => {
        return (
          <ErrorBoundary FallbackComponent={Fallback}>
            <MessageEntry key={id} id={id} />
          </ErrorBoundary>
        );
      }}
      defaultBottom={true}
      onScroll={() => {
        setTooltipPopup(undefined);
      }}
    ></List>
  );
}

export function Input() {
  const [submit, setSubmit] = useState(0);
  const [plaintext, setPlaintext] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textboxRef = useRef<MarkdownTextboxRef>();
  const autocompleteRef = useRef<AutocompleteRef>();

  const currentChannel = useClackState(
    ClackEvents.current,
    (state) => state.chat.currentChannel
  );
  const sendMessage = getClackState((state) => state.chat.sendMessage);
  const jumpToMessage = getClackState((state) => state.chat.jumpToMessage);

  const setAttachments = getClackState((state) => state.chat.setAttachments);
  const attaching = useClackState(
    ClackEvents.current,
    (state) => state.chat.currentFiles.length > 0
  );
  function addFiles(files: File[]) {
    const attachments = FilesToChatAttachments(files);
    setAttachments(attachments, [], []);
  }

  const [replyingMention, setReplyingMention] = useState<boolean>(false);
  const replyingTo = useClackStateDynamic((state, events) => {
    events.push(ClackEvents.current);
    var id = state.chat.currentReplyingTo;
    if (id === undefined) return undefined;

    events.push(ClackEvents.message(id));
    const message = state.chat.messages.get(id);
    if (message === undefined) return undefined;

    const author = state.chat.users.get(message.author);
    events.push(ClackEvents.user(message.author));

    return {
      message: message,
      author: author,
    };
  });

  const setReplyingTo = getClackState((state) => state.chat.setReplyingTo);

  const showJumpToPresent = useClackState(
    ClackEvents.current,
    (state) => state.chat.currentJumpToPresent
  );

  const setEmojiPickerPopup = getClackState(
    (state) => state.gui.setEmojiPickerPopup
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

  const currentChanneName = useClackStateDynamic((state, events) => {
    events.push(ClackEvents.current);
    const c = state.chat.currentChannel;
    if (c === undefined) return "unknown";
    events.push(ClackEvents.channel(c));
    return state.chat.channels.get(c)!.name;
  });

  const currentEditorState = useClackState(
    ClackEvents.current,
    (state) => state.chat.currentEditor
  );
  const setEditorState = getClackState((state) => {
    return state.chat.setEditorState;
  });

  useEffect(() => {
    if (textboxRef.current) {
      const state = (
        currentEditorState == "" ? [] : JSON.parse(currentEditorState)
      ) as Descendant[];
      textboxRef.current.setValue(state);
    }
  }, [currentChannel]);

  useClackState(ClackEvents.editorFocus, () => {
    setTimeout(() => {
      if (textboxRef.current) {
        textboxRef.current.focus();
      }
    }, 0);
  });

  // Capture any unhandled key events and paste events for the primary textbox.
  // Need to mark events with preventDefault elsewhere so they dont get captured here.
  useEffect(() => {
    const isHandled = (e: KeyboardEvent | ClipboardEvent) => {
      if (e.defaultPrevented) return true;
      if (getClackState((state) => state.gui.hasModal())) return true;
      if (isElementEditable(e.target)) return true;
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isHandled(e)) return;

      textboxRef.current?.capture(e);
    };

    const onPaste = (e: ClipboardEvent) => {
      if (isHandled(e)) return;
      console.log("CAPUTURE PASTE");
      textboxRef.current?.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("paste", onPaste);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("paste", onPaste);
    };
  }, [textboxRef]);

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

  const isReplying = replyingTo !== undefined;
  const isJumpable = showJumpToPresent && !isReplying;
  const isAttaching = attaching;

  return (
    <>
      {autocomplete}

      {isJumpable && (
        <div
          id="jump-container"
          onClick={() => {
            jumpToMessage("bottom");
          }}
        >
          You're viewing older messages
          <span className="jump-label">Jump To Present</span>
          <IoIosArrowDown className="jump-icon" />
        </div>
      )}

      {isReplying && (
        <div id="reply-to-container">
          <span>
            {"Replying to"}
            <span
              className="reply-to-name"
              style={{
                color: FormatColor(replyingTo.author?.color),
              }}
            >
              {" "}
              {replyingTo.author?.nickname ??
                replyingTo.author?.username ??
                "Unknown"}
            </span>
          </span>
          <TooltipWrapper
            tooltip={`${replyingMention ? "Disable" : "Enable"} Mention`}
            className={`reply-to-at ${replyingMention ? "active" : ""}`}
            onClick={() => {
              setReplyingMention(!replyingMention);
            }}
          >
            {"@"}
            <span className="reply-to-at-label">{`${
              replyingMention ? "ON" : "OFF"
            }`}</span>
          </TooltipWrapper>
          <IconButton
            className="reply-to-close-button foreground"
            onClick={() => {
              setReplyingTo(undefined);
            }}
          >
            <IoClose className="reply-to-close-icon" />
          </IconButton>
        </div>
      )}
      {isAttaching && (
        <Attachments
          className={isReplying || showJumpToPresent ? "combined" : ""}
        />
      )}
      <div
        id="textbox-container"
        className={
          "input-scrollbar" +
          (isAttaching || isReplying || showJumpToPresent ? " combined" : "") +
          (isAttaching ? " divider" : "")
        }
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
              const isEmpty = plaintext.trim() === "";
              const isAllowed = !isEmpty || isAttaching;
              console.log("ENTER", `"${plaintext}"`, isEmpty, isAllowed);
              if (currentChannel !== undefined && isAllowed) {
                event.preventDefault();
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
            e.preventDefault();
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
              onPick: (_, text: string) => {
                if (textboxRef.current) {
                  textboxRef.current.focus();
                  textboxRef.current.insert(text + " ");
                }
              },
              onClose: () => {},
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
