// @refresh reset
import { useState, useEffect, useMemo, useRef } from "react";

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
  public requests = `requests` as const;
  public attachmentModal = `attachmentModal` as const;
  public deleteMessageModal = `deleteMessageModal` as const;
  public errorModal = `errorModal` as const;
  public viewerModal = `viewerModal` as const;
  public contextMenuPopup = `contextMenuPopup` as const;
  public emojiPickerPopup = `emojiPickerPopup` as const;
  public tooltipPopup = `tooltipPopup` as const;
  public userPopup = `userPopup` as const;
}

export const ClackEvents = new ClackEventsClass();
export class ClackState {
  chat: ChatState = new ChatState();
  gui: GUIState = new GUIState();
}

export const clackEventBus = new EventBus();
export const clackState = new ClackState();

export function useClackState<T>(
  eventKey: string,
  selector: (state: ClackState) => T
): T {
  return useEventBus(clackEventBus, eventKey, () => {
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
    clackEventBus,
    (events) => {
      return selector(clackState, events);
    },
    deps
  );
}

export function updateClackState(event: string): void {
  console.log("EMIT", event);
  clackEventBus.emit(event);
}
