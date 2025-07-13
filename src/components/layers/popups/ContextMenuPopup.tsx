import {
  useClackState,
  getClackState,
  ClackEvents,
  useClackStateDynamic,
} from "../../../state";
import { IoIosArrowForward } from "react-icons/io";

import { Permissions } from "../../../types";

import { ClickWrapper } from "../../Common";

export default function ContextMenuPopup() {
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

      events.push(ClackEvents.message(contextMenuPopup.message));
      const message = state.chat.messages.get(contextMenuPopup.message);
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

  if (contextMenuPopup == undefined) {
    return <></>;
  }

  var flipX = false;
  var flipY = false;

  if (contextMenuPopup.position.x > window.innerWidth - 200) {
    flipX = true;
  }

  if (contextMenuPopup.position.y > window.innerHeight - 350) {
    flipY = true;
  }

  var position = {
    top: undefined,
    left: undefined,
    bottom: undefined,
    right: undefined,
  };
  const x = contextMenuPopup.position.x;
  const y = contextMenuPopup.position.y;
  const ox = contextMenuPopup.offset.x;
  const oy = contextMenuPopup.offset.y;

  if (flipX) {
    position.right = window.innerWidth - x + ox;
  } else {
    position.left = x + ox;
  }

  if (flipY) {
    position.bottom = window.innerHeight - y + oy;
  } else {
    position.top = y + oy;
  }

  return (
    <ClickWrapper
      passthrough={true}
      onClick={() => {
        setContextMenuPopup(undefined);
      }}
    >
      <div
        className={
          "context-menu context-menu" +
          (flipX ? " flip-x" : "") +
          (flipY ? " flip-y" : "") +
          (contextMenuPopup.static ? " static" : "")
        }
        style={position}
      >
        {canReactMessage && (
          <div className="context-menu-entry">
            <div className="context-menu-label">Add Reaction</div>
            <div className="context-menu-arrow">
              <IoIosArrowForward />
            </div>
          </div>
        )}
        {hasReactions && (
          <div
            className="context-menu-entry"
            onClick={() => {
              setMessageReactionsModal({
                message: contextMenuPopup.message,
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
              setReplyingTo(contextMenuPopup.message);
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
            const message = getClackState((state) =>
              state.chat.messages.get(contextMenuPopup.message)
            );
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
                deleteMessage(contextMenuPopup.message);
              } else {
                setMessageDeleteModal({ message: contextMenuPopup.message });
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
            navigator.clipboard.writeText(contextMenuPopup.message);
            setContextMenuPopup(undefined);
          }}
        >
          <div className="context-menu-label">Copy ID</div>
        </div>
      </div>
    </ClickWrapper>
  );
}
