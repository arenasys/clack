import { useChatState, useChatStateShallow } from "../../../state";
import { IoIosArrowForward } from "react-icons/io";

import { ClickWrapper } from "../../Common";

export default function ContextMenuLayer() {
  const contextMenuPopup = useChatState((state) => state.contextMenuPopup);
  const setContextMenuPopup = useChatState(
    (state) => state.setContextMenuPopup
  );

  if (contextMenuPopup == undefined) {
    return <></>;
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
        className={"context-menu context-menu-" + contextMenuPopup.direction}
        style={{
          top: contextMenuPopup.position.y,
          left: contextMenuPopup.position.x,
        }}
      >
        <div className="context-menu-entry">
          <div className="context-menu-label">Add Reaction</div>
          <div className="context-menu-arrow">
            <IoIosArrowForward />
          </div>
        </div>
        <div className="context-menu-entry">
          <div className="context-menu-label">View Reactions</div>
        </div>
        <div className="context-menu-divider" />
        <div className="context-menu-entry">
          <div className="context-menu-label">Reply</div>
        </div>
        <div className="context-menu-entry">
          <div className="context-menu-label">Edit Message</div>
        </div>
        <div className="context-menu-entry">
          <div className="context-menu-label">Pin Message</div>
        </div>
        <div className="context-menu-entry">
          <div className="context-menu-label">Copy Text</div>
        </div>
        <div className="context-menu-entry">
          <div className="context-menu-label red">Delete Message</div>
        </div>
        <div className="context-menu-divider" />
        <div className="context-menu-entry">
          <div className="context-menu-label">Copy ID</div>
        </div>
      </div>
    </ClickWrapper>
  );
}
