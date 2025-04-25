import { VList, VListHandle } from "virtua";
import { useChatState, useChatStateShallow } from "../state";

import { HiOutlineHashtag } from "react-icons/hi";
import { IoIosArrowDown, IoMdAdd } from "react-icons/io";

import { useRef } from "react";

function Channel({ id }: { id: string }) {
  const channel = useChatStateShallow(
    (state) => state.gateway.channels.get(id)!
  );
  const current = useChatState((state) => state.gateway.currentChannel == id);
  const changeChannel = useChatState((state) => state.changeChannel);
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
  const channelGroup = useChatStateShallow(
    (state) => state.gateway.channels.get(id)!
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
  const channelGroups = useChatState((state) => state.gateway.channelGroups);

  console.log("CHANNELS, Channel groups", channelGroups);

  const noGroup = channelGroups.length == 0;

  const ref = useRef<VListHandle>(null);

  if (channelGroups.length === 0) {
    return <></>;
  }

  return (
    <VList
      id="channel-list"
      ref={ref}
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
    </VList>
  );
}

export function ChannelHeader() {}

export default Channels;
