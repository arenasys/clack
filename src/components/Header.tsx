import { HiOutlineHashtag } from "react-icons/hi";
import { BiSearch } from "react-icons/bi";
import { MdPeople } from "react-icons/md";

import { useChatState, useChatStateShallow } from "../state";

import { useEffect, useRef, useState, useMemo } from "react";
import { IconButton } from "./Common";

export function Header() {
  const currentChannel = useChatState((state) =>
    state.gateway.channels.get(state.gateway.currentChannel ?? "")
  );

  const showingUserList = useChatState((state) => state.showingUserList);
  const setShowingUserList = useChatState((state) => state.setShowingUserList);

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
          iconClasses={`foreground ${showingUserList ? "on" : ""}`}
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
