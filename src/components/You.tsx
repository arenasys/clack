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

import { User, UserPresence } from "../types";

import { UserAvatarSVG } from "./Users";
import { IconButton, ClickWrapper } from "./Common";
import { SettingsTab } from "../state/gui";

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
  const setYouPopup = getClackState((state) => state.gui.setYouPopup);
  const youPopup = useClackState(
    ClackEvents.youPopup,
    (state) => state.gui.youPopup
  );
  const setSettingsTab = getClackState((state) => state.gui.setSettingsTab);

  if (!user) {
    return <></>;
  }

  return (
    <>
      <div
        className={
          "you-entry clickable-button" +
          (user.presence == UserPresence.Offline ? " offline" : "") +
          (youPopup ? " active" : "")
        }
        onClick={(e) => {
          const rect = document
            .getElementById("you-container")
            .getBoundingClientRect();
          setYouPopup({
            position: {
              x: rect.left + rect.width / 2,
              y: rect.top - 8,
            },
          });
        }}
      >
        <div className="you-avatar">
          <UserAvatarSVG user={user} size={40} />
        </div>
        <div className="you-details">
          <div className="you-display-name">{user.displayName}</div>
          <div className="you-user-name">{user.userName}</div>
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

      <IconButton
        tooltip="Settings"
        onClick={() => setSettingsTab(SettingsTab.MyAccount)}
      >
        <MdSettings className="icon" />
      </IconButton>
    </>
  );
}
