import {
  useClackState,
  getClackState,
  ClackEvents,
  useClackStateDynamic,
} from "../state";
import { FormatColor } from "../util";

import { useEffect, useRef } from "react";

import { User, UserPresence, Role, Permissions, HasPermission } from "../types";
import { EmojiContent, SyntaxContent } from "../syntax";
import Rand from "rand-seed";

import List from "./List";
import { avatarDisplayURL, avatarPreviewURL } from "../state/chat";
import { IoMdPricetag, IoMdCheckmark, IoIosArrowForward } from "react-icons/io";

const userEntryHeight = 45;
const userGroupHeight = 41;

const maskAvatar = (
  <>
    <rect
      fill="white"
      x="0"
      y="0"
      width="40"
      height="40"
      rx="20"
      ry="20"
    ></rect>
  </>
);

const maskAvatarPresence = (
  <>
    <rect
      fill="white"
      x="0"
      y="0"
      width="40"
      height="40"
      rx="20"
      ry="20"
    ></rect>
    <circle fill="black" cx="34" cy="34" r="10"></circle>
  </>
);

const maskAvatarPresenceBig = (
  <>
    <rect
      fill="white"
      x="0"
      y="0"
      width="40"
      height="40"
      rx="20"
      ry="20"
    ></rect>
    <circle fill="black" cx="34" cy="34" r="7"></circle>
  </>
);

const maskNone = <circle fill="white" cx="6" cy="6" r="3" />;
const maskOnline = <circle cx="6" cy="6" r="6" fill="#fff" />;
const maskOffline = (
  <>
    <circle fill="white" cx="6" cy="6" r="6"></circle>
    <circle fill="black" cx="6" cy="6" r="3"></circle>
  </>
);
const maskAway = (
  <>
    <circle fill="white" cx="6" cy="6" r="6"></circle>
    <circle fill="black" cx="3" cy="3" r="4.5"></circle>
  </>
);
const maskDoNotDisturb = (
  <>
    <circle fill="white" cx="6" cy="6" r="6"></circle>
    <rect fill="black" x="1.5" y="4" width="9" height="4" rx="3" ry="3"></rect>
  </>
);

const presenceMasks = {
  [UserPresence.None]: maskNone,
  [UserPresence.Online]: maskOnline,
  [UserPresence.Offline]: maskOffline,
  [UserPresence.Away]: maskAway,
  [UserPresence.DoNotDisturb]: maskDoNotDisturb,
};

const presenceNames = {
  [UserPresence.None]: "none",
  [UserPresence.Online]: "online",
  [UserPresence.Offline]: "offline",
  [UserPresence.Away]: "away",
  [UserPresence.DoNotDisturb]: "dont-disturb",
};

export function UserAvatarSVG({ user, size }: { user: User; size: number }) {
  var presenceName = presenceNames[user.presence];
  var presenceMask = presenceMasks[user.presence];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className="user-avatar-svg"
    >
      <mask id="avatar-presence-mask">
        <svg x="0" y="0" width="32" height="32" viewBox="0 0 40 40">
          {maskAvatarPresence}
        </svg>
      </mask>
      <image
        x="0"
        y="0"
        width="32"
        height="32"
        href={avatarPreviewURL(user)}
        mask="url(#avatar-presence-mask)"
      />

      <mask id={"avatar-presence-mask-" + presenceName}>
        <svg x="22" y="22" width="10" height="10" viewBox="0 0 12 12">
          {presenceMask}
        </svg>
      </mask>
      <rect
        className={presenceName}
        x="22"
        y="22"
        width="10"
        height="10"
        mask={`url(#${"avatar-presence-mask-" + presenceName})`}
      />
    </svg>
  );
}

export function UserAvatarBigSVG({ user, size }: { user: User; size: number }) {
  var presenceName = presenceNames[user.presence];
  var presenceMask = presenceMasks[user.presence];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="user-avatar-svg"
    >
      <mask id="avatar-presence-mask-big">
        <svg x="0" y="0" width="80" height="80" viewBox="0 0 40 40">
          {maskAvatarPresenceBig}
        </svg>
      </mask>
      <image
        x="0"
        y="0"
        width="80"
        height="80"
        href={avatarDisplayURL(user)}
        mask="url(#avatar-presence-mask-big)"
      />

      <mask id={"avatar-presence-mask-" + presenceName + "-big"}>
        <svg x="60" y="60" width="16" height="16" viewBox="0 0 12 12">
          {presenceMask}
        </svg>
      </mask>
      <rect
        className={presenceName}
        x="60"
        y="60"
        width="16"
        height="16"
        mask={`url(#${"avatar-presence-mask-" + presenceName + "-big"})`}
      />
    </svg>
  );
}

export function UserAvatarSimple({ user, size }: { user: User; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className="user-avatar-svg"
    >
      <mask id="avatar-mask">
        <svg x="0" y="0" width="40" height="40" viewBox="0 0 40 40">
          {maskAvatar}
        </svg>
      </mask>
      <image
        x="0"
        y="0"
        width="40"
        height="40"
        href={avatarPreviewURL(user)}
        mask="url(#avatar-mask)"
      />
    </svg>
  );
}

function UserAvatar({ user }: { user: User }) {
  return (
    <div className="user-avatar">
      <UserAvatarSVG user={user} size={40} />
    </div>
  );
}

export function UserPresenceIcon({
  presence,
  className,
}: {
  presence: UserPresence;
  className?: string;
}) {
  var presenceName = presenceNames[presence];
  var presenceMask = presenceMasks[presence];

  return (
    <svg viewBox="0 0 12 12" className={`user-avatar-svg ${className ?? ""}`}>
      <mask id={"presence-icon-mask-" + presenceName}>
        <svg x="0" y="0" width="12" height="12" viewBox="0 0 12 12">
          {presenceMask}
        </svg>
      </mask>
      <rect
        x="0"
        y="0"
        width="12"
        height="12"
        rx="6"
        ry="6"
        className={presenceName}
        mask={`url(#${"presence-icon-mask-" + presenceName})`}
      ></rect>
    </svg>
  );
}

export function UserEntry({ id, idx }: { id: string; idx: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const user = useClackState(ClackEvents.user(id), (state) =>
    state.chat.users.get(id)
  );
  const setUserPopup = getClackState((state) => state.gui.setUserPopup);
  const setContextMenuPopup = getClackState(
    (state) => state.gui.setContextMenuPopup
  );

  if (!user) {
    const gen = new Rand(String(idx));
    const rng = (min: number, max: number) => {
      return Math.floor(gen.next() * (max - min)) + min;
    };
    var width = rng(60, 140);
    return (
      <div
        className="user-entry user-list-entry skeleton"
        style={{
          top: idx * userEntryHeight,
        }}
      >
        <div className="user-avatar skeleton"></div>
        <div className="user-details">
          <div
            className="user-username skeleton"
            style={{ width: `${width}px` }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={
        "user-entry user-list-entry clickable-button" +
        (user.presence == UserPresence.Offline ? " offline" : "")
      }
      style={{
        top: idx * userEntryHeight,
      }}
      onClick={(e) => {
        var rect = ref.current!.getBoundingClientRect();
        setUserPopup({
          id: user.id,
          position: {
            x: rect.left - 16,
            y: rect.top,
          },
          direction: "left",
        });
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuPopup({
          type: "user",
          id: user.id,
          content: (
            <UserContextMenu
              id={user.id}
              position={{ x: e.clientX, y: e.clientY }}
              offset={{ x: 0, y: 0 }}
            />
          ),
        });
      }}
    >
      <UserAvatar user={user} />
      <div className="user-details">
        <div
          className="user-display-name"
          style={{
            color: FormatColor(user.roleColor),
          }}
        >
          {user.displayName}
        </div>
        {user.statusMessage && (
          <div className="user-status-message">
            <EmojiContent text={user.statusMessage} />
          </div>
        )}
      </div>
    </div>
  );
}

function UserGroup({
  id,
  count,
  idx,
}: {
  id: string;
  count: number;
  idx: number;
}) {
  const userGroup = useClackState(ClackEvents.role(id), (state) => {
    var name = "";
    if (id == String(UserPresence.Online)) {
      name = "Online";
    } else if (id == String(UserPresence.Offline)) {
      name = "Offline";
    } else {
      var role = state.chat.roles.get(id);
      name = role ? role.name : "Unknown";
    }
    return {
      name: name,
      count: count,
    };
  });

  return (
    <div
      className="user-group user-list-entry text-heading-small"
      style={{
        top: idx * userEntryHeight,
      }}
    >
      <span>{userGroup.name}</span>
      <span>{" — "}</span>
      <span>{userGroup.count}</span>
    </div>
  );
}

function Users() {
  const userList = useClackState(
    ClackEvents.userList,
    (state) => state.chat.userList
  );

  const groupsIDs = Array.from(userList.groups.keys());
  var groupIndices: Map<string, number> = new Map();
  var userListLength = 0;
  userList.groups.forEach((count, id) => {
    groupIndices.set(id, userListLength);
    userListLength += count + 1;
  });

  const userIndices = Array.from(userList.list.keys()).filter((idx) => {
    return !groupIndices.has(userList.list.get(idx)!);
  });

  const setScroll = getClackState((state) => state.chat.setUserScroll);
  const listRef = useRef<HTMLDivElement>(null);

  const showing = useClackState(
    ClackEvents.userList,
    (state) => state.gui.showingUserList
  );

  const scrollTimeout = useRef<number | null>(null);

  function getIndex(height: number): number {
    return Math.floor(height / userEntryHeight);
  }

  function getHeight(index: number): number {
    return index * userEntryHeight;
  }

  function doScroll() {
    if (!listRef.current) return;

    console.log(
      "DO SCROLL",
      listRef.current.scrollTop,
      listRef.current.clientHeight
    );

    var top = getIndex(
      listRef.current.scrollTop - listRef.current.clientHeight
    );
    var bottom = getIndex(
      listRef.current.scrollTop + 2 * listRef.current.clientHeight
    );

    setScroll(top, bottom);
  }

  function onScroll() {
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    scrollTimeout.current = setTimeout(() => {
      scrollTimeout.current = null;
      doScroll();
    }, 100);
  }

  useEffect(() => {
    doScroll();
  }, []);

  if (!showing) {
    return null;
  }

  return (
    <div
      key="user-view"
      className="user-view thin-scrollbar"
      ref={listRef}
      onScroll={onScroll}
      onMouseUp={() => {
        if (scrollTimeout.current) {
          clearTimeout(scrollTimeout.current);
          scrollTimeout.current = null;
          doScroll();
        }
      }}
    >
      <div style={{ position: "relative", height: getHeight(userListLength) }}>
        {groupsIDs.map((id) => (
          <UserGroup
            key={`g-${id}`}
            id={id}
            count={userList.groups.get(id)!}
            idx={groupIndices.get(id)!}
          />
        ))}

        {userIndices.map((idx) => {
          var id = userList.list.get(idx)!;
          return <UserEntry key={`u-${id}`} id={id} idx={idx} />;
        })}
      </div>
    </div>
  );
}

export function UserContextMenu({
  id,
  position,
  offset,
}: {
  id: string;
  position: { x: number; y: number };
  offset: { x: number; y: number };
}) {
  const user = useClackState(ClackEvents.user(id), (state) =>
    state.chat.users.get(id)
  );
  const setContextMenuPopup = getClackState(
    (state) => state.gui.setContextMenuPopup
  );
  const setUserPopup = getClackState((state) => state.gui.setUserPopup);

  const roles = useClackState(ClackEvents.roleList, (state) =>
    state.chat.roles.getAll()
  );

  const [you, youPermissions] = useClackStateDynamic((state, events) => {
    const currentUser = state.chat.currentUser;
    if (!currentUser) {
      return [undefined, 0] as const;
    }
    events.push(ClackEvents.user(currentUser));
    events.push(ClackEvents.current);
    const user = state.chat.users.get(currentUser);
    const permissions = state.chat.getPermissions(currentUser, undefined);
    return [user, permissions] as const;
  });

  const hasManageRoles = HasPermission(youPermissions, Permissions.ManageRoles);
  const canManageRoles =
    !!user && !!you && hasManageRoles && user.rank > you.rank;

  let flipX = false;
  let flipY = false;

  if (position.x > window.innerWidth - 200) {
    flipX = true;
  }
  if (position.y > window.innerHeight - 200) {
    flipY = true;
  }

  const x = position.x;
  const y = position.y;
  const ox = offset.x;
  const oy = offset.y;

  const style: any = {
    top: undefined,
    left: undefined,
    bottom: undefined,
    right: undefined,
  };

  if (flipX) {
    style.right = window.innerWidth - x + ox;
  } else {
    style.left = x + ox;
  }

  if (flipY) {
    style.bottom = window.innerHeight - y + oy;
  } else {
    style.top = y + oy;
  }

  const youRank = you?.rank ?? Number.MAX_VALUE;

  return (
    <div className="context-menu" style={style}>
      <div
        className="context-menu-entry"
        onClick={() => {
          if (user) {
            setUserPopup({
              id: user.id,
              position: { x: x + 12, y: y },
              direction: flipX ? "left" : "right",
            });
          }
          setContextMenuPopup(undefined);
        }}
      >
        <div className="context-menu-label">Profile</div>
      </div>
      <div className="context-menu-divider" />
      {canManageRoles && roles.length > 0 && (
        <>
          <div className="context-menu-entry">
            <div className="context-menu-entry-wrapper">
              <div className="context-menu-label">Roles</div>
              <div className="context-menu-arrow">
                <IoIosArrowForward />
              </div>
            </div>
            <div
              className={`context-menu context-menu-submenu${
                flipX ? " flip-x" : ""
              }`}
              style={{ width: 216, gap: 2 }}
            >
              <div className={`context-menu-submenu-join-area`} />
              <UserContextMenuRoles userID={user.id} />
            </div>
          </div>
          <div className="context-menu-divider" />
        </>
      )}
      <div
        className="context-menu-entry"
        onClick={() => {
          navigator.clipboard.writeText(id);
          setContextMenuPopup(undefined);
        }}
      >
        <div className="context-menu-label">Copy ID</div>
      </div>
    </div>
  );
}

export function UserContextMenuRoles({
  userID,
}: {
  userID: string | undefined;
}) {
  const user = useClackState(ClackEvents.user(userID ?? ""), (state) =>
    state.chat.users.get(userID ?? "")
  );

  const youRank = useClackState(ClackEvents.current, (state) => {
    var you = state.chat.users.get(state.chat.currentUser);
    return you?.rank ?? Number.MAX_VALUE;
  });

  const roles = useClackState(ClackEvents.roleList, (state) =>
    state.chat.roles.getAll()
  );

  const addUserRole = getClackState((state) => state.chat.addUserRole);
  const deleteUserRole = getClackState((state) => state.chat.deleteUserRole);

  return (
    <>
      {roles.map((role) => {
        const hasRole = user?.roles.includes(role.id) ?? false;
        const canToggleRole = role.position > youRank;
        const disabled = !canToggleRole;

        return (
          <div
            key={role.id}
            className="context-menu-entry"
            style={
              disabled
                ? {
                    opacity: 0.5,
                    pointerEvents: "none",
                  }
                : undefined
            }
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!user || disabled) return;
              if (hasRole) {
                deleteUserRole(user.id, role.id);
              } else {
                addUserRole(user.id, role.id);
              }
            }}
          >
            <div
              className="context-menu-role-color"
              style={{
                backgroundColor: FormatColor(role.color) ?? "var(--fg-color-3)",
              }}
            />
            <div className="context-menu-label" style={{ flex: 1 }}>
              {role.name}
            </div>
            <div
              className={`context-menu-checkbox${hasRole ? " checked" : ""} ${
                disabled ? "disabled" : ""
              }`}
            >
              {hasRole && <IoMdCheckmark />}
            </div>
          </div>
        );
      })}
    </>
  );
}

export default Users;
