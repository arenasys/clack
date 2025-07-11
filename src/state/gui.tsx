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

// --- Popup and Modal State Interfaces ---
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
  file: ChatPendingAttachment;
}

export interface MessageContextMenuState {
  message: Snowflake;
  position: { x: number; y: number };
  offset: { x: number; y: number };
  static: boolean;
}

export interface MessageDeleteModalState {
  message: Snowflake;
}

export interface ErrorModalState {
  error: ErrorResponse;
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

export class GUIState {
  // UI State
  public tooltipPopup?: TooltipPopupState;
  private tooltipIndex = 1;
  public userPopup?: UserPopupState;
  public emojiPickerPopup?: EmojiPickerPopupState;
  public contextMenuPopup?: MessageContextMenuState;
  public viewerModal?: ViewerModalState;
  public attachmentModal?: AttachmentModalState;
  public messageDeleteModal?: MessageDeleteModalState;
  public errorModal?: ErrorModalState;
  public showingUserList = true;

  // --- Popup & Modal Controls ---
  public setTooltipPopup = (popup?: TooltipPopupState): number => {
    if (popup === this.tooltipPopup) return this.tooltipIndex;
    this.tooltipPopup = popup;
    this.tooltipIndex += 1;
    updateClackState(ClackEvents.tooltipPopup);
    return this.tooltipIndex;
  };

  public clearTooltipPopup = (idx: number) => {
    if (this.tooltipIndex === idx) {
      this.tooltipPopup = undefined;
      updateClackState(ClackEvents.tooltipPopup);
    }
  };

  public setUserPopup = (popup?: UserPopupState) => {
    if (popup && popup.direction === "left") {
      popup.position = changeAnchoring(popup.position);
    }
    this.userPopup = popup;
    updateClackState(ClackEvents.userPopup);
  };

  public setContextMenuPopup = (popup?: MessageContextMenuState) => {
    console.log("Setting context menu popup", popup);
    var oldPopupMessage = this.contextMenuPopup?.message;
    this.contextMenuPopup = popup;
    updateClackState(ClackEvents.contextMenuPopup);
    updateClackState(ClackEvents.contextMenu(oldPopupMessage ?? ""));
    updateClackState(ClackEvents.contextMenu(popup?.message ?? ""));
  };

  public setEmojiPickerPopup = (popup?: EmojiPickerPopupState) => {
    if (popup) {
      popup.position = changeAnchoring(popup.position);
    }
    this.emojiPickerPopup?.onClose();
    this.emojiPickerPopup = popup;
    updateClackState(ClackEvents.emojiPickerPopup);
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
    updateClackState(ClackEvents.deleteMessageModal);
  };

  public setErrorModal = (popup?: ErrorModalState) => {
    this.errorModal = popup;
    updateClackState(ClackEvents.errorModal);
  };

  public setShowingUserList = (show: boolean) => {
    this.showingUserList = show;
    updateClackState(ClackEvents.userList);
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
