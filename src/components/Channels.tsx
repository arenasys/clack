import { useClackState, getClackState, ClackEvents } from "../state";

import { HiOutlineHashtag } from "react-icons/hi";
import { IoIosArrowDown, IoMdAdd } from "react-icons/io";

import { useRef } from "react";

function Channel({ id }: { id: string }) {
  const channel = useClackState(
    ClackEvents.channel(id),
    (state) => state.chat.channels.get(id)!
  );
  const current = useClackState(
    ClackEvents.current,
    (state) => state.chat.currentChannel == id
  );
  const changeChannel = getClackState((state) => state.chat.changeChannel);
  return (
    <div
      className={"channel-entry clickable-button" + (current ? " current" : "")}
      onClick={() => changeChannel(id)}
    >
      <HiOutlineHashtag className="channel-icon" />
      <div className="channel-name">{channel.name}</div>
      <div className="channel-controls"></div>
    </div>
  );
}

function ChannelGroup({
  id,
  children,
}: {
  id: string;
  children: JSX.Element[];
}) {
  const channelGroup = useClackState(
    ClackEvents.channel(id),
    (state) => state.chat.channels.get(id)!
  );
  return (
    <>
      <div className="channel-group-entry">
        <IoIosArrowDown className="channel-group-icon" />
        <div className="channel-group-name text-heading-small">
          {channelGroup.name}
        </div>
        <div className="channel-group-controls">
          <IoMdAdd className="channel-group-controls-icon" />
        </div>
      </div>
      {children}
    </>
  );
}

function Channels() {
  const channelGroups = useClackState(
    ClackEvents.channelList,
    (state) => state.chat.channelGroups
  );

  const noGroup = channelGroups.length == 0;

  if (channelGroups.length === 0) {
    return <></>;
  }

  return (
    <div
      id="channel-list"
      className={"thin-scrollbar" + (noGroup ? " no-group" : "")}
    >
      {channelGroups.map((group) => {
        var channels = group.channels.map((id) => (
          <Channel key={id} {...{ id }} />
        ));

        if (!group.category) {
          return <>{channels}</>;
        } else {
          return (
            <ChannelGroup key={group.category} {...{ id: group.category }}>
              {channels}
            </ChannelGroup>
          );
        }
      })}
    </div>
  );
}

export function ChannelHeader() {}

export default Channels;
