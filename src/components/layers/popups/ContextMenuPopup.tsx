import { useChatState, useChatStateShallow } from "../../../state";
import { IoIosArrowForward } from "react-icons/io";

import { Permissions } from "../../../models";

import { ClickWrapper } from "../../Common";

export default function ContextMenuPopup() {
  const contextMenuPopup = useChatState((state) => state.contextMenuPopup);
  const setContextMenuPopup = useChatState(
    (state) => state.setContextMenuPopup
  );

  const [yourMessage, permissions] = useChatStateShallow((state) => {
    if (contextMenuPopup == undefined) return [false, 0];
    if (state.gateway.currentUser === undefined) return [false, 0];

    const message = state.gateway.messages.get(contextMenuPopup.message);
    if (message == undefined) return [false, 0];

    return [
      state.gateway.currentUser == message.author,
      state.gateway.getPermissions(state.gateway.currentUser, message.channel),
    ];
  });

  const canEditMessage = yourMessage;
  const canManageMessage = (permissions & Permissions.ManageMessages) != 0;
  const canReplyMessage = (permissions & Permissions.SendMessages) != 0;
  const canReactMessage = (permissions & Permissions.AddReactions) != 0;
  const canDeleteMessage = yourMessage || canManageMessage;
  const canPinMessage = canManageMessage;

  const deleteMessage = useChatState((state) => state.deleteMessage);
  const setMessageDeleteModal = useChatState(
    (state) => state.setMessageDeleteModal
  );

  const setReplyingTo = useChatState((state) => state.setReplyingTo);

  if (contextMenuPopup == undefined) {
    return <></>;
  }

  var flip = false;
  if (
    contextMenuPopup.direction == "right" &&
    contextMenuPopup.position.y > window.innerHeight - 350
  ) {
    flip = true;
  }

  return (
    <ClickWrapper
      passthrough={true}
      onClick={() => {
        console.log("CLOSING MENU");
        setContextMenuPopup(undefined);
      }}
    >
      <div
        className={
          "context-menu context-menu-" +
          contextMenuPopup.direction +
          (flip ? " flip" : "") +
          (contextMenuPopup.static ? " static" : "")
        }
        style={{
          top: contextMenuPopup.position.y,
          left: contextMenuPopup.position.x,
        }}
      >
        {canReactMessage && (
          <div className="context-menu-entry">
            <div className="context-menu-label">Add Reaction</div>
            <div className="context-menu-arrow">
              <IoIosArrowForward />
            </div>
          </div>
        )}
        <div className="context-menu-entry">
          <div className="context-menu-label">View Reactions</div>
        </div>
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
        <div className="context-menu-entry">
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
        <div className="context-menu-entry">
          <div className="context-menu-label">Copy ID</div>
        </div>
      </div>
    </ClickWrapper>
  );
}
