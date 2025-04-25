import { useEffect, useRef, useState, useMemo } from "react";

import { useChatState, useChatStateShallow } from "../state";

import {
  MdMic,
  MdMicOff,
  MdHeadphones,
  MdHeadsetOff,
  MdSettings,
} from "react-icons/md";

import { User, UserStatus } from "../models";

import { UserAvatarSVG } from "./Users";
import { IconButton } from "./Common";

export default function You() {
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);

  const userID = useChatState((state) => {
    return state.gateway.currentUser;
  });

  const user = useChatStateShallow((state) => {
    return state.gateway.users.get(userID ?? "");
  });

  const setTooltipPopup = useChatState((state) => state.setTooltipPopup);

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
        iconClasses={muted ? "red" : ""}
        onClick={() => setMuted(!muted)}
      >
        {muted ? <MdMicOff className="icon" /> : <MdMic className="icon" />}
      </IconButton>

      <IconButton
        tooltip={deafened ? "Disable Deafen" : "Enable Deafen"}
        iconClasses={deafened ? "red" : ""}
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
