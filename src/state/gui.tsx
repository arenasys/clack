import { ChatPendingAttachment } from "./chat";
import {
  Viewable,
  Snowflake,
  User,
  Channel,
  Emoji,
  Role,
  ChannelType,
  ErrorResponse,
} from "../types";
import { updateClackState, ClackEvents } from "../state";

export interface TooltipPopupState {
  content: string;
  direction: "top" | "bottom" | "left" | "right";
  position: { x: number; y: number };
  ref?: HTMLElement;
}

export interface UserPopupState {
  id: Snowflake;
  direction: "left" | "right";
  position: { x: number; y: number };
}

export interface EmojiPickerPopupState {
  position: { x: number; y: number };
  direction: "top" | "bottom";
  className?: string;
  onPick: (id: Snowflake, text: string) => void;
  onClose: () => void;
}

export interface YouPopupState {
  position: { x: number; y: number };
}
export interface ColorPickerPopup {
  position: { x: number; y: number };
  color: string;
  onChange: (string) => void;
}
export interface ReactionTooltipPopupState {
  message: Snowflake;
  emoji: Snowflake;
  position: { x: number; y: number };
}

export interface ViewerModalState {
  items: Viewable[];
  index: number;
}

export interface AttachmentModalState {
  file: ChatPendingAttachment;
}

export interface ContextMenuState {
  type: string;
  id: string;
  content: JSX.Element;
}

export interface MessageDeleteModalState {
  message: Snowflake;
}

export interface MessageReactionsModalState {
  message: Snowflake;
}

export interface ErrorModalState {
  error: ErrorResponse | string;
}

export interface GeneralModalInput {
  name: string;
  label: string;
  type: "text" | "password";
}
export interface GeneralModalState {
  title: string;
  description?: string;
  inputs?: GeneralModalInput[];
  className?: string;

  acceptLabel?: string;
  closeLabel?: string;
  onAccept?: (data: Record<string, string>) => void;
  onClose?: () => void;
}

export interface AvatarModalState {
  size: number;
  onAccept?: (avatar: Blob) => void;
  onClose?: () => void;
}

// --- Utility Function ---
function changeAnchoring(position: { x: number; y: number }): {
  x: number;
  y: number;
} {
  const windowRect = document.documentElement.getBoundingClientRect();
  return {
    x: windowRect.width - position.x,
    y: windowRect.height - position.y,
  };
}

export enum SettingsTab {
  MyAccount = "my-account",
  Profile = "profile",
  Appearance = "appearance",
  VoiceAndVideo = "voice-and-video",
  Notifications = "notifications",
}

export enum DashboardTab {
  Overview = "overview",
  Members = "members",
  Roles = "roles",
  Channels = "channels",
}

export class GUIState {
  // UI State
  public tooltipPopup?: TooltipPopupState;
  private tooltipIndex = 1;
  private tooltipLastPosition?: { x: number; y: number };

  public userPopup?: UserPopupState;
  public emojiPickerPopup?: EmojiPickerPopupState;
  public contextMenuPopup?: ContextMenuState;
  public reactionTooltipPopup?: ReactionTooltipPopupState;
  public youPopup?: YouPopupState;
  public colorPickerPopup?: ColorPickerPopup;
  public viewerModal?: ViewerModalState;
  public attachmentModal?: AttachmentModalState;
  public messageDeleteModal?: MessageDeleteModalState;
  public messageReactionsModal?: MessageReactionsModalState;
  public errorModal?: ErrorModalState;
  public generalModal?: GeneralModalState;
  public avatarModal?: AvatarModalState;
  public showingUserList = true;
  public settingsTab?: SettingsTab;
  public dashboardTab?: DashboardTab;

  // --- Popup & Modal Controls ---
  public setTooltipPopup = (popup?: TooltipPopupState): number => {
    if (popup === this.tooltipPopup) return this.tooltipIndex;
    this.tooltipPopup = popup;
    this.tooltipIndex += 1;

    if (popup && popup.ref) {
      const rect = popup.ref.getBoundingClientRect();
      this.tooltipLastPosition = { x: rect.left, y: rect.top };
    } else {
      this.tooltipLastPosition = undefined;
    }

    updateClackState(ClackEvents.tooltipPopup);
    return this.tooltipIndex;
  };

  public clearTooltipPopup = (idx: number) => {
    console.log("CLEAR TOOLTIP", idx);
    if (this.tooltipIndex === idx) {
      this.tooltipPopup = undefined;
      updateClackState(ClackEvents.tooltipPopup);
    }
  };

  public updateTooltipPopup = (idx: number, content: string) => {
    if (this.tooltipIndex === idx) {
      this.tooltipPopup.content = content;
      updateClackState(ClackEvents.tooltipPopup);
    }
  };

  public scrolledTooltipPopup = () => {
    if (
      this.tooltipPopup &&
      this.tooltipPopup.ref &&
      this.tooltipLastPosition
    ) {
      const rect = this.tooltipPopup.ref.getBoundingClientRect();
      if (
        this.tooltipLastPosition.x !== rect.left ||
        this.tooltipLastPosition.y !== rect.top
      ) {
        this.setTooltipPopup(undefined);
      }
    }
  };

  public setReactionTooltipPopup = (popup?: ReactionTooltipPopupState) => {
    this.reactionTooltipPopup = popup;
    updateClackState(ClackEvents.reactionTooltipPopup);
  };

  public setUserPopup = (popup?: UserPopupState) => {
    if (popup && popup.direction === "left") {
      popup.position = changeAnchoring(popup.position);
    }
    this.userPopup = popup;
    updateClackState(ClackEvents.userPopup);
  };

  public setContextMenuPopup = (popup?: ContextMenuState) => {
    var old = this.contextMenuPopup?.id;
    this.contextMenuPopup = popup;
    updateClackState(ClackEvents.contextMenuPopup);
    updateClackState(ClackEvents.contextMenu(old ?? ""));
    updateClackState(ClackEvents.contextMenu(popup?.id ?? ""));
  };

  public setEmojiPickerPopup = (popup?: EmojiPickerPopupState) => {
    if (popup) {
      popup.position = changeAnchoring(popup.position);
    }
    this.emojiPickerPopup?.onClose();
    this.emojiPickerPopup = popup;
    updateClackState(ClackEvents.emojiPickerPopup);
  };

  public setYouPopup = (popup?: YouPopupState) => {
    this.youPopup = popup;
    updateClackState(ClackEvents.youPopup);
  };

  public setColorPickerPopup = (popup?: ColorPickerPopup) => {
    this.colorPickerPopup = popup;
    updateClackState(ClackEvents.colorPickerPopup);
  };

  public setViewerModal = (popup?: ViewerModalState) => {
    this.viewerModal = popup;
    updateClackState(ClackEvents.viewerModal);
  };

  public setAttachmentModal = (popup?: AttachmentModalState) => {
    this.attachmentModal = popup;
    updateClackState(ClackEvents.attachmentModal);
  };

  public setMessageDeleteModal = (popup?: MessageDeleteModalState) => {
    this.messageDeleteModal = popup;
    updateClackState(ClackEvents.messageDeleteModal);
  };

  public setMessageReactionsModal = (popup?: MessageReactionsModalState) => {
    this.messageReactionsModal = popup;
    updateClackState(ClackEvents.messageReactionsModal);
  };

  public setErrorModal = (popup?: ErrorModalState) => {
    this.errorModal = popup;
    updateClackState(ClackEvents.errorModal);
  };

  public setGeneralModal = (popup?: GeneralModalState) => {
    this.generalModal = popup;
    updateClackState(ClackEvents.generalModal);
  };

  public setAvatarModal = (popup?: AvatarModalState) => {
    this.avatarModal = popup;
    updateClackState(ClackEvents.avatarModal);
  };

  public setShowingUserList = (show: boolean) => {
    this.showingUserList = show;
    updateClackState(ClackEvents.userList);
  };

  public setSettingsTab = (tab?: SettingsTab) => {
    this.settingsTab = tab;
    updateClackState(ClackEvents.settingsTab);
  };

  public setDashboardTab = (tab?: DashboardTab) => {
    this.dashboardTab = tab;
    updateClackState(ClackEvents.dashboardTab);
  };

  public hasModal = () => {
    return (
      this.viewerModal !== undefined ||
      this.attachmentModal !== undefined ||
      this.messageDeleteModal !== undefined ||
      this.errorModal !== undefined
    );
  };
}
