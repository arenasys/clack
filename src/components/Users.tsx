import { useClackState, getClackState, ClackEvents } from "../state";
import { FormatColor } from "../util";

import { useRef } from "react";

import { User, UserPresence } from "../types";
import { EmojiContent, SyntaxContent } from "../syntax";
import Rand from "rand-seed";

import List from "./List";
import { avatarDisplayURL, avatarPreviewURL } from "../state/chat";

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
const maskDontDisturb = (
  <>
    <circle fill="white" cx="6" cy="6" r="6"></circle>
    <rect fill="black" x="1.5" y="4" width="9" height="4" rx="3" ry="3"></rect>
  </>
);

const presenceMasks = {
  [UserPresence.Online]: maskOnline,
  [UserPresence.Offline]: maskOffline,
  [UserPresence.Away]: maskAway,
  [UserPresence.DontDisturb]: maskDontDisturb,
};

const presenceNames = {
  [UserPresence.Online]: "online",
  [UserPresence.Offline]: "offline",
  [UserPresence.Away]: "away",
  [UserPresence.DontDisturb]: "dont-disturb",
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

  if (!user) {
    const gen = new Rand(String(idx));
    const rng = (min: number, max: number) => {
      return Math.floor(gen.next() * (max - min)) + min;
    };
    var width = rng(60, 140);
    return (
      <div className="user-entry skeleton">
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
        "user-entry clickable-button" +
        (user.presence == UserPresence.Offline ? " offline" : "")
      }
      onClick={(e) => {
        var rect = ref.current!.getBoundingClientRect();
        setUserPopup({
          id: user.id,
          user: user,
          position: {
            x: rect.left - 16,
            y: rect.top,
          },
          direction: "left",
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

function UserGroup({ id, count }: { id: string; count: number }) {
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
    <div className="user-group text-heading-small">
      <span>{userGroup.name}</span>
      <span>{" — "}</span>
      <span>{userGroup.count}</span>
    </div>
  );
}

function Spacer({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <div
      className="user-view-spacer"
      style={{ height: count * userEntryHeight }}
    ></div>
  );
}

function Users() {
  const userGroups = useClackState(
    ClackEvents.userList,
    (state) => state.chat.userOrder.groups
  );
  const setScroll = getClackState((state) => state.chat.setUserScroll);
  const listRef = useRef<HTMLDivElement>(null);

  const showing = useClackState(
    ClackEvents.userList,
    (state) => state.gui.showingUserList
  );
  const setShowing = getClackState((state) => state.gui.setShowingUserList);

  const scrollTimeout = useRef<number | null>(null);

  function getIndex(height: number): [string, number] {
    var group: string = "";
    var index: number = 0;

    var i = 0;

    for (const g of userGroups) {
      i += userGroupHeight;

      var userHeight = g.count * userEntryHeight;

      if (i + userHeight > height) {
        group = g.role;
        index = Math.max(
          0,
          Math.min(g.count - 1, Math.floor((height - i) / userEntryHeight))
        );
        break;
      }

      i += userHeight;
    }

    if (group == "") {
      var lastGroup = userGroups[userGroups.length - 1];
      group = lastGroup.role;
      index = lastGroup.count - 1;
    }

    return [group, index];
  }

  function doScroll() {
    if (!listRef.current) return;

    console.log(
      "DO SCROLL",
      listRef.current.scrollTop,
      listRef.current.clientHeight
    );

    var [topGroup, topIndex] = getIndex(
      listRef.current.scrollTop - listRef.current.clientHeight
    );
    var [bottomGroup, bottomIndex] = getIndex(
      listRef.current.scrollTop + 2 * listRef.current.clientHeight
    );

    setScroll(topGroup, topIndex, bottomGroup, bottomIndex);
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
      {userGroups.map((g, gidx) => (
        <div key={g.role} className="user-view-group">
          <UserGroup key={g.role} id={g.role} count={g.count} />
          <Spacer key={g.role + "-pre"} count={g.start} />
          {g.users.map((id, uidx) => (
            <UserEntry
              key={g.role + id}
              id={id}
              idx={gidx * (1 << 16) + (g.start + uidx)}
            />
          ))}
          <Spacer
            key={g.role + "-post"}
            count={g.count - (g.start + g.users.length)}
          />
        </div>
      ))}
    </div>
  );
}

export default Users;
