import { useEffect } from "react";
import { useChatState, useChatStateShallow } from "../../../state";
import { UserAvatarBigSVG } from "../../Users";

import { FormatColor } from "../../../util";

export default function TooltipLayer() {
  const userPopup = useChatState((state) => state.userPopup);
  const setUserPopup = useChatState((state) => state.setUserPopup);

  const userRoles = useChatStateShallow((state) =>
    state.gateway.roles.getRoles(state.userPopup?.user.roles ?? [])
  );

  function onClick(e: MouseEvent) {
    if (userPopup == undefined) {
      return;
    }
    if (e.target instanceof HTMLElement) {
      if (
        e.target.closest(".user-popup") == null &&
        e.target.closest(".user-entry") == null
      ) {
        setUserPopup(undefined);
      }
    }
  }

  useEffect(() => {
    document.removeEventListener("click", onClick);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
    };
  }, [userPopup]);

  if (userPopup == undefined) {
    return <></>;
  }

  return (
    <div className="layer-container layer-popup">
      <div
        className={"user-popup user-popup-" + userPopup.direction}
        style={{
          top: userPopup.position.y,
          left: userPopup.position.x,
        }}
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
              <h1 className="user-popup-nickname">{userPopup.user.nickname}</h1>
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
  );
}
