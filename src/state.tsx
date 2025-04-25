import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { produce, current } from "immer";
import _ from "underscore";

import { Gateway, GatewayAuthState, GatewayPendingAttachment } from "./gateway";
import { Viewable, Snowflake, User } from "./models";

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

export interface ViewerModalState {
  items: Viewable[];
  index: number;
}

export interface AttachmentModalState {
  file: GatewayPendingAttachment;
}

export interface InputStates {
  text: string;
  files: File[];
}

export interface ChatState {
  gateway: Gateway;

  // UI State
  tooltipPopup?: TooltipPopupState;
  tooltipIndex: number;
  userPopup?: UserPopupState;
  viewerModal?: ViewerModalState;
  attachmentModal?: AttachmentModalState;
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
  setChatScroll: (top: string, center: string, bottom: string) => void;
  setUserScroll: (
    topGroup: string,
    topIndex: number,
    bottomGroup: string,
    bottomIndex: number
  ) => void;
  setTooltipPopup: (tooltipPopup: TooltipPopupState | undefined) => number;
  clearTooltipPopup: (idx: number) => void;
  setUserPopup: (userPopup: UserPopupState | undefined) => void;
  setViewerModal: (viewerModal: ViewerModalState | undefined) => void;
  setAttachmentModal: (
    attachmentModal: AttachmentModalState | undefined
  ) => void;
  setShowingUserList: (showingMemberList: boolean) => void;
  setEditorState: (state: string) => void;
  setAttachments: (
    add: GatewayPendingAttachment[],
    remove: GatewayPendingAttachment[],
    update: GatewayPendingAttachment[]
  ) => void;

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
    setChatScroll: async (top, center, bottom) =>
      set(
        produce((state: ChatState) => {
          state.gateway.setChatScroll(top, center, bottom);
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
    setUserPopup: (userPopup) =>
      set(
        produce((state: ChatState) => {
          state.userPopup = userPopup;
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

    _u: 0,
    update: (state: ChatState) => {
      if (state.gateway.requests.length > 0) {
        state.requests.push(...state.gateway.requests);
        state.gateway.requests = [];
      }
      state._u++;
    },
  };
});

export const useChatStateShallow = <T,>(selector: (state: ChatState) => T) =>
  useChatState(useShallow(selector));
