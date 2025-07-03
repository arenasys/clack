import { useEffect, useState, useRef } from "react";
import {
  useClackState,
  getClackState,
  ClackEvents,
  useClackStateDynamic,
} from "../../../state";
import { UserAvatarBigSVG } from "../../Users";

import { FormatColor } from "../../../util";
import { ClickWrapper } from "../../Common";

export default function UserPopup() {
  const ref = useRef<HTMLDivElement>(null);
  const userPopup = useClackState(
    ClackEvents.userPopup,
    (state) => state.gui.userPopup
  );
  const setUserPopup = getClackState((state) => state.gui.setUserPopup);

  const userRoleIDs = userPopup?.user.roles ?? [];
  const userRoles = useClackStateDynamic((state, events) => {
    events.push(...userRoleIDs.map((id) => ClackEvents.role(id)));
    return state.chat.roles.getRoles(userRoleIDs);
  });

  if (userPopup == undefined) {
    return <></>;
  }

  var flip = false;
  if (userPopup.direction == "left" && userPopup.position.y < 300) {
    flip = true;
  }
  if (
    userPopup.direction == "right" &&
    userPopup.position.y > window.innerHeight - 300
  ) {
    flip = true;
  }

  return (
    <ClickWrapper
      passthrough={true}
      onClick={() => {
        if (userPopup == undefined) {
          return;
        }
        setUserPopup(undefined);
      }}
    >
      <div className="layer-container layer-popup">
        <div
          ref={ref}
          className={
            "user-popup user-popup-" +
            userPopup.direction +
            (flip ? " flip" : "")
          }
          style={
            userPopup.direction === "left"
              ? {
                  bottom: userPopup.position.y,
                  right: userPopup.position.x,
                }
              : {
                  top: userPopup.position.y,
                  left: userPopup.position.x,
                }
          }
        >
          <div className="user-popup-content">
            <div className="user-popup-header">
              <div className="user-popup-banner"></div>
              <div className="user-popup-avatar">
                <UserAvatarBigSVG user={userPopup.user} size={100} />
              </div>
            </div>
            <div className="user-popup-body">
              <div>
                <h1 className="user-popup-nickname">
                  {userPopup.user.nickname}
                </h1>
                <span className="user-popup-username">
                  {userPopup.user.username}
                </span>
              </div>
              <div className="user-popup-roles">
                {userRoles.map((role) => {
                  return (
                    <div key={role.id} className="user-popup-role">
                      <span
                        className="user-popup-role-color"
                        style={{ backgroundColor: FormatColor(role.color) }}
                      />
                      <span className="user-popup-role-name">{role.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="user-popup-footer"></div>
          </div>
        </div>
      </div>
    </ClickWrapper>
  );
}
