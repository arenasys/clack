import { useEffect, useRef, useState, useMemo } from "react";

import {
  useClackState,
  useClackStateDynamic,
  getClackState,
  ClackEvents,
} from "../state";

import {
  MdMic,
  MdMicOff,
  MdHeadphones,
  MdHeadsetOff,
  MdSettings,
} from "react-icons/md";

import { User, UserStatus } from "../types";

import { UserAvatarSVG } from "./Users";
import { IconButton } from "./Common";

export default function You() {
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);

  const user = useClackStateDynamic((state, keys) => {
    keys.push(ClackEvents.current);
    if (!state.chat.currentUser) {
      return undefined;
    }
    keys.push(ClackEvents.user(state.chat.currentUser));
    return state.chat.users.get(state.chat.currentUser);
  });

  const setTooltipPopup = getClackState((state) => state.gui.setTooltipPopup);

  if (!user) {
    return <></>;
  }

  return (
    <>
      <div
        className={
          "you-entry clickable-button" +
          (user.status == UserStatus.Offline ? " offline" : "")
        }
      >
        <div className="you-avatar">
          <UserAvatarSVG user={user} size={40} />
        </div>
        <div className="you-details">
          <div className="you-nickname">{user.nickname ?? user.username}</div>
          <div className="you-username">{user.username}</div>
        </div>
      </div>

      <IconButton
        tooltip={muted ? "Disable Mute" : "Enable Mute"}
        className={muted ? "red" : ""}
        onClick={() => setMuted(!muted)}
      >
        {muted ? <MdMicOff className="icon" /> : <MdMic className="icon" />}
      </IconButton>

      <IconButton
        tooltip={deafened ? "Disable Deafen" : "Enable Deafen"}
        className={deafened ? "red" : ""}
        onClick={() => setDeafened(!deafened)}
      >
        {deafened ? (
          <MdHeadsetOff className="icon" />
        ) : (
          <MdHeadphones className="icon" />
        )}
      </IconButton>

      <IconButton tooltip="Settings">
        <MdSettings className="icon" />
      </IconButton>
    </>
  );
}
