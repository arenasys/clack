import { useChatState, useChatStateShallow } from "../state";
import { FormatColor } from "../util";

import { useRef } from "react";

import { User, UserStatus } from "../models";
import Rand from "rand-seed";

import List from "./List";

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
    <circle fill="black" cx="34" cy="34" r="10"></circle>
  </>
);

const maskAvatarBig = (
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

export function UserAvatarSVG({ user, size }: { user: User; size: number }) {
  var statusName = ["offline", "online", "away"][user.status];
  var statusMask = [maskOffline, maskOnline, maskAway][user.status];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className="user-avatar-svg"
    >
      <mask id="avatar-mask">
        <svg x="0" y="0" width="32" height="32" viewBox="0 0 40 40">
          {maskAvatar}
        </svg>
      </mask>
      <image
        x="0"
        y="0"
        width="32"
        height="32"
        href="/avatar.png"
        mask="url(#avatar-mask)"
      />

      <mask id={"status-mask-" + statusName}>
        <svg x="22" y="22" width="10" height="10" viewBox="0 0 12 12">
          {statusMask}
        </svg>
      </mask>
      <rect
        className={statusName}
        x="22"
        y="22"
        width="10"
        height="10"
        mask={`url(#${"status-mask-" + statusName})`}
      />
    </svg>
  );
}

export function UserAvatarBigSVG({ user, size }: { user: User; size: number }) {
  var statusName = ["offline", "online", "away"][user.status];
  var statusMask = [maskOffline, maskOnline, maskAway][user.status];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="user-avatar-svg"
    >
      <mask id="avatar-mask-big">
        <svg x="0" y="0" width="80" height="80" viewBox="0 0 40 40">
          {maskAvatarBig}
        </svg>
      </mask>
      <image
        x="0"
        y="0"
        width="80"
        height="80"
        href="/avatar.png"
        mask="url(#avatar-mask-big)"
      />

      <mask id={"status-mask-" + statusName + "-big"}>
        <svg x="60" y="60" width="16" height="16" viewBox="0 0 12 12">
          {statusMask}
        </svg>
      </mask>
      <rect
        className={statusName}
        x="60"
        y="60"
        width="16"
        height="16"
        mask={`url(#${"status-mask-" + statusName + "-big"})`}
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

export function UserEntry({ id, idx }: { id: string; idx: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const user = useChatStateShallow((state) => state.gateway.users.get(id));
  const setUserPopup = useChatState((state) => state.setUserPopup);

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
        (user.status == UserStatus.Offline ? " offline" : "")
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
          className="user-username"
          style={{
            color: FormatColor(user.color),
          }}
        >
          {user.nickname ?? user.username}
        </div>
      </div>
    </div>
  );
}

function UserGroup({ id, count }: { id: string; count: number }) {
  const userGroup = useChatStateShallow((state) => {
    var name = "";
    if (id == String(UserStatus.Online)) {
      name = "Online";
    } else if (id == String(UserStatus.Offline)) {
      name = "Offline";
    } else {
      var role = state.gateway.roles.get(id);
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
  const userGroups = useChatState((state) => state.gateway.userOrder.groups);
  const setScroll = useChatState((state) => state.setUserScroll);
  const listRef = useRef<HTMLDivElement>(null);

  const showing = useChatState((state) => state.showingUserList);
  const setShowing = useChatState((state) => state.setShowingUserList);

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

  console.log("RENDER USERS", userGroups);

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
