import { useEffect, useState, useRef } from "react";
import {
  useClackState,
  getClackState,
  ClackEvents,
  useClackStateDynamic,
} from "../../../state";
import { UserAvatarBigSVG } from "../../Users";

import { IoMdCreate, IoIosArrowForward } from "react-icons/io";

import { FormatColor } from "../../../util";
import { ClickWrapper } from "../../Common";
import { UserPopupContainer } from "./UserPopup";
import { UserPresenceIcon } from "../../Users";
import { UserPresence } from "../../../types";

export default function YouPopup() {
  const setYouPopup = getClackState((state) => state.gui.setYouPopup);
  const youPopup = useClackState(
    ClackEvents.youPopup,
    (state) => state.gui.youPopup
  );

  const [showingPresenceMenu, setShowingPresenceMenu] = useState(false);

  const currentUser = useClackStateDynamic((state, keys) => {
    keys.push(ClackEvents.current);
    if (!state.chat.currentUser) {
      return undefined;
    }
    keys.push(ClackEvents.user(state.chat.currentUser));
    return state.chat.users.get(state.chat.currentUser);
  });

  if (youPopup == undefined) {
    return <></>;
  }

  return (
    <ClickWrapper
      passthrough={false}
      onClick={() => {
        if (youPopup == undefined) {
          return;
        }
        setYouPopup(undefined);
      }}
    >
      <div className="layer-container layer-popup">
        <div
          className={`you-popup-anchor`}
          style={{
            top: youPopup.position.y,
            left: youPopup.position.x,
          }}
        >
          <div className="you-popup">
            <UserPopupContainer user={currentUser}>
              <div className="you-controls">
                <div className="you-controls-panel">
                  <div className="you-controls-button clickable-button">
                    <IoMdCreate className="you-controls-button-icon" />
                    Edit Profile
                  </div>
                  <div className="you-controls-seperator" />
                  <div
                    className="you-controls-button clickable-button"
                    onMouseEnter={() => setShowingPresenceMenu(true)}
                    onMouseLeave={() => setShowingPresenceMenu(false)}
                  >
                    <div className="you-controls-button-icon">
                      <UserPresenceIcon
                        presence={currentUser.presence}
                        className="you-controls-presence-icon"
                      />
                    </div>
                    Online
                    <IoIosArrowForward className="you-controls-button-arrow" />
                    {showingPresenceMenu && (
                      <>
                        <div className="you-controls-presence-menu-gap"></div>
                        <div className="you-controls-presence-menu context-menu">
                          <div className="context-menu-entry">
                            <div className="context-menu-icon">
                              <UserPresenceIcon
                                presence={UserPresence.Online}
                                className="you-controls-presence-menu-icon"
                              />
                            </div>
                            <div className="context-menu-label">Online</div>
                          </div>
                          <div className="context-menu-divider"></div>
                          <div className="context-menu-entry">
                            <div className="context-menu-icon">
                              <UserPresenceIcon
                                presence={UserPresence.Away}
                                className="you-controls-presence-menu-icon"
                              />
                            </div>
                            <div className="context-menu-label">Away</div>
                          </div>
                          <div className="context-menu-entry">
                            <div className="context-menu-icon">
                              <UserPresenceIcon
                                presence={UserPresence.DontDisturb}
                                className="you-controls-presence-menu-icon"
                              />
                            </div>
                            <div className="context-menu-label">
                              Do Not Disturb
                            </div>
                          </div>
                          <div className="context-menu-entry">
                            <div className="context-menu-icon">
                              <UserPresenceIcon
                                presence={UserPresence.Offline}
                                className="you-controls-presence-menu-icon"
                              />
                            </div>
                            <div className="context-menu-label">Offline</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </UserPopupContainer>
          </div>
        </div>
      </div>
    </ClickWrapper>
  );
}
