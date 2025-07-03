import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { produce, current } from "immer";

import { Gateway, GatewayAuthState, GatewayPendingAttachment } from "./gateway";
import {
  Viewable,
  Snowflake,
  User,
  Channel,
  Emoji,
  Role,
  ChannelType,
} from "./models";
import { EmojiSearchByPartialName } from "./emoji";
import { ErrorResponse } from "./events";

import fuzzysort from "fuzzysort";

export interface TooltipPopupState {
  content: string;
  direction: "top" | "bottom" | "left" | "right";
  position: { x: number; y: number };
}

export interface UserPopupState {
  id: Snowflake;
  user: User;
  direction: "left" | "right";
  position: { x: number; y: number };
}

export interface EmojiPickerPopupState {
  position: { x: number; y: number };
  direction: "top" | "bottom";
  onPick: (id: Snowflake, text: string) => void;
  onClose: () => void;
}

export interface ViewerModalState {
  items: Viewable[];
  index: number;
}

export interface AttachmentModalState {
  file: GatewayPendingAttachment;
}

export interface MessageContextMenuState {
  message: Snowflake;
  direction: "right";
  position: { x: number; y: number };
  static: boolean;
}

export interface MessageDeleteModalState {
  message: Snowflake;
}

export interface ErrorModalState {
  error: ErrorResponse;
}

export interface InputStates {
  text: string;
  files: File[];
}

function changeAnchoring(position: { x: number; y: number }) {
  const window = document.documentElement.getBoundingClientRect();
  position.x = window.width - position.x;
  position.y = window.height - position.y;
  return position;
}

export interface ChatState {
  gateway: Gateway;

  // UI State
  tooltipPopup?: TooltipPopupState;
  tooltipIndex: number;
  userPopup?: UserPopupState;
  emojiPickerPopup?: EmojiPickerPopupState;
  contextMenuPopup?: MessageContextMenuState;
  viewerModal?: ViewerModalState;
  attachmentModal?: AttachmentModalState;
  messageDeleteModal?: MessageDeleteModalState;
  errorModal?: ErrorModalState;
  showingUserList: boolean;

  // Net
  requests: any[];
  onResponse: (response: any) => void;
  pushRequest: (request: any) => void;
  popRequest: () => any;

  // Auth
  login: (username: string, password: string) => void;
  register: (
    username: string,
    password: string,
    email: string | undefined,
    inviteCode: string | undefined
  ) => void;
  finishCaptcha: (captchaResponse: string | undefined) => void;
  switchAuthState: (authState: GatewayAuthState) => void;

  // Actions
  changeChannel: (channel: string) => void;
  sendMessage: (content: string) => void;
  updateMessage: (message: Snowflake, content: string) => void;
  deleteMessage: (message: Snowflake) => void;
  cancelMessage: (message: Snowflake) => void;
  addReaction: (message: Snowflake, emoji: Snowflake) => void;
  setChatScroll: (top: string, center: string, bottom: string) => void;
  jumpToMessage: (message: Snowflake | string | undefined) => void;
  setUserScroll: (
    topGroup: string,
    topIndex: number,
    bottomGroup: string,
    bottomIndex: number
  ) => void;
  setTooltipPopup: (tooltipPopup: TooltipPopupState | undefined) => number;
  clearTooltipPopup: (idx: number) => void;
  setContextMenuPopup: (menuPopup: MessageContextMenuState | undefined) => void;
  setUserPopup: (userPopup: UserPopupState | undefined) => void;
  setEmojiPickerPopup: (
    emojiPickerPopup: EmojiPickerPopupState | undefined
  ) => void;
  setViewerModal: (viewerModal: ViewerModalState | undefined) => void;
  setAttachmentModal: (
    attachmentModal: AttachmentModalState | undefined
  ) => void;
  setMessageDeleteModal: (
    messageDeleteModal: MessageDeleteModalState | undefined
  ) => void;
  setErrorModal: (errorModal: ErrorModalState | undefined) => void;
  setShowingUserList: (showingMemberList: boolean) => void;
  setEditorState: (state: string) => void;
  setAttachments: (
    add: GatewayPendingAttachment[],
    remove: GatewayPendingAttachment[],
    update: GatewayPendingAttachment[]
  ) => void;
  setReplyingTo: (message: Snowflake | undefined) => void;

  // Search
  searchEmojis: (query: string) => Emoji[];
  searchUsers: (query: string) => User[];
  searchChannels: (query: string) => Channel[];
  searchRoles: (query: string) => Role[];

  //Lookup
  lookupUser: (
    name: string | undefined,
    id: string | undefined
  ) => User | undefined;
  lookupChannel: (
    name: string | undefined,
    id: string | undefined
  ) => Channel | undefined;
  lookupRole: (
    name: string | undefined,
    id: string | undefined
  ) => Role | undefined;
  lookupEmoji: (
    name: string | undefined,
    id: string | undefined
  ) => Emoji | undefined;

  // Update
  _u: number;
  update: (state: ChatState) => void;
}

export const useChatState = create<ChatState>()((set) => {
  return {
    gateway: new Gateway(),

    tooltipPopup: undefined,
    tooltipIndex: 1,
    showingUserList: true,

    requests: [],

    changeChannel: (channel) =>
      set(
        produce((state: ChatState) => {
          if (state.gateway.currentChannel === channel) return;
          state.gateway.changeChannel(channel);
          state.update(state);
        })
      ),
    sendMessage: (content) =>
      set(
        produce((state: ChatState) => {
          state.gateway.sendMessage(content);
          state.update(state);
        })
      ),
    updateMessage: (message, content) =>
      set(
        produce((state: ChatState) => {
          state.gateway.updateMessage(message, content);
          state.update(state);
        })
      ),
    deleteMessage: (message) =>
      set(
        produce((state: ChatState) => {
          state.gateway.deleteMessage(message);
          state.update(state);
        })
      ),
    cancelMessage: (message) =>
      set(
        produce((state: ChatState) => {
          state.gateway.cancelMessage(message);
          state.update(state);
        })
      ),
    addReaction: (message, emoji) =>
      set(
        produce((state: ChatState) => {
          state.gateway.addReaction(message, emoji);
          state.update(state);
        })
      ),
    setChatScroll: async (top, center, bottom) =>
      set(
        produce((state: ChatState) => {
          state.gateway.setChatScroll(top, center, bottom);
          state.update(state);
        })
      ),
    jumpToMessage: async (message) =>
      set(
        produce((state: ChatState) => {
          state.gateway.jumpToMessage(message);
          state.update(state);
        })
      ),
    setUserScroll: async (topGroup, topIndex, bottomGroup, bottomIndex) =>
      set(
        produce((state: ChatState) => {
          state.gateway.setUserScroll(
            topGroup,
            topIndex,
            bottomGroup,
            bottomIndex
          );
          state.update(state);
        })
      ),
    setTooltipPopup: (tooltipPopup) => {
      var idx = 0;
      set(
        produce((state: ChatState) => {
          if (tooltipPopup === state.tooltipPopup) {
            return;
          }
          state.tooltipPopup = tooltipPopup;
          state.tooltipIndex += 1;
          idx = state.tooltipIndex;
        })
      );
      return idx;
    },
    clearTooltipPopup: (idx) =>
      set(
        produce((state: ChatState) => {
          if (state.tooltipIndex === idx) {
            state.tooltipPopup = undefined;
          }
        })
      ),
    setContextMenuPopup: (menuPopup) =>
      set(
        produce((state: ChatState) => {
          state.contextMenuPopup = menuPopup;
        })
      ),
    setUserPopup: (userPopup) =>
      set(
        produce((state: ChatState) => {
          if (userPopup !== undefined && userPopup.direction === "left") {
            userPopup.position = changeAnchoring(userPopup.position);
          }

          state.userPopup = userPopup;
        })
      ),
    setEmojiPickerPopup: (emojiPickerPopup) =>
      set(
        produce((state: ChatState) => {
          if (emojiPickerPopup !== undefined) {
            emojiPickerPopup.position = changeAnchoring(
              emojiPickerPopup.position
            );
          }
          if (state.emojiPickerPopup !== undefined) {
            state.emojiPickerPopup.onClose();
          }

          state.emojiPickerPopup = emojiPickerPopup;
        })
      ),
    setViewerModal: (viewerModal) =>
      set(
        produce((state: ChatState) => {
          state.viewerModal = viewerModal;
        })
      ),
    setAttachmentModal: (attachmentModal) =>
      set(
        produce((state: ChatState) => {
          state.attachmentModal = attachmentModal;
        })
      ),
    setMessageDeleteModal: (messageDeleteModal) =>
      set(
        produce((state: ChatState) => {
          state.messageDeleteModal = messageDeleteModal;
        })
      ),
    setErrorModal: (errorModal) =>
      set(
        produce((state: ChatState) => {
          state.errorModal = errorModal;
        })
      ),
    setShowingUserList: (showingUserList) =>
      set(
        produce((state: ChatState) => {
          state.showingUserList = showingUserList;
        })
      ),
    setEditorState: (editor) =>
      set(
        produce((state: ChatState) => {
          state.gateway.setEditorState(editor);
          state.update(state);
        })
      ),
    setAttachments: (add, remove, update) =>
      set(
        produce((state: ChatState) => {
          state.gateway.setAttachments(add, remove, update);
          state.update(state);
        })
      ),
    setReplyingTo: (message) =>
      set(
        produce((state: ChatState) => {
          state.gateway.setReplyingTo(message);
          state.update(state);
        })
      ),
    pushRequest: (request) =>
      set(
        produce((state: ChatState) => {
          state.requests.push(request);
        })
      ),
    popRequest: () => {
      var value;
      set(
        produce((state: ChatState) => {
          value = current(state.requests[state.requests.length - 1]);
          state.requests.pop();
        })
      );
      return value;
    },

    onResponse: (response) => {
      set(
        produce((state: ChatState) => {
          state.gateway.onResponse(response);
          state.update(state);
        })
      );
    },

    login: (username, password) =>
      set(
        produce((state: ChatState) => {
          state.gateway.login(username, password);
          state.update(state);
        })
      ),

    register: (username, password, email, inviteCode) =>
      set(
        produce((state: ChatState) => {
          state.gateway.register(username, password, email, inviteCode);
          state.update(state);
        })
      ),

    finishCaptcha: (captchaResponse) =>
      set(
        produce((state: ChatState) => {
          state.gateway.finishCaptcha(captchaResponse);
          state.update(state);
        })
      ),

    switchAuthState: (authState: GatewayAuthState) =>
      set(
        produce((state: ChatState) => {
          state.gateway.authState = authState;
          state.update(state);
        })
      ),

    searchEmojis: (query: string) => {
      if (query.length <= 1) {
        return [];
      }

      if (!/^[a-z0-9_]+$/.test(query)) {
        return [];
      }

      const results = EmojiSearchByPartialName(query);
      if (results.length == 0) {
        return [];
      }

      if (results.length > 50) {
        results.length = 50;
      }

      return results.map((e) => {
        const emoji: Emoji = {
          id: "",
          name: e.symbol,
        };
        return emoji;
      });
    },
    searchUsers: (query: string) => {
      const results: [User, number][] = [];
      set(
        produce((state: ChatState) => {
          query = query.toLowerCase();
          state.gateway.users.forEach((user) => {
            const username = user.username.toLowerCase();
            const nickname = user.nickname?.toLowerCase() || "";

            const score = Math.max(
              fuzzysort.single(query, username)?.score ?? 0,
              fuzzysort.single(query, nickname)?.score ?? 0
            );

            if (score > 0 || query.length == 0) {
              results.push([user, score]);
            }
          });
        })
      );
      return results
        .sort((a, b) => {
          return b[1] - a[1];
        })
        .map((e) => e[0]);
    },
    searchChannels: (query: string) => {
      const results: [Channel, number][] = [];
      set(
        produce((state: ChatState) => {
          query = query.toLowerCase();

          state.gateway.channels.forEach((channel) => {
            if (channel.type === ChannelType.Category) return;
            const name = channel.name.toLowerCase();

            const score = fuzzysort.single(query, name)?.score ?? 0;

            if (score > 0 || query.length == 0) {
              results.push([channel, score]);
            }
          });
        })
      );
      return results
        .sort((a, b) => {
          return b[1] - a[1];
        })
        .map((e) => e[0]);
    },
    searchRoles: (query: string) => {
      const results: [Role, number][] = [];
      set(
        produce((state: ChatState) => {
          query = query.toLowerCase();

          state.gateway.roles.store.forEach((role) => {
            const name = role.name.toLowerCase();

            const score = fuzzysort.single(query, name)?.score ?? 0;

            if (score > 0 || query.length == 0) {
              results.push([role, score]);
            }
          });
        })
      );
      return results
        .sort((a, b) => {
          return b[1] - a[1];
        })
        .map((e) => e[0]);
    },

    lookupUser: (name, id) => {
      var user: User | undefined = undefined;
      set(
        produce((state: ChatState) => {
          if (id) {
            user = state.gateway.users.get(id);
          } else if (name) {
            for (const u of state.gateway.users.values()) {
              if (u.username === name || u.nickname === name) {
                user = u;
                break;
              }
            }
          }
        })
      );
      return user;
    },
    lookupChannel: (name, id) => {
      var channel: Channel | undefined = undefined;
      set(
        produce((state: ChatState) => {
          if (id) {
            channel = state.gateway.channels.get(id);
          } else if (name) {
            for (const c of state.gateway.channels.values()) {
              if (c.name === name) {
                channel = c;
                break;
              }
            }
          }
        })
      );
      return channel;
    },
    lookupRole: (name, id) => {
      var role: Role | undefined = undefined;
      set(
        produce((state: ChatState) => {
          if (id) {
            role = state.gateway.roles.get(id);
          } else if (name) {
            for (const r of state.gateway.roles.store.values()) {
              if (r.name === name) {
                role = r;
                break;
              }
            }
          }
        })
      );
      return role;
    },
    lookupEmoji: (name, id) => {
      var emoji: Emoji | undefined = undefined;
      return emoji;
    },
    // Update

    _u: 0,
    update: (state: ChatState) => {
      if (state.gateway.requests.length > 0) {
        state.requests.push(...state.gateway.requests);
        state.gateway.requests = [];
      }
      if (state.gateway.error) {
        state.errorModal = {
          error: state.gateway.error,
        };
        state.gateway.error = undefined;
      }
      state._u++;
    },
  };
});

export interface ChatStateLookups {
  lookupUser: (
    username: string | undefined,
    id: string | undefined
  ) => User | undefined;
  lookupRole: (
    rolename: string | undefined,
    id: string | undefined
  ) => Role | undefined;
  lookupChannel: (
    channelname: string | undefined,
    id: string | undefined
  ) => Channel | undefined;
  lookupEmoji: (
    emojiName: string | undefined,
    id: string | undefined
  ) => Emoji | undefined;
  setUserPopup: (userPopup: UserPopupState | undefined) => void;
  setContextMenuPopup: (menuPopup: MessageContextMenuState | undefined) => void;
  setTooltipPopup: (tooltipPopup: TooltipPopupState | undefined) => number;
  clearTooltipPopup: (idx: number) => void;
}

export const GetChatStateLookups = () => {
  return useChatStateShallow((state) => ({
    lookupUser: state.lookupUser,
    lookupRole: state.lookupRole,
    lookupChannel: state.lookupChannel,
    lookupEmoji: state.lookupEmoji,
    setUserPopup: state.setUserPopup,
    setContextMenuPopup: state.setContextMenuPopup,
    setTooltipPopup: state.setTooltipPopup,
    clearTooltipPopup: state.clearTooltipPopup,
  })) as ChatStateLookups;
};

export const useChatStateShallow = <T,>(selector: (state: ChatState) => T) =>
  useChatState(useShallow(selector));
