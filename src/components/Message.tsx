import {
  GetChatStateLookups,
  useChatState,
  useChatStateShallow,
} from "../state";

import { useEffect, useRef, useState, useMemo } from "react";

import { SyntaxContent, EmojiContent } from "../syntax";

import {
  Attachment,
  AttachmentType,
  Embed,
  EmbedType,
  Permissions,
} from "../models";

import { VideoDisplay, ImageDisplay } from "./Media";

import { RiReplyFill, RiEmotionFill, RiMoreFill } from "react-icons/ri";

import { IoMdCreate } from "react-icons/io";

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
import { MarkdownTextbox, MarkdownTextboxRef } from "./Input";

import { FaFile, FaTimes } from "react-icons/fa";

import Rand from "rand-seed";
import { IconButton, TooltipWrapper } from "./Common";
import { set } from "date-fns";

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
  const message = useChatStateShallow((state) => {
    const m = state.gateway.messages.get(id);
    if (!m) return undefined;

    const a = state.gateway.users.get(m.author);
    const p = state.gateway.pendingMessages.has(id);
    const c = state.gateway.currentMessagesIsCombined.get(id)!;
    const r = state.gateway.currentReplyingTo;

    var u = false;
    if (p) {
      const pending = state.gateway.pendingMessages.get(id);
      u = (pending?.attachments?.length ?? 0) > 0;
    }

    //const anchor = state.gateway.getAnchor();
    return {
      ...m,
      //anchor: anchor == id,
      user: a,
      name: a?.nickname ?? a?.username,
      color: a?.color,
      pending: p,
      uploading: u,
      combined: c,
      replying: r == id,
      you: a?.id == state.gateway.currentUser,
      permissions: state.gateway.getPermissions(
        state.gateway.currentUser!,
        m.channel
      ),
    };
  });

  const ref = useRef<HTMLDivElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const editedValue = useRef<string | undefined>();
  const isEdited = editedValue.current !== undefined;
  const updateMessage = useChatState((state) => state.updateMessage);

  useEffect(() => {
    editedValue.current = undefined;
  }, [message?.editedTimestamp]);

  const setViewerModal = useChatState((state) => state.setViewerModal);
  const setUserPopup = useChatState((state) => state.setUserPopup);
  const setContextMenuPopup = useChatState(
    (state) => state.setContextMenuPopup
  );
  const setReplyingTo = useChatState((state) => state.setReplyingTo);

  const contextMenu = useChatState((state) => {
    return state.contextMenuPopup;
  });

  const hasContextMenu = contextMenu?.message == id;
  const isCombined = !standalone && (message?.combined ?? false);
  const isReplying = message?.replying ?? false;

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

  const permissions = message?.permissions ?? 0;

  const canReply = (permissions & Permissions.SendMessages) != 0;
  const canReact = (permissions & Permissions.AddReactions) != 0;
  const canEdit = message?.you;

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
              className="message-actions-button row"
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
              className="message-actions-button row"
              onClick={() => {}}
            >
              <RiEmotionFill />
            </IconButton>
          )}

          <IconButton
            tooltip="More"
            tooltipDirection="top"
            className={`message-actions-button row ${
              hasContextMenu && contextMenu.static ? "active" : ""
            }`}
            onClick={(rect) => {
              if (hasContextMenu) {
                setContextMenuPopup(undefined);
              } else {
                setContextMenuPopup({
                  message: id,
                  direction: "right",
                  position: {
                    x: rect.right + 8,
                    y: rect.top - 2,
                  },
                  static: true,
                });
              }
            }}
          >
            <RiMoreFill />
          </IconButton>
        </div>
      </div>
    );
  }, [hasContextMenu, isEditing]);

  if (message === undefined) {
    return <></>;
  }

  function doView(index: number) {
    setViewerModal({
      index: index,
      items: [...message!.attachments!],
    });
  }

  const timestamp = new Date(message.timestamp);

  const color = FormatColor(message.color);

  const className =
    "message-entry" +
    (isCombined ? " combined" : "") +
    (message?.pending ? " pending" : "") +
    (hasContextMenu ? " active" : "") +
    (isEditing ? " editing" : "") +
    (isReplying ? " replying" : "");
  //(message?.anchor ? " anchor" : "");

  var header = (
    <>
      <img className="message-avatar clickable-button" src="/avatar.png" />
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
                user: message.user,
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
        >
          {message?.name ?? id}
        </span>
        <TooltipWrapper tooltip={FormatDateTimeLong(timestamp)} delay={1000}>
          <span className="message-timestamp">{FormatDateTime(timestamp)}</span>
        </TooltipWrapper>
      </div>
    </>
  );

  var attachmentGroups: { attachments: Attachment[]; className: string }[] = [];

  if (message.attachments) {
    if (message.attachments.length == 1) {
      attachmentGroups = [
        { attachments: [...message.attachments], className: "group-1" },
      ];
    } else if (message.attachments.length == 2) {
      attachmentGroups = [
        { attachments: [...message.attachments], className: "group-2" },
      ];
    } else if (message.attachments.length == 3) {
      attachmentGroups = [
        { attachments: [...message.attachments], className: "group-3" },
      ];
    } else {
      var i = message.attachments.length % 3;

      if (i != 0) {
        if (i == 1) {
          attachmentGroups.push({
            attachments: message.attachments.slice(0, 2),
            className: "row-2",
          });
          attachmentGroups.push({
            attachments: message.attachments.slice(2, 4),
            className: "row-2",
          });
          i = 4;
        } else {
          attachmentGroups.push({
            attachments: message.attachments.slice(0, i),
            className: "row-" + i,
          });
        }
      }

      for (; i < message.attachments.length; i += 3) {
        attachmentGroups.push({
          attachments: message.attachments.slice(i, i + 3),
          className: "row-3",
        });
      }
    }
  }

  const hasAttachments = attachmentGroups.length > 0;
  const hasEmbeds = message.embeds ? true : false;
  const hasUploading = message.uploading;
  const isEmbedding = message.embeddableURLs?.length ?? 0 > 0;

  const hasAccessories =
    hasAttachments || hasEmbeds || hasUploading || isEmbedding;

  return (
    <div
      id={id}
      ref={ref}
      className={className}
      onContextMenu={(e) => {
        if (isInsideSelection(e)) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        if (hasContextMenu) {
          return;
        }

        setContextMenuPopup({
          message: id,
          direction: "right",
          position: { x: e.clientX, y: e.clientY },
          static: false,
        });
      }}
    >
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
          {attachmentGroups.length > 0 && (
            <div className="message-attachments">
              {attachmentGroups.map((group, index) => (
                <div
                  key={`${id}-attachment-group-${index}`}
                  className={"message-attachment-group " + group.className}
                >
                  {group.attachments.map((attachment, index) => (
                    <MessageAttachment
                      attachmentIndex={message.attachments!.indexOf(attachment)}
                      attachmentCount={message.attachments!.length}
                      key={`${id}-attachment-${index}`}
                      attachment={attachment}
                      onView={() => {
                        doView(index);
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
          {message.embeds && (
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
          {message.uploading && <MessageUpload id={id} />}
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
  const autocompleteRef = useRef<AutocompleteRef>(null);
  const textboxRef = useRef<MarkdownTextboxRef>(null);

  return (
    <>
      <Autocomplete
        ref={autocompleteRef}
        onComplete={(word: string, completion: string) => {
          if (textboxRef.current) {
            textboxRef.current.complete(word, completion);
          }
        }}
      />
      <div
        className="message-editor-textbox"
        onKeyDown={(e) => {
          autocompleteRef.current?.onKeyDown(e);
        }}
      >
        <MarkdownTextbox
          ref={textboxRef}
          value={content}
          onValue={(text: string, cursor: number) => {
            autocompleteRef.current?.onValue(text, cursor);
            setContent(text);
          }}
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
  const cancel = useChatState((state) => state.cancelMessage);

  const pending = useChatStateShallow((state) => {
    return state.gateway.pendingMessages.get(id);
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
    var first = pending.attachments[0];
    icon = GetFileIcon(first.filename, first.type);
    if (pending.attachments.length == 1) {
      text = pending.attachments[0].filename;
    } else {
      text = `Uploading ${pending.attachments.length} files...`;
    }
  }

  return (
    <div className="message-upload">
      <div className="message-upload-icon">{icon}</div>
      <div className="message-upload-content">
        <div className="message-upload-text">
          {text}
          <div className="message-upload-size">
            {` – ${FormatBytes(pending?.size)}`}
          </div>
        </div>

        <div className="message-upload-progress">
          <div
            className="message-upload-progress-bar"
            style={{
              width: `${pending?.progress ?? 0}%`,
            }}
          />
        </div>
      </div>
      <IconButton
        tooltip="Cancel"
        tooltipDirection="top"
        className="message-upload-cancel"
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
  const setViewerModal = useChatState((state) => state.setViewerModal);

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
                items: [{ ...embed.thumbnail, type: embed.thumbnail.type! }],
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
                  items: [{ ...embed.image, type: embed.image.type! }],
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

function MessageAttachment({
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
    inner = (
      <ImageDisplay
        src={attachment.previewURL!}
        preload={attachment.preload}
        onClick={onView}
      />
    );
  } else if (attachment.type == AttachmentType.Video) {
    inner = (
      <VideoDisplay
        src={attachment.originalURL!}
        poster={attachment.previewURL!}
        preload={attachment.preload}
        showCover={true}
        showTimestamps={attachment.width > 0.8 * attachment.height}
        onClick={() => {
          if (attachmentIndex == 0 && attachmentCount == 1) {
            return true;
          } else {
            onView();
            return false;
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

function Skeleton({ id }: { id: string }) {
  const gen = new Rand(id.split("-")[1]);
  const row = () => {
    const count = Roll(3, 8, gen);
    var length = 0;
    var bubbles = [];
    for (var i = 0; i < count && length < 500; i++) {
      const bubbleLength = Roll(30, 80, gen);
      bubbles.push(bubbleLength);
      length += bubbleLength;
    }
    return bubbles;
  };

  const hasMedia = Roll(0, 100, gen) < 40;
  const rowCount = Roll(1, 5, gen) + (hasMedia ? 1 : 0);
  const mediaRow = hasMedia ? Roll(1, rowCount, gen) : -1;

  return (
    <div id={id} className="message-entry skeleton">
      <div>
        <div className="message-avatar skeleton" />
        <div className="message-header skeleton">
          <div
            className="message-name skeleton"
            style={{ width: Roll(75, 125, gen) }}
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
                      width: Roll(150, 400, gen),
                      height: Roll(150, 400, gen),
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
