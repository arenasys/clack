import { HiOutlineHashtag } from "react-icons/hi";
import { BiSearch } from "react-icons/bi";
import { MdPeople } from "react-icons/md";

import {
  useClackState,
  useClackStateDynamic,
  getClackState,
  ClackEvents,
} from "../state";

import { useEffect, useRef, useState, useMemo } from "react";
import { IconButton } from "./Common";

export function Header() {
  const currentChannel = useClackStateDynamic((state, events) => {
    events.push(ClackEvents.current);
    if (!state.chat.currentChannel) {
      return undefined;
    }
    events.push(ClackEvents.channel(state.chat.currentChannel));
    return state.chat.channels.get(state.chat.currentChannel);
  });

  const showingUserList = useClackState(
    ClackEvents.userList,
    (state) => state.gui.showingUserList
  );
  const setShowingUserList = getClackState(
    (state) => state.gui.setShowingUserList
  );

  return (
    <>
      <div className="header-channel">
        <HiOutlineHashtag className="header-channel-icon" />
        <span className="header-channel-name">{currentChannel?.name}</span>
      </div>
      <div className="header-controls">
        <IconButton
          tooltip={`${showingUserList ? "Hide" : "Show"} User List`}
          tooltipDirection="bottom"
          className={`foreground ${showingUserList ? "on" : ""}`}
          onClick={() => {
            setShowingUserList(!showingUserList);
          }}
        >
          <MdPeople className="icon" />
        </IconButton>
        <div className="search-container">
          <span className="search-input">Search</span>
          <BiSearch className="search-icon" />
        </div>
      </div>
    </>
  );
}

export default Header;
