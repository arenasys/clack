import {
  useClackState,
  getClackState,
  ClackEvents,
  useClackStateDynamic,
} from "../state";
import { Reaction } from "../types";

import { useEffect, useRef, useState, useMemo } from "react";

import { SyntaxContent, EmojiContent } from "../syntax";

import {
  Snowflake,
  Attachment,
  AttachmentType,
  Embed,
  EmbedType,
  Permissions,
} from "../types";

import { Emoji, EmojiLookupName } from "../emoji";

import { VideoDisplay, ImageDisplay, AnimatedImageDisplay } from "./Media";

import { RiReplyFill, RiEmotionFill, RiMoreFill } from "react-icons/ri";
import { IoClose } from "react-icons/io5";
import { IoMdCreate, IoMdDownload } from "react-icons/io";
import { MdPhoto } from "react-icons/md";
import { FaImage } from "react-icons/fa6";
import { IoIosArrowForward } from "react-icons/io";

import {
  FormatDateTime,
  FormatDateTimeLong,
  FormatTime,
  FormatColor,
  Roll,
  GetFileIcon,
  FormatBytes,
  isInsideSelection,
} from "../util";

import { Autocomplete, AutocompleteRef } from "./Autocomplete";
import {
  MarkdownTextbox,
  MarkdownTextboxRef,
  MarkdownTextInput,
} from "./Input";

import { FaFile, FaFileUpload, FaTimes } from "react-icons/fa";

import Rand from "rand-seed";
import { IconButton, TooltipWrapper } from "./Common";
import { UserContextMenu } from "./Users";
import { ContextMenuState } from "../state/gui";
import { avatarPreviewURL } from "../state/chat";

export function MessageEntry({ id }: { id: string }) {
  const content = useMemo(() => {
    if (id.startsWith("skeleton")) {
      return <Skeleton id={id} />;
    } else {
      return <Message id={id} />;
    }
  }, [id]);
  return content;
}

export function Message({
  id,
  standalone,
}: {
  id: string;
  standalone?: boolean;
}) {
  const message = useClackStateDynamic((state, events) => {
    events.push(ClackEvents.message(id));

    const m = state.chat.messages.get(id);
    if (!m) return undefined;

    events.push(ClackEvents.user(m.author));

    const a = state.chat.users.get(m.author);
    const p = state.chat.pendingMessages.has(id);
    const c = state.chat.currentMessagesIsCombined.get(id)!;
    const r = state.chat.currentReplyingTo == id;
    const j = state.chat.currentJumpedTo == id;

    var u = false;
    if (p) {
      const pending = state.chat.pendingMessages.get(id);
      u = (pending?.attachments?.length ?? 0) > 0;
    }

    return {
      ...m,
      user: a,
      name: a?.displayName,
      color: a?.roleColor,
      pending: p,
      uploading: u,
      combined: c,
      replying: r,
      jumped: j,
      reference: m.reference,
      you: a?.id == state.chat.currentUser,
      permissions: state.chat.getPermissions(
        state.chat.currentUser!,
        m.channel
      ),
    };
  });

  const rng = new Rand(id);

  const ref = useRef<HTMLDivElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const editedValue = useRef<string | undefined>();
  const updateMessage = getClackState((state) => state.chat.updateMessage);
  const toggleReaction = getClackState((state) => state.chat.toggleReaction);
  const [isFlashing, setIsFlashing] = useState(false);
  const flashingTimeout = useRef<number | null>(null);
  const [isPickingEmoji, setIsPickingEmoji] = useState(false);

  useEffect(() => {
    editedValue.current = undefined;
  }, [message?.editedTimestamp]);

  const setViewerModal = getClackState((state) => state.gui.setViewerModal);
  const setUserPopup = getClackState((state) => state.gui.setUserPopup);
  const setContextMenuPopup = getClackState(
    (state) => state.gui.setContextMenuPopup
  );
  const setEmojiPickerPopup = getClackState(
    (state) => state.gui.setEmojiPickerPopup
  );

  const setReplyingTo = getClackState((state) => state.chat.setReplyingTo);
  const jumpToMessage = getClackState((state) => state.chat.jumpToMessage);

  const [actionBarContextMenu, setActionBarContextMenu] = useState<
    string | undefined
  >(undefined);
  const [mouseContextMenu, setMouseContextMenu] = useState<string | undefined>(
    undefined
  );

  const ownsContextMenu = actionBarContextMenu || mouseContextMenu;

  function clearContextMenu() {
    setContextMenuPopup(undefined);
  }

  useClackState(ClackEvents.contextMenu(id), (state) => {
    const current = state.gui.contextMenuPopup;
    if (!current || current.id != id) {
      if (actionBarContextMenu) {
        setActionBarContextMenu(undefined);
      }
      if (mouseContextMenu) {
        setMouseContextMenu(undefined);
      }
    }
  });

  const hasReference = message?.reference !== undefined;
  const hasUser = message?.user !== undefined;
  const isCombined =
    !standalone && (message?.combined ?? false) && !hasReference;
  const isReplying = message?.replying ?? false;
  const isJumped = message?.jumped ?? false;

  useEffect(() => {
    if (isJumped) {
      jumpToMessage(undefined);
      if (flashingTimeout.current) {
        window.clearTimeout(flashingTimeout.current);
        flashingTimeout.current = null;
      }
      setIsFlashing(true);
      flashingTimeout.current = window.setTimeout(() => {
        setIsFlashing(false);
        flashingTimeout.current = null;
      }, 2000);
    }
  }, [isJumped]);

  const messageContent = useMemo(() => {
    if (isEditing) {
      return (
        <MessageEditor
          id={id}
          content={message?.content ?? ""}
          setContent={(content: string) => {
            editedValue.current = content;
          }}
          cancel={() => {
            editedValue.current = undefined;
            setIsEditing(false);
          }}
          save={() => {
            setIsEditing(false);
            if (message !== undefined && editedValue.current !== undefined) {
              updateMessage(message.id, editedValue.current);
            }
          }}
        />
      );
    }
    return (
      <>
        <SyntaxContent
          text={editedValue.current ?? message?.content ?? ""}
        ></SyntaxContent>
        {message?.editedTimestamp && (
          <MessageEditedTimestamp timestamp={message.editedTimestamp} />
        )}
      </>
    );
  }, [message?.editedTimestamp, isEditing]);

  const messageReference = message?.reference ? (
    <MessageReference id={message.reference} />
  ) : (
    <></>
  );

  const permissions = message?.permissions ?? 0;

  const canReply = (permissions & Permissions.SendMessages) != 0;
  const canReact = (permissions & Permissions.AddReactions) != 0;
  const canEdit = message?.you;

  const timestamp = new Date(message?.timestamp ?? 0);
  const color = FormatColor(message?.color) ?? "";

  const messageActions = useMemo(() => {
    if (isEditing) {
      return <></>;
    }

    return (
      <div className="message-actions-container">
        <div className="message-actions-bar">
          {!message?.you && canReply && (
            <IconButton
              tooltip="Reply"
              tooltipDirection="top"
              className="message-actions-button row"
              onClick={() => {
                if (message === undefined) return;
                setReplyingTo(message.id);
              }}
            >
              <RiReplyFill />
            </IconButton>
          )}
          {message?.you && canEdit && (
            <IconButton
              tooltip="Edit"
              tooltipDirection="top"
              className={`message-actions-button row`}
              onClick={() => {
                setIsEditing(true);
              }}
            >
              <IoMdCreate />
            </IconButton>
          )}
          {canReact && (
            <IconButton
              tooltip="Add Reaction"
              tooltipDirection="top"
              className={`message-actions-button row ${
                isPickingEmoji ? "active" : ""
              }`}
              onClick={(rect) => {
                setIsPickingEmoji(true);
                setEmojiPickerPopup({
                  position: {
                    x: rect.left - 10,
                    y: rect.top,
                  },
                  direction: "bottom",
                  onPick: (emojiID: Snowflake, text: string) => {
                    toggleReaction(id, emojiID);
                  },
                  onClose: () => {
                    setIsPickingEmoji(false);
                  },
                });
              }}
            >
              <RiEmotionFill />
            </IconButton>
          )}

          <IconButton
            tooltip="More"
            tooltipDirection="top"
            className={`message-actions-button row ${
              actionBarContextMenu != undefined ? "active" : ""
            }`}
            onClick={(rect) => {
              const contextMenu = {
                type: "message",
                id: id,
                content: (
                  <MessageContextMenu
                    id={id}
                    position={{
                      x: (rect.left + rect.right) / 2,
                      y: (rect.top + rect.bottom) / 2,
                    }}
                    offset={{ x: 16 + 8, y: -16 }}
                  />
                ),
              };
              setActionBarContextMenu(id);
              setContextMenuPopup(contextMenu);
            }}
          >
            <RiMoreFill />
          </IconButton>
        </div>
      </div>
    );
  }, [actionBarContextMenu, isEditing, isPickingEmoji]);

  var header = useMemo(() => {
    const timestampEl = (
      <TooltipWrapper tooltip={FormatDateTimeLong(timestamp)} delay={1000}>
        <span className="message-timestamp">{FormatDateTime(timestamp)}</span>
      </TooltipWrapper>
    );

    if (hasUser) {
      return (
        <>
          <img
            className="message-avatar clickable-button"
            src={avatarPreviewURL(message.user)}
            onClick={(e) => {
              if (message.user) {
                var rect = e.currentTarget.getBoundingClientRect();
                setUserPopup({
                  id: message.author,
                  position: {
                    x: rect.right + 8,
                    y: rect.top,
                  },
                  direction: "right",
                });
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onContextMenu={(e) => {
              if (!message.user) return;
              e.preventDefault();
              e.stopPropagation();
              setContextMenuPopup({
                type: "user",
                id: message.user.id,
                content: (
                  <UserContextMenu
                    id={message.user.id}
                    position={{ x: e.clientX, y: e.clientY }}
                    offset={{ x: 0, y: 0 }}
                  />
                ),
              });
            }}
          />
          <div className="message-header">
            <span
              className="message-name clickable-text"
              style={{
                color: color,
              }}
              onClick={(e) => {
                if (message.user) {
                  var rect = e.currentTarget.getBoundingClientRect();
                  setUserPopup({
                    id: message.author,
                    position: {
                      x: rect.right + 8,
                      y: rect.top,
                    },
                    direction: "right",
                  });
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              onContextMenu={(e) => {
                if (!message.user) return;
                e.preventDefault();
                e.stopPropagation();
                setContextMenuPopup({
                  type: "user",
                  id: message.user.id,
                  content: (
                    <UserContextMenu
                      id={message.user.id}
                      position={{ x: e.clientX, y: e.clientY }}
                      offset={{ x: 0, y: 0 }}
                    />
                  ),
                });
              }}
              onMouseDown={(e) => {
                // Prevent text selection on double click
                if (e.detail > 1) {
                  e.preventDefault();
                }
              }}
            >
              {message?.name ?? id}
            </span>
            {timestampEl}
          </div>
        </>
      );
    } else {
      return (
        <>
          <div className="message-avatar skeleton" />
          <div className="message-header">
            <span
              className="message-name skeleton"
              style={{ width: Roll(75, 125, rng) }}
            />
          </div>
        </>
      );
    }
  }, [hasUser, message]);

  if (message === undefined) {
    return <></>;
  }

  const className =
    "message-entry" +
    (isCombined ? " combined" : "") +
    (message?.pending ? " pending" : "") +
    (ownsContextMenu || isPickingEmoji ? " active" : "") +
    (isReplying ? " replying" : "") +
    (isEditing ? " editing" : "");

  var attachedMedia: Attachment[] = [];
  var attachedFiles: Attachment[] = [];
  var attachmentGroups: { attachments: Attachment[]; className: string }[] = [];

  function doView(index: number) {
    setViewerModal({
      index: index,
      items: [...attachedMedia],
    });
  }

  if (message.attachments) {
    attachedMedia = message.attachments.filter(
      (a) => a.type == AttachmentType.Image || a.type == AttachmentType.Video
    );
    attachedFiles = message.attachments.filter(
      (a) => a.type == AttachmentType.File
    );

    if (attachedMedia.length == 1) {
      attachmentGroups = [
        { attachments: [...attachedMedia], className: "group-1" },
      ];
    } else if (attachedMedia.length == 2) {
      attachmentGroups = [
        { attachments: [...attachedMedia], className: "group-2" },
      ];
    } else if (attachedMedia.length == 3) {
      attachmentGroups = [
        { attachments: [...attachedMedia], className: "group-3" },
      ];
    } else {
      var i = attachedMedia.length % 3;

      if (i != 0) {
        if (i == 1) {
          attachmentGroups.push({
            attachments: attachedMedia.slice(0, 2),
            className: "row-2",
          });
          attachmentGroups.push({
            attachments: attachedMedia.slice(2, 4),
            className: "row-2",
          });
          i = 4;
        } else {
          attachmentGroups.push({
            attachments: attachedMedia.slice(0, i),
            className: "row-" + i,
          });
        }
      }

      for (; i < attachedMedia.length; i += 3) {
        attachmentGroups.push({
          attachments: attachedMedia.slice(i, i + 3),
          className: "row-3",
        });
      }
    }
  }

  const hasAttachments = attachedMedia.length > 0 || attachedFiles.length > 0;
  const hasEmbeds = message.embeds ? true : false;
  const hasUploading = message.uploading;
  const hasReactions = (message.reactions?.length ?? 0) > 0;
  const isEmbedding = (message.embeddableURLs?.length ?? 0) > 0;

  const hasAccessories =
    hasAttachments || hasEmbeds || hasUploading || isEmbedding || hasReactions;

  return (
    <div
      id={id}
      ref={ref}
      className={className}
      tabIndex={-1}
      onContextMenu={(e) => {
        if (isInsideSelection(e)) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        const contextMenu = {
          type: "message",
          id: id,
          content: (
            <MessageContextMenu
              id={id}
              position={{ x: e.clientX, y: e.clientY }}
              offset={{ x: 0, y: 0 }}
            />
          ),
        };
        setMouseContextMenu(id);
        setContextMenuPopup(contextMenu);
      }}
    >
      <div className="message-background flash" data-on={isFlashing} />
      {isReplying && <div className="message-background replying" />}

      {hasReference && messageReference}
      {!isCombined && header}
      {isCombined && (
        <div className="message-timestamp-inline">
          <TooltipWrapper tooltip={FormatDateTimeLong(timestamp)} delay={1000}>
            <span>{FormatTime(timestamp)}</span>
          </TooltipWrapper>
        </div>
      )}
      <div className="message-content">{messageContent}</div>
      <div className="message-actions">{messageActions}</div>
      {hasAccessories && (
        <div className="message-accessories">
          {hasAttachments && (
            <div className="message-attachments">
              {attachmentGroups.map((group, index) => (
                <div
                  key={`${id}-attachment-group-${index}`}
                  className={"message-attachment-group " + group.className}
                >
                  {group.attachments.map((attachment, index) => (
                    <MessageMediaAttachment
                      attachmentIndex={attachedMedia.indexOf(attachment)}
                      attachmentCount={attachedMedia.length}
                      key={`${id}-attachment-${index}`}
                      attachment={attachment}
                      onView={() => {
                        doView(index);
                      }}
                    />
                  ))}
                </div>
              ))}
              {attachedFiles.map((attachment, index) => (
                <MessageFileAttachment
                  key={`${id}-file-attachment-${index}`}
                  attachment={attachment}
                />
              ))}
            </div>
          )}
          {hasEmbeds && (
            <div className="message-embeds">
              {message.embeds?.map((embed, index) => (
                <MessageEmbed key={`${id}-embed-${index}`} embed={embed} />
              ))}
            </div>
          )}
          {isEmbedding && (
            <div className="message-embedding-loader">
              <div className="message-embed">
                <div className="loader"></div>
              </div>
            </div>
          )}
          {hasUploading && <MessageUpload id={id} />}
          {<MessageReactions id={id} />}
        </div>
      )}
    </div>
  );
}

function MessageEditor({
  id,
  content,
  setContent,
  cancel,
  save,
}: {
  id: string;
  content: string;
  setContent: (content: string) => void;
  cancel: () => void;
  save: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<AutocompleteRef>(null);
  const textboxRef = useRef<MarkdownTextboxRef>(null);
  const setEmojiPickerPopup = getClackState(
    (state) => state.gui.setEmojiPickerPopup
  );

  useEffect(() => {
    if (textboxRef.current) {
      textboxRef.current.focus();
    }
  }, [textboxRef.current]);

  return (
    <>
      <Autocomplete
        ref={autocompleteRef}
        onComplete={(word: string, completion: string) => {
          console.log("A", word, completion);
          if (textboxRef.current) {
            console.log("B", word, completion);
            textboxRef.current.complete(word, completion);
          }
        }}
      />

      <div
        className="message-editor-container"
        onKeyDown={(e) => {
          autocompleteRef.current?.onKeyDown(e);
        }}
      >
        <MarkdownTextInput
          ref={textboxRef}
          value={content}
          onValue={(text: string) => {
            autocompleteRef.current?.onValue(text, text.length);
            setContent(text);
          }}
          placeholder="Type your message here..."
          className="message-editor"
          innerClassName="message-editor-inner"
        />
      </div>

      <div className="message-editor-controls">
        {"escape to "}
        <a
          className="clickable-text"
          onClick={() => {
            cancel();
          }}
        >
          {"cancel"}
        </a>
        {", enter to "}
        <a
          className="clickable-text"
          onClick={() => {
            save();
          }}
        >
          {"save"}
        </a>
      </div>
    </>
  );
}

function MessageUpload({ id }: { id: string }) {
  const cancel = getClackState((state) => state.chat.cancelMessage);

  const pending = useClackState(ClackEvents.message(id), (state) => {
    return state.chat.pendingMessages.get(id);
  });

  // Polling for progress
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  var icon = <FaFile />;
  var text = "????";

  if (pending?.attachments) {
    if (pending.attachments.length == 1) {
      var first = pending.attachments[0];
      icon = GetFileIcon(first.filename, first.mimetype);
      text = first.filename;
    } else {
      icon = <FaFileUpload />;
      text = `Uploading ${pending.attachments.length} files...`;
    }
  }

  return (
    <div className="message-file">
      <div className="message-file-icon">{icon}</div>
      <div className="message-file-content">
        <div className="message-file-title">
          <div className="message-file-text">{text + " "}</div>
          <div className="message-file-size inline">
            {`– ${FormatBytes(pending?.size)}`}
          </div>
        </div>

        <div className="message-file-progress">
          <div
            className="message-file-progress-bar"
            style={{
              width: `${pending?.progress ?? 0}%`,
            }}
          />
        </div>
      </div>
      <IconButton
        tooltip="Cancel"
        tooltipDirection="top"
        className="message-file-button"
        onClick={() => {
          cancel(id);
        }}
      >
        <FaTimes />
      </IconButton>
    </div>
  );
}

function MessageEmbed({ embed }: { embed: Embed }) {
  if (embed.type == EmbedType.Rich) {
    return <MessageRichEmbed embed={embed} />;
  }
  if (embed.type == EmbedType.Video) {
    return <MessageVideoEmbed embed={embed} />;
  }
  if (embed.type == EmbedType.Image) {
    return <MessageImageEmbed embed={embed} />;
  }
}

function MessageImageEmbed({ embed }: { embed: Embed }) {
  const image = embed.image!;

  return (
    <div
      className="embed-media-container media-wrapper"
      style={{
        aspectRatio: image.width / image.height,
        maxWidth: `min(${image.width}px, var(--attachment-max-width))`,
        maxHeight: `min(${image.height}px, var(--attachment-max-height))`,
      }}
    >
      <ImageDisplay
        src={image.proxyURL!}
        preload={image.preload}
        onClick={() => {
          return true;
        }}
      />
    </div>
  );
}

function MessageVideoEmbed({ embed }: { embed: Embed }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const video = embed.video!;

  return (
    <div
      className="embed-media-container media-wrapper"
      style={{
        aspectRatio: video.width / video.height,
        maxWidth: `min(${video.width}px, var(--attachment-max-width))`,
        maxHeight: `min(${video.height}px, var(--attachment-max-height))`,
      }}
    >
      <VideoDisplay
        src={video.proxyURL!}
        poster={video.previewURL!}
        preload={video.preload}
        showCover={true}
        showTimestamps={video.width > 0.8 * video.height}
        onClick={() => {
          return true;
        }}
        videoRef={videoRef}
      />
    </div>
  );
}

function MessageRichEmbed({ embed }: { embed: Embed }) {
  const setViewerModal = getClackState((state) => state.gui.setViewerModal);

  const videoRef = useRef<HTMLVideoElement>(null);

  const hasDesc = embed.description != undefined;
  const hasMedia = embed.video || embed.image;
  const hasThumbnail = embed.thumbnail;
  const isVertical =
    (embed.image && embed.image.width < embed.image.height) ||
    (embed.video && embed.video.width < embed.video.height);

  var maxWidth: number = 516;
  if (hasMedia) {
    maxWidth = 432;
    if (isVertical) {
      if (!hasDesc) {
        maxWidth = 201;
      }
    }
  }

  var color: string | undefined = undefined;
  if (embed.color) {
    color = `#${embed.color.toString(16).padStart(6, "0")}`;
  }

  var inner = [];

  if (embed.provider) {
    inner.push(
      <a
        className="embed-provider"
        key="embed-provider"
        href={embed.provider.url}
        rel="noreferrer noopener"
        target="_blank"
      >
        <EmojiContent text={embed.provider.name} />
      </a>
    );
  }

  if (embed.author) {
    inner.push(
      <a
        className="embed-author"
        key="embed-author"
        href={embed.author.url}
        rel="noreferrer noopener"
        target="_blank"
      >
        <EmojiContent text={embed.author.name} />
      </a>
    );
  }

  if (embed.title) {
    inner.push(
      <a
        className="embed-title"
        key="embed-title"
        href={embed.url}
        rel="noreferrer noopener"
        target="_blank"
      >
        <EmojiContent text={embed.title} />
      </a>
    );
  }

  if (embed.description) {
    inner.push(
      <div className="embed-description" key="embed-description">
        <EmojiContent text={embed.description} />
      </div>
    );
  }

  if (embed.thumbnail) {
    var isThumbVertical = embed.thumbnail.width < embed.thumbnail.height;
    inner.push(
      <div className="embed-thumbnail" key="embed-thumbnail">
        <div
          className="embed-media-container media-wrapper"
          style={{
            width: isThumbVertical ? "100px" : "auto",
            height: isThumbVertical ? "auto" : "80px",
            maxWidth: "160px",
            maxHeight: "160px",
            aspectRatio: `${embed.thumbnail.width} / ${embed.thumbnail.height}`,
          }}
        >
          <ImageDisplay
            src={embed.thumbnail.previewURL!}
            preload={embed.thumbnail.preload}
            onClick={() => {
              setViewerModal({
                index: 0,
                items: [
                  {
                    ...embed.thumbnail,
                    type: embed.thumbnail.type!,
                    mimetype: "",
                  },
                ],
              });
            }}
          />
        </div>
      </div>
    );
  }

  if (embed.video || embed.image) {
    var media = embed.video ?? embed.image!;
    inner.push(
      <div key={`embed-media-${embed.id}`} className="embed-media">
        <div
          className="embed-media-container media-wrapper"
          style={{
            ...(media.width > media.height
              ? { maxWidth: "400px" }
              : { maxHeight: "300px" }),
            aspectRatio: `${media.width} / ${media.height}`,
          }}
        >
          {embed.video && (
            <VideoDisplay
              src={embed.video.proxyURL!}
              poster={embed.video.previewURL!}
              preload={embed.video.preload}
              showCover={true}
              showTimestamps={embed.video.width > 0.8 * embed.video.height}
              onClick={() => {
                return true;
              }}
              videoRef={videoRef}
            />
          )}
          {embed.image && (
            <ImageDisplay
              src={embed.image.previewURL!}
              preload={embed.image.preload}
              onClick={() => {
                setViewerModal({
                  index: 0,
                  items: [
                    { ...embed.image, type: embed.image.type!, mimetype: "" },
                  ],
                });
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="message-embed"
      style={{
        maxWidth: maxWidth,
        borderLeftColor: color,
        width: !hasMedia ? "fit-content" : undefined,
      }}
    >
      <div className="message-embed-grid">{inner}</div>
    </div>
  );
}

function MessageMediaAttachment({
  attachmentIndex,
  attachmentCount,
  attachment,
  onView,
}: {
  attachmentIndex: number;
  attachmentCount: number;
  attachment: Attachment;
  onView: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const loadTimeout = useRef<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsLoading(true);
            observer.disconnect();
            if (loadTimeout.current) {
              window.clearTimeout(loadTimeout.current);
              loadTimeout.current = null;
            }
          } else {
            if (!loadTimeout.current) {
              loadTimeout.current = window.setTimeout(() => {
                setIsLoading(true);
                observer.disconnect();
              }, Roll(100, 500));
            }
          }
          observer.disconnect();
        });
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  var inner;
  if (attachment.type == AttachmentType.Image) {
    if (attachment.mimetype == "image/gif") {
      inner = (
        <AnimatedImageDisplay
          src={attachment.displayURL!}
          preview={attachment.previewURL!}
          preload={attachment.preload}
          onClick={onView}
        />
      );
    } else {
      inner = (
        <ImageDisplay
          src={attachment.previewURL!}
          preload={attachment.preload}
          onClick={onView}
        />
      );
    }
  } else if (attachment.type == AttachmentType.Video) {
    const thumbnail = attachmentIndex != 0 || attachmentCount != 1;
    inner = (
      <VideoDisplay
        src={attachment.originalURL!}
        poster={attachment.previewURL!}
        preload={attachment.preload}
        showCover={true}
        showTimestamps={attachment.width > 0.8 * attachment.height}
        isThumbnail={thumbnail}
        onClick={() => {
          if (thumbnail) {
            onView();
            return false;
          } else {
            return true;
          }
        }}
        videoRef={videoRef}
      />
    );
  }

  return (
    <div
      className="message-attachment media-wrapper"
      ref={ref}
      style={{
        aspectRatio: attachment.width / attachment.height,
        maxWidth: `min(${attachment.width}px, var(--attachment-max-width))`,
        maxHeight: `min(${attachment.height}px, var(--attachment-max-height))`,
      }}
    >
      {inner}
    </div>
  );
}

function MessageFileAttachment({ attachment }: { attachment: Attachment }) {
  var icon = GetFileIcon(attachment.filename, attachment.mimetype);
  return (
    <div className="message-file">
      <div className="message-file-icon">{icon}</div>
      <div className="message-file-content">
        <a
          className="message-file-text message-file-link"
          href={attachment.originalURL}
          rel="noreferrer noopener"
          target="_blank"
        >
          {attachment.filename}
        </a>
        <div className="message-file-size">
          {`${FormatBytes(attachment.size)}`}
        </div>
      </div>
      <a
        href={attachment.originalURL}
        rel="noreferrer noopener"
        target="_blank"
      >
        <IconButton
          tooltip="Download"
          tooltipDirection="top"
          className="message-file-button download"
          onClick={() => {}}
        >
          <IoMdDownload />
        </IconButton>
      </a>
    </div>
  );
}

function MessageEditedTimestamp({ timestamp }: { timestamp: number }) {
  return (
    <TooltipWrapper
      tooltip={FormatDateTimeLong(new Date(timestamp))}
      delay={750}
    >
      <span className="message-edited-timestamp">{" (edited)"}</span>
    </TooltipWrapper>
  );
}

function MessageReference({ id }: { id: string }) {
  const message = useClackStateDynamic((state, events) => {
    events.push(ClackEvents.message(id));

    const m = state.chat.messages.get(id);
    if (!m) return undefined;

    events.push(ClackEvents.user(m.author));
    const a = state.chat.users.get(m.author);

    return {
      ...m,
      user: a,
      name: a?.displayName,
      color: a?.roleColor,
    };
  });

  const setUserPopup = getClackState((state) => state.gui.setUserPopup);
  const setContextMenuPopup = getClackState(
    (state) => state.gui.setContextMenuPopup
  );
  const jumpToMessage = getClackState((state) => state.chat.jumpToMessage);

  const hasEmbeds = message?.embeds?.length > 0;
  const hasAttachments = message?.attachments?.length > 0;

  return (
    <div
      className="message-reference"
      id={`reference-${id}`}
      onClick={(e) => {
        if (message) {
          jumpToMessage(message.id);
        }
      }}
    >
      <div className="message-reference-decoration">
        <div className="message-reference-pointer" />
      </div>
      <div className="message-reference-container">
        {message ? (
          <>
            <span
              className="message-reference-user"
              onClick={(e) => {
                e.stopPropagation();
                if (!message.user) return;
                var rect = e.currentTarget.getBoundingClientRect();
                setUserPopup({
                  id: message.author,
                  position: {
                    x: rect.right + 8,
                    y: rect.top,
                  },
                  direction: "right",
                });
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (!message.user) return;
                setContextMenuPopup({
                  type: "user",
                  id: message.user.id,
                  content: (
                    <UserContextMenu
                      id={message.user.id}
                      position={{ x: e.clientX, y: e.clientY }}
                      offset={{ x: 0, y: 0 }}
                    />
                  ),
                });
              }}
            >
              <img
                className="message-reference-avatar"
                src={avatarPreviewURL(message.user)}
              />
              {message.name ? (
                <span
                  className="message-reference-name clickable-text"
                  style={{ color: FormatColor(message.color) }}
                >
                  {"@"}
                  {message.name}
                </span>
              ) : (
                <span
                  className="message-name skeleton"
                  style={{ width: Roll(75, 125) }}
                />
              )}
            </span>{" "}
            <span className="message-reference-content" key={message.content}>
              <SyntaxContent text={message.content} inline />
              {message.content == "" && hasAttachments && (
                <span className="empty">Click to see attachment</span>
              )}
            </span>
            {(hasAttachments || hasEmbeds) && (
              <span className="message-reference-media-icon">
                <FaImage />
              </span>
            )}
          </>
        ) : (
          <>
            <span className="message-reference-avatar">
              <IoClose />
            </span>
            <span className="message-reference-error">
              Original message was deleted
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function MessageReaction({
  id,
  react,
  index,
}: {
  id: Snowflake;
  react: Reaction;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const toggleReaction = getClackState((state) => state.chat.toggleReaction);

  const setReactionTooltipPopup = getClackState(
    (state) => state.gui.setReactionTooltipPopup
  );
  const tooltipTimeout = useRef<number | null>(null);

  function showTooltip() {
    if (tooltipTimeout.current) {
      window.clearTimeout(tooltipTimeout.current);
      tooltipTimeout.current = null;
    }

    tooltipTimeout.current = window.setTimeout(() => {
      if (ref.current == null) return;
      const rect = ref.current.getBoundingClientRect();

      console.log("Showing tooltip for reaction", id, react.emoji);
      setReactionTooltipPopup({
        message: id,
        emoji: react.emoji,
        position: {
          x: (rect.left + rect.right) / 2,
          y: rect.top - 8,
        },
      });
    }, 750);
  }

  function hideTooltip() {
    if (tooltipTimeout.current) {
      window.clearTimeout(tooltipTimeout.current);
      tooltipTimeout.current = null;
    }
    setReactionTooltipPopup(undefined);
  }

  return (
    <div
      ref={ref}
      className={`message-reaction ${react.me ? "you" : ""}`}
      onClick={() => {
        toggleReaction(id, react.emoji);
      }}
      onMouseEnter={(e) => {
        showTooltip();
      }}
      onMouseLeave={(e) => {
        hideTooltip();
      }}
    >
      <Emoji symbol={react.emoji} size={22} />
      <span className="message-reaction-count">{react.count}</span>
    </div>
  );
}

function MessageReactions({ id }: { id: string }) {
  const reactions = useClackState(ClackEvents.reactions(id), (state) => {
    return state.chat.messages.get(id)?.reactions ?? [];
  });

  if (reactions.length == 0) {
    return <></>;
  }

  return (
    <div className="message-reactions">
      {reactions.map((react, index) => (
        <MessageReaction
          key={`${id}-reaction-${index}`}
          id={id}
          react={react}
          index={index}
        />
      ))}
    </div>
  );
}

function MessageContextMenu({
  id,
  position,
  offset,
}: {
  id: string;
  position: { x: number; y: number };
  offset: { x: number; y: number };
}) {
  const contextMenuPopup = useClackState(
    ClackEvents.contextMenuPopup,
    (state) => state.gui.contextMenuPopup
  );
  const setContextMenuPopup = getClackState(
    (state) => state.gui.setContextMenuPopup
  );

  const [yourMessage, permissions, hasReactions] = useClackStateDynamic(
    (state, events) => {
      if (!contextMenuPopup) {
        return [false, 0, false];
      }

      events.push(ClackEvents.current);
      if (!state.chat.currentUser) {
        return [false, 0, false];
      }

      events.push(ClackEvents.message(id));
      const message = state.chat.messages.get(id);
      if (!message) {
        return [false, 0, false];
      }

      events.push(ClackEvents.channel(message.channel));
      events.push(ClackEvents.user(message.author));

      return [
        state.chat.currentUser === message.author,
        state.chat.getPermissions(state.chat.currentUser, message.channel),
        message.reactions && message.reactions.length > 0,
      ];
    },
    [contextMenuPopup]
  );

  const canEditMessage = yourMessage;
  const canManageMessage = (permissions & Permissions.ManageMessages) != 0;
  const canReplyMessage = (permissions & Permissions.SendMessages) != 0;
  const canReactMessage = (permissions & Permissions.AddReactions) != 0;
  const canDeleteMessage = yourMessage || canManageMessage;
  const canPinMessage = canManageMessage;

  const deleteMessage = getClackState((state) => state.chat.deleteMessage);
  const setMessageDeleteModal = getClackState(
    (state) => state.gui.setMessageDeleteModal
  );
  const setReplyingTo = getClackState((state) => state.chat.setReplyingTo);
  const setMessageReactionsModal = getClackState(
    (state) => state.gui.setMessageReactionsModal
  );
  const toggleReaction = getClackState((state) => state.chat.toggleReaction);
  const setEmojiPickerPopup = getClackState(
    (state) => state.gui.setEmojiPickerPopup
  );

  const [showReactionMenu, setShowReactionMenu] = useState(false);

  var flipX = false;
  var flipY = false;

  if (position.x > window.innerWidth - 200) {
    flipX = true;
  }

  if (position.y > window.innerHeight - 350) {
    flipY = true;
  }

  var style = {
    top: undefined,
    left: undefined,
    bottom: undefined,
    right: undefined,
  };
  const x = position.x;
  const y = position.y;
  const ox = offset.x;
  const oy = offset.y;

  if (flipX) {
    style.right = window.innerWidth - x + ox;
  } else {
    style.left = x + ox;
  }

  if (flipY) {
    style.bottom = window.innerHeight - y + oy;
  } else {
    style.top = y + oy;
  }

  function openEmojiPicker() {
    const pickerX = flipX ? x - 16 : x + 16;
    const pickerY = flipY ? y - 16 : y + 16;

    setEmojiPickerPopup({
      position: {
        x: pickerX,
        y: pickerY,
      },
      direction: flipY ? "top" : "bottom",
      onPick: (emojiID: Snowflake) => {
        toggleReaction(id, emojiID);
      },
      onClose: () => {},
    });
    setContextMenuPopup(undefined);
  }

  const default_emojis: string[] = ["thumbsup", "heart", "clap", "fire"];

  return (
    <div
      className={
        "context-menu context-menu" +
        (flipX ? " flip-x" : "") +
        (flipY ? " flip-y" : "")
      }
      style={style}
    >
      {canReactMessage && (
        <div className="context-menu-entry">
          <div
            className="context-menu-entry-wrapper"
            onClick={() => {
              openEmojiPicker();
            }}
          >
            <div className="context-menu-label">Add Reaction</div>
            <div className="context-menu-arrow">
              <IoIosArrowForward />
            </div>
          </div>
          <div className={`context-menu context-menu-submenu`}>
            <div className={`context-menu-submenu-join-area`} />
            {default_emojis.map((name) => {
              const emoji = EmojiLookupName(name);

              return (
                <div
                  key={emoji.id}
                  className="context-menu-entry"
                  onClick={() => {
                    toggleReaction(id, emoji.id);
                    setContextMenuPopup(undefined);
                  }}
                >
                  <div className="context-menu-emoji">
                    <Emoji symbol={emoji.symbol} size={22} />
                  </div>
                  <div className="context-menu-label">
                    {`:${emoji.names[0]}:`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {hasReactions && (
        <div
          className="context-menu-entry"
          onClick={() => {
            setMessageReactionsModal({
              message: id,
            });
            setContextMenuPopup(undefined);
          }}
        >
          <div className="context-menu-label">View Reactions</div>
        </div>
      )}
      <div className="context-menu-divider" />
      {canReplyMessage && (
        <div
          className="context-menu-entry"
          onClick={() => {
            setReplyingTo(id);
            setContextMenuPopup(undefined);
          }}
        >
          <div className="context-menu-label">Reply</div>
        </div>
      )}
      {canEditMessage && (
        <div className="context-menu-entry">
          <div className="context-menu-label">Edit Message</div>
        </div>
      )}
      {canPinMessage && (
        <div className="context-menu-entry">
          <div className="context-menu-label">Pin Message</div>
        </div>
      )}
      <div
        className="context-menu-entry"
        onClick={() => {
          const message = getClackState((state) => state.chat.messages.get(id));
          if (message) {
            navigator.clipboard.writeText(message.content);
          }
          setContextMenuPopup(undefined);
        }}
      >
        <div className="context-menu-label">Copy Text</div>
      </div>
      {canDeleteMessage && (
        <div
          className="context-menu-entry"
          onClick={(e) => {
            if (e.shiftKey) {
              deleteMessage(id);
            } else {
              setMessageDeleteModal({ message: id });
            }
            setContextMenuPopup(undefined);
          }}
        >
          <div className="context-menu-label red">Delete Message</div>
        </div>
      )}
      <div className="context-menu-divider" />
      <div
        className="context-menu-entry"
        onClick={() => {
          navigator.clipboard.writeText(id);
          setContextMenuPopup(undefined);
        }}
      >
        <div className="context-menu-label">Copy ID</div>
      </div>
    </div>
  );
}
function Skeleton({ id }: { id: string }) {
  const rng = new Rand(id.split("-")[1]);
  const row = () => {
    const count = Roll(3, 8, rng);
    var length = 0;
    var bubbles = [];
    for (var i = 0; i < count && length < 500; i++) {
      const bubbleLength = Roll(30, 80, rng);
      bubbles.push(bubbleLength);
      length += bubbleLength;
    }
    return bubbles;
  };

  const hasMedia = Roll(0, 100, rng) < 40;
  const rowCount = Roll(1, 5, rng) + (hasMedia ? 1 : 0);
  const mediaRow = hasMedia ? Roll(1, rowCount, rng) : -1;

  return (
    <div id={id} className="message-entry skeleton">
      <div>
        <div className="message-avatar skeleton" />
        <div className="message-header skeleton">
          <div
            className="message-name skeleton"
            style={{ width: Roll(75, 125, rng) }}
          />
        </div>
        <div className="message-content">
          <div className="message-skeleton">
            {[...Array(rowCount).keys()].map((i: number) => {
              if (i == mediaRow) {
                return (
                  <div
                    key={i}
                    className="message-skeleton-media"
                    style={{
                      width: Roll(150, 400, rng),
                      height: Roll(150, 400, rng),
                    }}
                  />
                );
              } else {
                return (
                  <div key={i} className="message-skeleton-row">
                    {row().map((ln: number, i: number) => (
                      <div
                        key={i}
                        className="message-skeleton-bubble"
                        style={{ width: ln }}
                      />
                    ))}
                  </div>
                );
              }
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
