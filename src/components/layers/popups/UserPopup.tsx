import { useEffect, useState, useRef } from "react";
import {
  useClackState,
  getClackState,
  ClackEvents,
  useClackStateDynamic,
} from "../../../state";
import { UserAvatarBigSVG } from "../../Users";
import { DefaultUserColor, User } from "../../../types";
import { EmojiContent, SyntaxContent } from "../../../syntax";

import { FormatColor } from "../../../util";
import { ClickWrapper } from "../../Common";

const MAX_CARD_HEIGHT = 500;

export default function UserPopup() {
  const userPopup = useClackState(
    ClackEvents.userPopup,
    (state) => state.gui.userPopup
  );
  const setUserPopup = getClackState((state) => state.gui.setUserPopup);

  const userRoleIDs = userPopup?.user.roles ?? [];
  const userRoles = useClackStateDynamic(
    (state, events) => {
      events.push(...userRoleIDs.map((id) => ClackEvents.role(id)));
      return state.chat.roles.getRoles(userRoleIDs);
    },
    [userPopup]
  );

  if (userPopup == undefined) {
    return <></>;
  }

  var flip = false;
  if (userPopup.direction == "left" && userPopup.position.y < MAX_CARD_HEIGHT) {
    flip = true;
  }
  if (
    userPopup.direction == "right" &&
    userPopup.position.y > window.innerHeight - MAX_CARD_HEIGHT
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
        if (getClackState((state) => state.gui.userPopup)?.id == userPopup.id) {
          setUserPopup(undefined);
        }
      }}
    >
      <div className="layer-container layer-popup">
        <div
          key={userPopup.id}
          className={`user-popup-anchor user-popup-anchor-${userPopup.direction}`}
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
          <div
            className={
              "user-popup user-popup-" +
              userPopup.direction +
              (flip ? " flip" : "")
            }
          >
            <UserPopupContainer user={userPopup.user}>
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
            </UserPopupContainer>
          </div>
        </div>
      </div>
    </ClickWrapper>
  );
}

export function UserPopupContainer({
  user,
  children,
}: {
  user: User;
  children?: React.ReactNode;
}) {
  const profileColor = FormatColor(
    user.profileColor < 0 ? DefaultUserColor : user.profileColor
  );
  return (
    <div className="user-popup-container">
      <div className="user-popup-header">
        <div
          className="user-popup-banner"
          style={{ backgroundColor: profileColor }}
        ></div>
        <div className="user-popup-avatar">
          <UserAvatarBigSVG user={user} size={100} />
        </div>
      </div>
      <div className="user-popup-body">
        <div className="user-popup-names">
          <div className="user-popup-display-name">{user.displayName}</div>
          <div className="user-popup-user-name">{user.userName}</div>
        </div>
        {user.statusMessage && (
          <div className="user-popup-status-message">
            <EmojiContent text={user.statusMessage} />
          </div>
        )}
        {user.profileMessage && (
          <>
            <div className="user-popup-seperator" />
            <div className="user-popup-label">About Me</div>
            <div className="user-popup-profile-message">
              <SyntaxContent text={user.profileMessage} />
            </div>
          </>
        )}
        {children}
        <div className="user-popup-footer"></div>
      </div>
    </div>
  );
}
