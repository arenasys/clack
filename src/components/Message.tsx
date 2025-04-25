import { useChatState, useChatStateShallow } from "../state";

import { useEffect, useRef, useState, useMemo } from "react";

import { markdownToReact } from "../markdown";

import { Attachment, FileType, Embed, EmbedType } from "../models";

import { VideoDisplay, ImageDisplay } from "./Media";

import { FormatDateTime, FormatTime, FormatColor } from "../util";

import _ from "underscore";
import Rand from "rand-seed";

export function MessageEntry({ id }: { id: string }) {
  if (id.startsWith("skeleton")) {
    return <Skeleton id={id} />;
  } else {
    return <Message id={id} />;
  }
}

function Message({ id }: { id: string }) {
  const message = useChatStateShallow((state) => {
    const m = state.gateway.messages.get(id)!;
    const a = state.gateway.users.get(m.author);
    const p = state.gateway.pendingMessages.has(id);
    const c = state.gateway.currentMessagesIsCombined.get(id)!;
    //const anchor = state.gateway.getAnchor();
    return {
      ...m,
      //anchor: anchor == id,
      name: a?.nickname ?? a?.username,
      color: a?.color,
      pending: p,
      combined: c,
    };
  });

  //console.log("MESSAGE", id, message);

  const setViewerModal = useChatState((state) => state.setViewerModal);

  function doView(index: number) {
    setViewerModal({
      index: index,
      items: [...message.attachments!],
    });
  }

  const timestamp = new Date(message.timestamp);

  const color = FormatColor(message.color);

  const className =
    "message-entry" +
    (message?.combined ? " combined" : "") +
    (message?.pending ? " pending" : ""); //+
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
        >
          {message?.name ?? id}
        </span>
        <span className="message-timestamp">{FormatDateTime(timestamp)}</span>
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

  const messageContent = useMemo(() => {
    return markdownToReact(message?.content ?? "");
  }, [message?.edited_timestamp]);

  return (
    <div id={id} className={className}>
      {!message?.combined && header}
      {message?.combined && (
        <div className="message-timestamp-inline">{FormatTime(timestamp)}</div>
      )}
      <div className="message-content">{messageContent}</div>
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
      </div>
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
        {embed.provider.name}
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
        {embed.author.name}
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
        {embed.title}
      </a>
    );
  }

  if (embed.description) {
    inner.push(
      <div className="embed-description" key="embed-description">
        {embed.description}
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
              }, _.random(400) + 100);
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
  if (attachment.type == FileType.Image) {
    inner = (
      <ImageDisplay
        src={attachment.previewURL!}
        preload={attachment.preload}
        onClick={onView}
      />
    );
  } else if (attachment.type == FileType.Video) {
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

function Skeleton({ id }: { id: string }) {
  const gen = new Rand(id.split("-")[1]);
  const rng = (min: number, max: number) => {
    return Math.floor(gen.next() * (max - min)) + min;
  };
  const row = () => {
    const count = rng(3, 8);
    var length = 0;
    var bubbles = [];
    for (var i = 0; i < count && length < 500; i++) {
      const bubbleLength = rng(30, 80);
      bubbles.push(bubbleLength);
      length += bubbleLength;
    }
    return bubbles;
  };

  const hasMedia = rng(0, 100) < 40;
  const rowCount = rng(1, 5) + (hasMedia ? 1 : 0);
  const mediaRow = hasMedia ? rng(1, rowCount) : -1;

  return (
    <div id={id} className="message-entry skeleton">
      <div>
        <div className="message-avatar skeleton" />
        <div className="message-header skeleton">
          <div
            className="message-name skeleton"
            style={{ width: rng(75, 125) }}
          />
        </div>
        <div className="message-content">
          <div className="message-skeleton">
            {_.range(0, rowCount).map((i: number) => {
              if (i == mediaRow) {
                return (
                  <div
                    key={i}
                    className="message-skeleton-media"
                    style={{ width: rng(150, 400), height: rng(150, 400) }}
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
