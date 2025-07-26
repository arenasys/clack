import { useEffect, useRef, useMemo, useState } from "react";
import { VList, VListHandle } from "virtua";
import { Snowflake } from "../../../types";

import {
  useClackState,
  useClackStateDynamic,
  getClackState,
  ClackEvents,
} from "../../../state";

import { ClickWrapper, Modal, ModalHandle } from "../../Common";
import { EmojiSVG } from "../../../emoji";
import { UserAvatarSimple } from "../../Users";

export default function MessageReactionsModal() {
  const modalRef = useRef<ModalHandle>(null);
  const setMessageReactionsModal = getClackState(
    (state) => state.gui.setMessageReactionsModal
  );

  const reactionsModal = useClackState(
    ClackEvents.messageReactionsModal,
    (state) => state.gui.messageReactionsModal
  );

  const fetchReactionUsers = getClackState(
    (state) => state.chat.fetchReactionUsers
  );

  const [selected, setSelected] = useState<Snowflake | undefined>(undefined);

  const reactions = useClackStateDynamic(
    (state, events) => {
      if (reactionsModal == undefined) return [];
      events.push(ClackEvents.reactions(reactionsModal.message));
      const message = state.chat.messages.get(reactionsModal.message);
      if (!message || !message.reactions) return [];
      return message.reactions;
    },
    [reactionsModal]
  );

  const users = useClackStateDynamic(
    (state, events) => {
      if (reactionsModal == undefined || selected == undefined) return [];
      events.push(ClackEvents.reactions(reactionsModal.message));

      const userIDs = state.chat.reactionUsers
        .get(reactionsModal.message)
        ?.getReactionUsers(selected);

      if (userIDs == undefined) {
        return [];
      }

      userIDs.forEach((id) => {
        events.push(ClackEvents.user(id));
      });

      return userIDs
        .map((id) => {
          return state.chat.users.get(id);
        })
        .filter((u) => u != undefined);
    },
    [reactionsModal, selected]
  );

  useEffect(() => {
    if (
      (users == undefined || users.length == 0) &&
      selected != undefined &&
      reactionsModal != undefined
    ) {
      fetchReactionUsers(reactionsModal.message, selected);
    }
  }, [users, selected]);

  useEffect(() => {
    if (selected == undefined || !reactions.some((r) => r.emoji == selected)) {
      setSelected(reactions.length > 0 ? reactions[0].emoji : undefined);
    }
  }, [reactionsModal, reactions]);

  if (reactionsModal == undefined) {
    return <></>;
  }

  return (
    <Modal
      ref={modalRef}
      onClosing={() => {}}
      onClosed={() => {
        setMessageReactionsModal(undefined);
      }}
      closingTime={250}
    >
      <div
        className="reactions-modal modal-container"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="reactions-modal-emoji-list thin-scrollbar">
          {reactions.map((reaction) => (
            <div
              key={reaction.emoji}
              className={`reactions-modal-emoji-entry ${
                selected == reaction.emoji ? " selected" : ""
              }`}
              onClick={() => {
                setSelected(reaction.emoji);
              }}
            >
              <EmojiSVG symbol={reaction.emoji} />
              <span>{reaction.count}</span>
            </div>
          ))}
        </div>
        <VList
          className="reactions-modal-user-list thin-scrollbar"
          count={users.length}
          itemSize={44}
        >
          {(index) => {
            const user = users[index];
            return (
              <div key={user.id} className="reactions-modal-user-entry">
                <UserAvatarSimple user={user} size={24} />
                <span className="display-name">
                  {user.displayName}
                  <span className="user-name">{user.userName}</span>
                </span>
              </div>
            );
          }}
        </VList>
      </div>
    </Modal>
  );
}
