// @refresh reset
import { useState, useEffect, useMemo, useRef } from "react";
import { dequal } from "dequal";

import { ChatState } from "./state/chat";
import { GUIState } from "./state/gui";

import { EventBus, useEventBus, useEventBusDynamic } from "./state/events";

export class ClackEventsClass {
  message(id: string): string {
    return `message:${id}`;
  }
  channel(id: string): string {
    return `channel:${id}`;
  }
  user(id: string): string {
    return `user:${id}`;
  }
  role(id: string): string {
    return `role:${id}`;
  }
  reactions(id: string): string {
    return `reactions:${id}`;
  }
  contextMenu(id: string): string {
    return `contextmenu:${id}`;
  }

  public roleList = `roleList` as const;
  public channelList = `channelList` as const;
  public userList = `userList` as const;
  public settings = `settings` as const;
  public captcha = `captcha` as const;
  public auth = `auth` as const;
  public current = `current` as const;
  public anchor = `anchor` as const;
  public requests = `requests` as const;
  public attachmentModal = `attachmentModal` as const;
  public messageDeleteModal = `messageDeleteModal` as const;
  public messageReactionsModal = `messageReactionsModal` as const;
  public errorModal = `errorModal` as const;
  public generalModal = `generalModal` as const;
  public avatarModal = `avatarModal` as const;
  public viewerModal = `viewerModal` as const;
  public contextMenuPopup = `contextMenuPopup` as const;
  public emojiPickerPopup = `emojiPickerPopup` as const;
  public tooltipPopup = `tooltipPopup` as const;
  public reactionTooltipPopup = `reactionTooltipPopup` as const;
  public youPopup = `youPopup` as const;
  public colorPickerPopup = `colorPickerPopup` as const;
  public userPopup = `userPopup` as const;
  public editorFocus = `editorFocus` as const;
  public settingsTab = `settingsTab` as const;
  public dashboardTab = `dashboardTab` as const;
  public reset = `reset` as const;
}

export const ClackEvents = new ClackEventsClass();
export class ClackState {
  chat: ChatState;
  gui: GUIState;
  eventBus: EventBus;
  key: number = 0; // Used to force re-rendering of the app

  initialize = () => {
    this.chat = new ChatState();
    this.gui = new GUIState();
    this.eventBus = new EventBus();
  };

  reset = () => {
    this.key += 1;
    this.eventBus.emit(ClackEvents.reset);
    this.eventBus.clear();

    this.initialize();
  };

  constructor() {
    this.initialize();
  }
}

export const clackState = new ClackState();

export function useClackState<T>(
  eventKey: string,
  selector: (state: ClackState) => T
): T {
  return useEventBus(clackState.eventBus, eventKey, () => {
    return selector(clackState);
  });
}

export function getClackState<T>(selector: (state: ClackState) => T): T {
  return selector(clackState);
}

export function useClackStateDynamic<T>(
  selector: (state: ClackState, events: string[]) => T,
  deps: React.DependencyList = []
): T {
  return useEventBusDynamic(
    clackState.eventBus,
    (events) => {
      return selector(clackState, events);
    },
    deps
  );
}

export function updateClackState(event: string): void {
  //console.log("EMIT", event);
  clackState.eventBus.emit(event);
}

export function updateClackStateConditional(
  event: string,
  oldValue: any,
  newValue: any
): void {
  if (!dequal(oldValue, newValue)) {
    updateClackState(event);
  }
}
