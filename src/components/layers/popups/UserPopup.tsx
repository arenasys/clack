import { useEffect, useState, useRef } from "react";
import {
  useClackState,
  getClackState,
  ClackEvents,
  useClackStateDynamic,
} from "../../../state";
import { UserAvatarBigSVG, UserContextMenuRoles } from "../../Users";
import {
  DefaultUserColor,
  User,
  Permissions,
  HasPermission,
} from "../../../types";
import { EmojiContent, SyntaxContent } from "../../../syntax";

import { FormatColor, NeedsDarkForeground } from "../../../util";
import { ClickWrapper, IconButton, TooltipWrapper } from "../../Common";

import { IoClose } from "react-icons/io5";
import { IoMdAdd, IoMdClose } from "react-icons/io";
import { ImCross } from "react-icons/im";

const MAX_CARD_HEIGHT = 500;

export default function UserPopup() {
  const userPopup = useClackState(
    ClackEvents.userPopup,
    (state) => state.gui.userPopup
  );
  const setUserPopup = getClackState((state) => state.gui.setUserPopup);
  const deleteUserRole = getClackState((state) => state.chat.deleteUserRole);
  const setContextMenuPopup = getClackState(
    (state) => state.gui.setContextMenuPopup
  );

  const userID = userPopup?.id || "";

  const [user, userRoles] = useClackStateDynamic(
    (state, events) => {
      if (userPopup == undefined) {
        return [undefined, []];
      }
      events.push(ClackEvents.user(userPopup.id));
      events.push(ClackEvents.roleList);

      var user = state.chat.users.get(userPopup.id);
      var roles = state.chat.roles.getAll();
      var userRoles = roles.filter((role) => user?.roles.includes(role.id));
      return [user, userRoles];
    },
    [userID]
  );

  const [you, youPermissions] = useClackStateDynamic(
    (state, events) => {
      if (userPopup == undefined) {
        return [undefined, 0];
      }
      events.push(ClackEvents.user(state.chat.currentUser));

      var user = state.chat.users.get(state.chat.currentUser);
      var permissions = state.chat.getPermissions(
        state.chat.currentUser,
        undefined
      );
      return [user, permissions];
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

  var hasManageRoles = HasPermission(youPermissions, Permissions.ManageRoles);
  var canManageRoles = hasManageRoles && user.rank > you.rank;

  return (
    <ClickWrapper
      passthrough={true}
      onClick={() => {
        if (userPopup == undefined) {
          return;
        }
        if (getClackState((state) => state.gui.userPopup)?.id == userPopup.id) {
          console.log("Close user popup");
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
            <UserPopupContainer user={user}>
              <div className="user-popup-roles">
                {userRoles.map((role) => {
                  var canRemove = canManageRoles && role.position > you.rank;

                  if (canRemove) {
                    return (
                      <TooltipWrapper
                        key={role.id}
                        tooltip="Remove Role"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          deleteUserRole(user.id, role.id);
                        }}
                      >
                        <div className="user-popup-role removable">
                          <span
                            className="user-popup-role-color"
                            style={{
                              backgroundColor: FormatColor(role.color),
                            }}
                          >
                            <IoMdClose />
                          </span>
                          <span className="user-popup-role-name">
                            {role.name}
                          </span>
                        </div>
                      </TooltipWrapper>
                    );
                  } else {
                    return (
                      <div key={role.id} className="user-popup-role">
                        <span
                          className="user-popup-role-color"
                          style={{
                            backgroundColor: FormatColor(role.color),
                          }}
                        />
                        <span className="user-popup-role-name">
                          {role.name}
                        </span>
                      </div>
                    );
                  }
                })}
                {canManageRoles && (
                  <IconButton
                    className="user-popup-role-add-button"
                    tooltip="Add Role"
                    onClick={(rect) => {
                      var style = {
                        top: rect.bottom + 2,
                        left: rect.left,
                      };

                      setContextMenuPopup({
                        type: "user-roles",
                        id: user.id,
                        content: (
                          <div
                            data-allow-click
                            className="context-menu"
                            style={style}
                          >
                            <UserContextMenuRoles userID={user.id} />
                          </div>
                        ),
                      });
                    }}
                  >
                    <IoMdAdd />
                  </IconButton>
                )}
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
