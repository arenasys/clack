import {
  User,
  Channel,
  Role,
  Emoji,
  Reaction,
  Message,
  Snowflake,
  ChannelType,
  AttachmentType,
  MessageType,
  Permissions,
  HasPermission,
  OverwriteType,
  EventType,
  ErrorCode,
  ErrorResponse,
  SettingsResponse,
  OverviewResponse,
  MessageSendRequest,
  MessagesRequest,
  MessagesResponse,
  UserListRequest,
  UserListResponse,
  UsersRequest,
  UsersResponse,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  MessageDeleteEvent,
  MessageAddEvent,
  MessageUpdateEvent,
  MessageSendResponse,
  ReactionAddEvent,
  ReactionDeleteEvent,
  ReactionUsersResponse,
  UploadSlotResponse,
  UserUpdateRequest,
  UserAddEvent,
  UserDeleteEvent,
  UserUpdateEvent,
  RoleAddRequest,
  RoleUpdateRequest,
  RoleDeleteRequest,
  RoleAddEvent,
  RoleUpdateEvent,
  RoleDeleteEvent,
  UserRoleAddRequest,
  UserRoleDeleteRequest,
} from "../types";

import { dequal } from "dequal";
import fuzzysort from "fuzzysort";

import { EmojiSearchByPartialName } from "../emoji";

import {
  ClackEvents,
  getClackState,
  updateClackState,
  updateClackStateConditional,
} from "../state";

import { MakeSnowflake, GetFileType } from "../util";

const baseURL = `${window.location.protocol}//${window.location.host}`;
const previewURL = (message_id: Snowflake, id: Snowflake) =>
  `${baseURL}/previews/${message_id}/${id}?type=thumbnail`;
const displayURL = (message_id: Snowflake, id: Snowflake) =>
  `${baseURL}/previews/${message_id}/${id}?type=display`;
const originalURL = (message_id: Snowflake, id: Snowflake, filename: string) =>
  `${baseURL}/attachments/${message_id}/${id}/${encodeURIComponent(filename)}`;
const proxyURL = (message_id: Snowflake, id: Snowflake, url: string) =>
  `${baseURL}/external/${message_id}/${id}?url=${encodeURIComponent(url)}`;
const uploadURL = (slot: Snowflake) =>
  `${baseURL}/upload/${slot}`;

export const avatarPreviewURL = (user: User) => {
  if (user.avatarURL) {
    return user.avatarURL;
  }
  if (user.avatarModified == 0) {
    return `${baseURL}/avatar.png`;
  }
  return `${baseURL}/avatars/${user.id}/${user.avatarModified}?type=thumbnail`;
};

export const avatarDisplayURL = (user: User) => {
  if (user.avatarURL) {
    return user.avatarURL;
  }
  if (user.avatarModified == 0) {
    return `${baseURL}/avatar.png`;
  }
  return `${baseURL}/avatars/${user.id}/${user.avatarModified}?type=display`;
};

export interface ChatChannelGroup {
  category?: Snowflake;
  channels: Snowflake[];
}
export interface ChatPendingAttachment {
  id: Snowflake;
  file: File;
  spoilered: boolean;
  filename: string;
  type: AttachmentType;
  mimetype: string;
  blobURL: string;
}

export function FilesToChatAttachments(files: File[]): ChatPendingAttachment[] {
  return files.map((file) => {
    return {
      id: MakeSnowflake(),
      file: file,
      filename: file.name,
      spoilered: false,
      type: GetFileType(file.type),
      mimetype: file.type,
      blobURL: "",
    };
  });
}

export class ChatChannelState {
  messages: Snowflake[] = [];

  anchor?: Snowflake;
  editor: string = "";
  attachments: ChatPendingAttachment[] = [];
  replyingTo: Snowflake | undefined = undefined;
  jumpedTo: Snowflake | undefined = undefined;

  firstMessage?: Snowflake;
  lastMessage?: Snowflake;

  fetching: boolean = false;

  topSkeletons: Snowflake[] = this.makeSkeletons(25);
  bottomSkeletons: Snowflake[] = this.makeSkeletons(25);

  pendingMessages: Snowflake[] = [];
  pendingAttachments: Map<Snowflake, ChatPendingAttachment[]> = new Map();

  makeSkeletons(count: number): Snowflake[] {
    const skeletons = [];
    for (var i = 0; i < count; i++) {
      var seed = self.crypto.getRandomValues(new Uint8Array(16));
      var id = Array.from(seed)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      skeletons.push(`skeleton-${id}`);
    }
    return skeletons;
  }

  getMessageView() {
    var msgs = [...this.messages];

    if (this.pendingMessages.length > 0) {
      msgs = [...msgs, ...this.pendingMessages].sort((a, b) => {
        return Number(BigInt(a) - BigInt(b));
      });
    }

    if (!this.firstMessage || this.messages[0] !== this.firstMessage) {
      msgs = [...this.topSkeletons, ...msgs];
    }
    if (
      !this.lastMessage ||
      this.messages[this.messages.length - 1] !== this.lastMessage
    ) {
      msgs = [...msgs, ...this.bottomSkeletons];
    }
    return msgs;
  }

  addMessages(msg: MessagesResponse, current: boolean = false) {
    const messages = msg.messages.map((m) => m.id);
    //.filter((id) => !this.messages.includes(id));

    if (this.messages.length > 100) {
      if (msg.after) {
        this.messages = this.messages.splice(-50);
      } else {
        this.messages = this.messages.splice(0, 50);
      }
    }
    if (msg.before && msg.after) {
      this.messages = [...messages];
      if (
        this.anchor?.startsWith("skeleton-") ||
        !(this.anchor ?? "" in this.messages)
      ) {
        this.setAnchor(msg.after, current);
      }
      var i = messages.indexOf(msg.before);
      if (i != msg.limit + 1) {
        this.firstMessage = messages[0];
      }
      if (messages.length - i < msg.limit) {
        this.lastMessage = messages[messages.length - 1];
      }
    } else if (msg.after) {
      if (messages.length === 0) {
        this.lastMessage = msg.after;
      } else {
        const index = this.messages.indexOf(msg.after);
        if (index !== -1) {
          this.messages.splice(index + 1, 0, ...messages);
        }
        if (
          this.anchor?.startsWith("skeleton-") ||
          !(this.anchor ?? "" in this.messages)
        ) {
          this.setAnchor(msg.after, current);
        }
        if (messages.length < msg.limit) {
          this.lastMessage = messages[messages.length - 1];
        }
      }
    } else if (msg.before) {
      if (messages.length === 0) {
        this.firstMessage = msg.before;
      } else {
        const index = this.messages.indexOf(msg.before);
        if (index !== -1) {
          this.messages.splice(index, 0, ...messages);
        }
        if (
          this.anchor?.startsWith("skeleton-") ||
          !(this.anchor ?? "" in this.messages)
        ) {
          this.setAnchor(msg.before, current);
        }
        if (messages.length < msg.limit) {
          this.firstMessage = messages[0];
        }
      }
    } else {
      //this.lastMessage = messages[messages.length - 1];
      this.messages.push(...messages);
      this.lastMessage = messages[messages.length - 1];
      this.setAnchor(messages[messages.length - 1], current);
    }
  }

  addMessage(msg: Message, marker?: Snowflake) {
    var id = BigInt(msg.id);

    var last = BigInt(this.messages[this.messages.length - 1]);
    if (id > last) {
      this.messages.push(msg.id);
    } else {
      for (var i = 0; i < this.messages.length; i++) {
        var m = BigInt(this.messages[i]);
        if (id < m) {
          this.messages.splice(i, 0, msg.id);
        }
      }
    }

    if (this.lastMessage != undefined) {
      this.lastMessage = this.messages[this.messages.length - 1];
    }

    if (marker) {
      this.pendingMessages = this.pendingMessages.filter((m) => m !== marker);
    }
  }

  addPendingMessage(marker: Snowflake) {
    this.pendingMessages.push(marker);
  }

  setAnchor(newAnchor: Snowflake | undefined, update = true) {
    if (this.anchor !== newAnchor) {
      const oldAnchor = this.anchor;
      this.anchor = newAnchor;

      if (update) {
        updateClackState(ClackEvents.anchor);
      }

      // Show the anchor in the UI
      /*if (oldAnchor !== undefined) {
        document.getElementById(oldAnchor)?.classList.remove("anchored");
      }
      if (newAnchor !== undefined) {
        document.getElementById(newAnchor)?.classList.add("anchored");
      }*/
    }
  }

  clear() {
    this.messages = [];
    this.anchor = undefined;
    this.firstMessage = undefined;
    this.lastMessage = undefined;
  }

  constructor() {}
}

export class ChatUserList {
  list: Map<number, Snowflake> = new Map(); // index => userID
  groups: Map<Snowflake, number> = new Map(); // groupID => count
  fetching: boolean = false;

  setRequest(req: UserListRequest) {
    this.fetching = true;

    const start = Math.max(0, req.start | 0);
    const end = Math.max(start, req.end | 0);
    if (end <= start) return;

    for (let i = start; i < end; i++) {
      if (!this.list.has(i)) {
        this.list.set(i, `skeleton-${i}`);
      }
    }
  }

  setResponse(msg: UserListResponse) {
    this.fetching = false;
    this.list = new Map();
    msg.slice.forEach((id, index) => {
      this.list.set(msg.start + index, id);
    });
    this.groups = new Map();
    msg.groups.forEach((group) => {
      this.groups.set(group.id, group.count);
    });
  }
  constructor() {}
}

export class ChatRoleStore {
  store: Map<Snowflake, Role> = new Map();
  order: Snowflake[] = [];

  constructor() {}

  setRoles(roles: Role[]) {
    roles = roles.sort((a, b) => a.position - b.position);

    this.store = new Map();
    for (let role of roles) {
      this.store.set(role.id, role);
    }

    this.updateOrder();
  }

  insertRole(role: Role) {
    this.store.set(role.id, role);
    this.updateOrder();
  }

  updateOrder() {
    const roles = Array.from(this.store.values()).sort(
      (a, b) => a.position - b.position
    );
    this.order = roles.map((r) => r.id);
  }

  deleteRole(id: Snowflake) {
    this.store.delete(id);
    this.order = this.order.filter((rid) => rid !== id);
  }

  orderRoles(roles: Role[]) {
    return roles.sort((a, b) => {
      var aIdx = this.order.indexOf(a.id);
      var bIdx = this.order.indexOf(b.id);
      return aIdx - bIdx;
    });
  }

  getRoles(ids: Snowflake[]) {
    return this.orderRoles(
      ids.map((id) => this.store.get(id)).filter((r) => r != undefined)
    );
  }

  getAll() {
    return this.orderRoles(Array.from(this.store.values()));
  }

  get(id: Snowflake) {
    return this.store.get(id);
  }
}

export class ChatReactionUserStore {
  store: Map<Snowflake, Snowflake[]> = new Map(); // emoji => users
  fetching: boolean = false;

  setReactionUsers(emoji: Snowflake, users: Snowflake[]) {
    this.store.set(emoji, users);
  }

  getReactionUsers(emoji: Snowflake): Snowflake[] | undefined {
    return this.store.get(emoji);
  }

  addReactionUser(emoji: Snowflake, user: Snowflake) {
    if (!this.store.has(emoji)) return;
    const users = this.store.get(emoji);
    if (users && !users.includes(user)) {
      users.push(user);
    }
  }

  deleteReactionUser(emoji: Snowflake, user: Snowflake) {
    if (!this.store.has(emoji)) return;
    const users = this.store.get(emoji);
    if (users) {
      const index = users.indexOf(user);
      if (index !== -1) {
        users.splice(index, 1);
      }
    }
  }
}

interface PendingMessage {
  marker: Snowflake;
  channel: Snowflake;
  message?: Snowflake;
  attachments?: ChatPendingAttachment[];
  progress?: number;
  size?: number;
  request?: XMLHttpRequest;
}

interface PendingAvatar {
  marker: Snowflake;
  data: Blob;
}

function FilesToForm(
  blobs: Blob[],
  filenames: string[],
  metadata?: Record<string, any>[]
) {
  const form = new FormData();
  blobs.forEach((b, i) => {
    const f = filenames[i];
    var m = {
      filename: f,
      size: b.size,
    };
    if (metadata && metadata[i]) {
      m = { ...m, ...metadata[i] };
    }

    form.append(`metadata_${i}`, JSON.stringify(m));
    form.append(`file_${i}`, b, f);
  });
  return form;
}

export const enum ChatAuthState {
  Disconnected = 0,
  Login = 1,
  TryLogin = 2,
  OkLogin = 3,
  Register = 4,
  TryRegister = 5,
  OkRegister = 6,
  Loading = 7,
  Connected = 8,
}

export class ChatState {
  users: Map<Snowflake, User> = new Map();
  channels: Map<Snowflake, Channel> = new Map();
  roles: ChatRoleStore = new ChatRoleStore();
  messages: Map<Snowflake, Message> = new Map();

  channelGroups: ChatChannelGroup[] = [];
  userList: ChatUserList = new ChatUserList();
  channelStates: Map<Snowflake, ChatChannelState> = new Map();
  reactionUsers: Map<Snowflake, ChatReactionUserStore> = new Map();

  authState: ChatAuthState = ChatAuthState.Disconnected;
  authError: ErrorResponse | undefined = undefined;
  error: ErrorResponse | undefined = undefined;

  requests: any[] = [];
  requestPendingCaptcha: any | undefined = undefined;

  currentChannel?: Snowflake = undefined;
  currentUser?: Snowflake = undefined;
  currentMessages: Snowflake[] = [];
  currentMessagesIsCombined: Map<Snowflake, boolean> = new Map();
  currentEditor: string = "";
  currentFiles: ChatPendingAttachment[] = [];
  currentReplyingTo: Snowflake | undefined = undefined;
  currentJumpedTo: Snowflake | undefined = undefined;
  currentJumpToPresent: boolean = false;

  pendingMessages: Map<Snowflake, PendingMessage> = new Map();
  pendingAvatar: PendingAvatar | undefined = undefined;

  userAnchor?: Snowflake = undefined;

  settings: SettingsResponse | undefined;

  login = (username: string, password: string) => {
    this.switchAuthState(ChatAuthState.TryLogin);

    const request: LoginRequest = { username, password };
    const event = { type: EventType.LoginRequest, data: request };

    if (this.settings?.usesLoginCaptcha) {
      this.pushRequestWithCaptcha(event);
    } else {
      this.pushRequest(event);
    }
  };

  logout = () => {
    localStorage.removeItem("token");
    this.switchAuthState(ChatAuthState.Disconnected);
  };

  register = (
    username: string,
    password: string,
    email: string | undefined,
    inviteCode: string | undefined
  ) => {
    this.switchAuthState(ChatAuthState.TryRegister);

    const request: RegisterRequest = { username, password, email, inviteCode };
    const event = { type: EventType.RegisterRequest, data: request };

    console.log(this.settings);
    if (this.settings?.usesCaptcha) {
      this.pushRequestWithCaptcha(event);
    } else {
      this.pushRequest(event);
    }
  };

  getPermissions = (
    userID: Snowflake,
    channelID: Snowflake | undefined
  ): number => {
    let allow = this.settings?.defaultPermissions ?? 0;
    let deny = 0;

    const user = this.users.get(userID);
    if (!user) return 0;

    for (const roleID of user.roles) {
      const role = this.roles.get(roleID);
      if (role) allow |= role.permissions;
    }

    if (channelID !== undefined) {
      const channel = this.channels.get(channelID);
      if (channel) {
        for (const overwrite of channel.overwrites ?? []) {
          if (
            overwrite.type === OverwriteType.Role &&
            user.roles.includes(overwrite.id)
          ) {
            allow |= overwrite.allow;
            deny |= overwrite.deny;
          } else if (
            overwrite.type === OverwriteType.User &&
            overwrite.id === userID
          ) {
            allow |= overwrite.allow;
            deny |= overwrite.deny;
          }
        }
      }
    }

    let permissions = allow & ~deny;
    if ((permissions & Permissions.Administrator) !== 0) {
      return Permissions.All;
    }
    return permissions;
  };

  hasPermission = (
    userID: Snowflake,
    channelID: Snowflake | undefined,
    permission: Permissions
  ): boolean => {
    const permissions = this.getPermissions(userID, channelID);
    return HasPermission(permissions, permission);
  };

  finishCaptcha = (captchaResponse: string | undefined) => {
    if (!this.requestPendingCaptcha) return;

    if (captchaResponse === undefined) {
      this.requestPendingCaptcha = undefined;
      if (this.authState === ChatAuthState.TryLogin) {
        this.switchAuthState(ChatAuthState.Login);
      }
      if (this.authState === ChatAuthState.TryRegister) {
        this.switchAuthState(ChatAuthState.Register);
      }
      return;
    }

    this.requestPendingCaptcha.data.captchaResponse = captchaResponse;
    this.pushRequest(this.requestPendingCaptcha);
    this.requestPendingCaptcha = undefined;
    updateClackState(ClackEvents.captcha);
  };

  processRoles = (roles: Role[]) => {
    this.roles.setRoles(roles);
    console.log("ROLES", roles);
    updateClackState(ClackEvents.roleList);
  };

  addRole = (req: RoleAddRequest) => {
    this.pushRequest({ type: EventType.RoleAdd, data: req });
  };

  updateRole = (req: RoleUpdateRequest) => {
    this.pushRequest({ type: EventType.RoleUpdate, data: req });
  };

  deleteRole = (role: Snowflake) => {
    const req: RoleDeleteRequest = { role };
    this.pushRequest({ type: EventType.RoleDelete, data: req });
  };

  addUserRole = (user: Snowflake, role: Snowflake) => {
    const req: UserRoleAddRequest = { user, role };
    this.pushRequest({ type: EventType.UserRoleAdd, data: req });
  };

  deleteUserRole = (user: Snowflake, role: Snowflake) => {
    const req: UserRoleDeleteRequest = { user, role };
    this.pushRequest({ type: EventType.UserRoleDelete, data: req });
  };

  processChannels = (channels: Channel[]) => {
    channels.forEach((channel) => {
      this.channels.set(channel.id, channel);
      this.channelStates.set(channel.id, new ChatChannelState());
    });

    channels.forEach((channel) => {
      channel.parentName = this.channels.get(channel.parent)?.name;
      channel.overwrites = channel.overwrites ?? [];
      this.channels.set(channel.id, channel);
    });

    this.channelGroups = [];
    const orphanChannels = Array.from(this.channels.values())
      .filter((ch) => ch.type !== ChannelType.Category && !ch.parent)
      .sort((a, b) => a.position - b.position);

    if (orphanChannels.length) {
      this.channelGroups.push({ channels: orphanChannels.map((c) => c.id) });
    }

    const categories = Array.from(this.channels.values())
      .filter((ch) => ch.type === ChannelType.Category && !ch.parent)
      .sort((a, b) => a.position - b.position);

    categories.forEach((category) => {
      const grouped = Array.from(this.channels.values())
        .filter(
          (ch) => ch.type !== ChannelType.Category && ch.parent === category.id
        )
        .sort((a, b) => a.position - b.position);
      this.channelGroups.push({
        category: category.id,
        channels: grouped.map((c) => c.id),
      });
    });

    updateClackState(ClackEvents.channelList);
  };

  syncCurrent = (state: ChatChannelState) => {
    this.currentMessages = state.getMessageView();
    this.currentMessagesIsCombined.clear();

    for (let i = 1; i < this.currentMessages.length; i++) {
      const prev = this.messages.get(this.currentMessages[i - 1]);
      const curr = this.messages.get(this.currentMessages[i]);
      if (!prev || !curr) continue;

      const sameAuthor = curr.author === prev.author;
      const combined =
        sameAuthor && curr.timestamp - prev.timestamp < 1000 * 60 * 5;
      this.currentMessagesIsCombined.set(curr.id, combined);
    }

    this.currentEditor = state.editor;
    this.currentFiles = state.attachments;

    function changeMessage(
      oldID: Snowflake | undefined,
      newID: Snowflake | undefined
    ) {
      if (oldID === newID) return;
      if (oldID != undefined) {
        updateClackState(ClackEvents.message(oldID));
      }
      if (newID != undefined) {
        updateClackState(ClackEvents.message(newID));
      }
    }

    const oldReplyingTo = this.currentReplyingTo;
    this.currentReplyingTo = state.replyingTo;
    changeMessage(oldReplyingTo, this.currentReplyingTo);

    const oldJumpedTo = this.currentJumpedTo;
    this.currentJumpedTo = state.jumpedTo;
    changeMessage(oldJumpedTo, this.currentJumpedTo);

    this.currentJumpToPresent =
      state.lastMessage !== state.messages[state.messages.length - 1];

    updateClackState(ClackEvents.current);
  };

  setChatScroll = (
    top: Snowflake,
    center: Snowflake,
    bottom: Snowflake,
    fetch: boolean
  ) => {
    if (!this.currentChannel) return;
    const state = this.channelStates.get(this.currentChannel);
    if (!state) return;

    state.setAnchor(center, false);

    if (state.fetching) return;

    const topIdx = this.currentMessages.indexOf(top);
    const bottomIdx = this.currentMessages.indexOf(bottom);
    const margin = 33; // 8 + 25

    if (
      topIdx >= 0 &&
      topIdx < margin &&
      state.messages[0] !== state.firstMessage &&
      fetch
    ) {
      state.fetching = true;
      this.pushRequest({
        type: EventType.MessagesRequest,
        data: {
          channel: this.currentChannel,
          limit: 50,
          before: state.messages[0],
        },
      });
    }
    if (
      bottomIdx >= 0 &&
      bottomIdx > this.currentMessages.length - margin &&
      state.messages[state.messages.length - 1] !== state.lastMessage &&
      fetch
    ) {
      state.fetching = true;
      this.pushRequest({
        type: EventType.MessagesRequest,
        data: {
          channel: this.currentChannel,
          limit: 50,
          after: state.messages[state.messages.length - 1],
        },
      });
    }
  };

  getChatScroll = (): Snowflake | undefined => {
    if (!this.currentChannel) return undefined;
    return this.channelStates.get(this.currentChannel)!.anchor;
  };

  jumpToMessage = (message: Snowflake | string | undefined, silent: boolean = false) => {
    if (!this.currentChannel) return;
    const state = this.channelStates.get(this.currentChannel);
    if (!state) return;

    if (message === undefined) {
      if (state.jumpedTo === undefined) return;
      state.jumpedTo = undefined;
      this.syncCurrent(state);
      return;
    }

    if (message === "bottom") {
      state.clear();
      state.fetching = true;
      this.pushRequest({
        type: EventType.MessagesRequest,
        data: { channel: this.currentChannel, limit: 50 },
      });
      this.syncCurrent(state);
      return;
    }

    state.setAnchor(message, true);

    if (!silent) {
      state.jumpedTo = message;
    }
    if (!state.messages.includes(message)) {
      state.messages = [];
      if (this.messages.has(message as Snowflake))
        state.messages.push(message as Snowflake);
      state.fetching = true;
      this.pushRequest({
        type: EventType.MessagesRequest,
        data: {
          channel: this.currentChannel,
          before: message,
          after: message,
          limit: 50,
        },
      });
    }

    this.syncCurrent(state);
  };

  setUserScroll = (start: number, end: number) => {
    if (this.authState !== ChatAuthState.Connected) return;
    if (this.userList.fetching) return;
    const req: UserListRequest = {
      start: start,
      end: end,
    };
    this.userList.setRequest(req);
    this.pushRequest({ type: EventType.UserListRequest, data: req });
  };

  setEditorState = (editor: string) => {
    if (!this.currentChannel) return;
    const state = this.channelStates.get(this.currentChannel);
    if (!state) return;

    state.editor = editor;
    // no need to sync each keystroke
  };

  setEditorFocused = () => {
    updateClackState(ClackEvents.editorFocus);
  };

  setAttachments = (
    add: ChatPendingAttachment[],
    remove: ChatPendingAttachment[],
    update: ChatPendingAttachment[]
  ) => {
    if (!this.currentChannel) return;
    const state = this.channelStates.get(this.currentChannel);
    if (!state) return;

    if (add.length)
      add.forEach((file) => {
        file.blobURL = URL.createObjectURL(file.file);
        state.attachments.push(file);
      });
    if (remove.length)
      remove.forEach((file) => URL.revokeObjectURL(file.blobURL));
    if (remove.length)
      state.attachments = state.attachments.filter((f) => !remove.includes(f));
    if (update.length)
      update.forEach((file) => {
        const idx = state.attachments.findIndex((f) => f.id === file.id);
        if (idx !== -1) state.attachments[idx] = file;
      });

    this.syncCurrent(state);
  };

  setReplyingTo = (message: Snowflake | undefined) => {
    const state = this.channelStates.get(this.currentChannel ?? "");
    if (!state) return;
    state.replyingTo = message;
    this.syncCurrent(state);
    this.setEditorFocused();
  };

  changeChannel = (channel: Snowflake) => {
    if (this.currentChannel === channel) return;

    this.currentChannel = channel;
    const state = this.channelStates.get(channel);
    if (!state) return;
    this.syncCurrent(state);
    if (!state.messages.length) {
      this.pushRequest({
        type: EventType.MessagesRequest,
        data: { channel, limit: 50 },
      });
    }

    updateClackState(ClackEvents.editorFocus);
  };

  sendMessage = (content: string) => {
    if (!this.currentUser || !this.currentChannel) return;
    const marker = MakeSnowflake();
    const state = this.channelStates.get(this.currentChannel)!;

    const attachments = state.attachments;
    state.attachments = [];

    const reference = state.replyingTo;
    state.replyingTo = undefined;

    const request: MessageSendRequest = {
      channel: this.currentChannel,
      content,
      reference,
      attachmentCount: attachments.length,
    };
    const msg: Message = {
      id: marker,
      type: MessageType.Default,
      author: this.currentUser,
      channel: this.currentChannel,
      content,
      timestamp: Date.now(),
    };

    this.messages.set(marker, msg);
    state.addPendingMessage(marker);
    this.pendingMessages.set(marker, {
      marker,
      channel: this.currentChannel,
      attachments,
      progress: 0,
      size: attachments.reduce((acc, a) => acc + a.file.size, 0),
    });

    this.syncCurrent(state);
    this.pushRequest({
      type: EventType.MessageSendRequest,
      seq: marker,
      data: request,
    });
  };

  onSendMessageResponse = (msg: MessageSendResponse, seq: Snowflake) => {
    const pending = this.pendingMessages.get(seq);
    if (!pending) return;
    pending.message = msg.message;
  };

  onSendMessageUploadSlot = (slot: Snowflake, seq: Snowflake) => {
    const pending = this.pendingMessages.get(seq);
    const attachments = pending?.attachments;

    if (!pending || !attachments || attachments.length === 0) return;

    const form = FilesToForm(
      attachments.map((att) => att.file),
      attachments.map((att) => att.filename),
      attachments.map((att) => ({
        spoilered: att.spoilered,
      }))
    );

    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadURL(slot), true);
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) pending.progress = (e.loaded / e.total) * 100;
    });
    xhr.addEventListener("load", () =>
      console.log("Upload complete", xhr.status)
    );
    xhr.addEventListener("error", () => console.error("Upload failed"));
    xhr.send(form);
    pending.request = xhr;
  };

  onUploadSlot = (msg: UploadSlotResponse, seq: Snowflake) => {
    console.log("UPLOAD SLOT", msg, seq);
    if (this.pendingMessages.has(seq)) {
      this.onSendMessageUploadSlot(msg.slot, seq);
    }
    if (this.pendingAvatar?.marker == seq) {
      this.onUserUpdateSlot(msg.slot, seq);
    }
  };

  cancelMessage = (seq: Snowflake) => {
    const pending = this.pendingMessages.get(seq);
    if (!pending) return;
    if (pending.request) pending.request.abort();
    this.pendingMessages.delete(seq);

    const state = this.channelStates.get(pending.channel);
    if (!state) return;
    state.pendingMessages = state.pendingMessages.filter((m) => m !== seq);
    this.syncCurrent(state);
  };

  updateMessage = (message: Snowflake, content: string) => {
    this.pushRequest({
      type: EventType.MessageUpdate,
      data: { message, content },
    });
    this.pendingMessages.set(message, { marker: message, channel: "" });
  };

  deleteMessage = (message: Snowflake) => {
    this.pushRequest({ type: EventType.MessageDelete, data: { message } });
  };

  toggleReaction = (message: Snowflake, emoji: Snowflake) => {
    const msg = this.messages.get(message);
    if (!msg) return undefined;
    const react = msg.reactions?.find((r) => r.emoji === emoji);

    if (react?.me) {
      this.onReactionDelete({
        message: message,
        user: this.currentUser!,
        emoji: emoji,
      });

      this.pushRequest({
        type: EventType.MessageReactionDelete,
        data: { message, emoji },
      });
    } else {
      this.onReactionAdd({
        message: message,
        user: this.currentUser!,
        emoji: emoji,
      });

      this.pushRequest({
        type: EventType.MessageReactionAdd,
        data: { message, emoji },
      });
    }
  };

  fetchReactionUsers = (message: Snowflake, emoji: Snowflake) => {
    if (!this.reactionUsers.has(message)) {
      this.reactionUsers.set(message, new ChatReactionUserStore());
    }

    const reactionStore = this.reactionUsers.get(message)!;
    if (reactionStore.fetching) return;
    reactionStore.fetching = true;

    console.log("FETCH", message, emoji);

    this.pushRequest({
      type: EventType.MessageReactionUsersRequest,
      data: { message, emoji },
    });
  };

  updateUser = (user: User, avatar?: Blob) => {
    var current = this.users.get(user.id)!;

    const avatarModified = user.avatarModified !== current.avatarModified;
    const profileModified =
      user.statusMessage !== current.statusMessage ||
      user.profileMessage !== current.profileMessage ||
      user.profileColor !== current.profileColor;
    const nameModified = user.displayName !== current.displayName;

    var request: UserUpdateRequest = {
      user: user.id,
      setAvatar: avatarModified,
      setProfile: profileModified,
      setName: nameModified,
    };

    if (profileModified) {
      request.statusMessage = user.statusMessage;
      request.profileMessage = user.profileMessage;
      request.profileColor = user.profileColor;
    }

    if (nameModified) {
      request.displayName = user.displayName;
    }

    if (avatarModified) {
      request.avatarModified = user.avatarModified;
    }

    console.log("UPDATE USER", request, user, current);

    if (avatarModified && avatar) {
      const marker = MakeSnowflake();

      this.pendingAvatar = {
        marker: marker,
        data: avatar,
      };

      this.pushRequest({
        type: EventType.UserUpdate,
        seq: marker,
        data: request,
      });
    } else {
      this.pushRequest({
        type: EventType.UserUpdate,
        data: request,
      });
    }
  };

  onUserUpdateSlot = (slot: Snowflake, seq: Snowflake) => {
    const form = FilesToForm([this.pendingAvatar!.data], ["avatar.png"]);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadURL(slot), true);
    xhr.addEventListener("error", () => console.error("Upload failed"));
    xhr.send(form);
  };

  onOverview = (msg: OverviewResponse) => {
    this.processRoles(msg.roles);
    this.processChannels(msg.channels);
    this.processUsers(msg.users);
    this.onUserList(msg.userList);
    this.currentUser = msg.you.id;
    this.processUsers([msg.you]);
    if (!this.currentChannel) {
      for (const group of this.channelGroups) {
        if (group.channels.length) {
          this.changeChannel(group.channels[0]);
          break;
        }
      }
    }
    this.switchAuthState(ChatAuthState.Connected);
  };

  onSettings = (msg: SettingsResponse) => {
    this.settings = msg;
    updateClackState(ClackEvents.settings);

    this.switchAuthState(
      msg.authenticated ? ChatAuthState.Loading : ChatAuthState.Login
    );
  };

  onToken = (msg: TokenResponse) => {
    localStorage.setItem("token", msg.token);
    if (this.authState === ChatAuthState.TryLogin)
      this.switchAuthState(ChatAuthState.OkLogin);
    if (this.authState === ChatAuthState.TryRegister)
      this.switchAuthState(ChatAuthState.OkRegister);
  };

  onError = (msg: ErrorResponse) => {
    if (this.authState === ChatAuthState.TryLogin)
      return this.switchAuthState(ChatAuthState.Login, msg);
    if (this.authState === ChatAuthState.TryRegister)
      return this.switchAuthState(ChatAuthState.Register, msg);
    if (msg.code === ErrorCode.InvalidToken)
      return this.switchAuthState(ChatAuthState.Loading);

    const setErrorModal = getClackState((state) => state.gui.setErrorModal);
    setErrorModal({
      error: msg,
    });
    updateClackState(ClackEvents.errorModal);
  };

  switchAuthState = (authState: ChatAuthState, error?: ErrorResponse) => {
    this.authState = authState;
    this.authError = error;
    updateClackState(ClackEvents.auth);
  };

  processMessages = (messages: Message[]) => {
    messages.forEach((m) => {
      for (const a of m.attachments ?? []) {
        if (a.type !== AttachmentType.File) {
          a.previewURL = previewURL(m.id, a.id);
          a.displayURL = displayURL(m.id, a.id);
        }
        a.originalURL = originalURL(m.id, a.id, a.filename);
      }
      for (const e of m.embeds ?? []) {
        const media = [
          e.image,
          e.thumbnail,
          e.author?.icon,
          e.footer?.icon,
          e.video,
        ];
        media.forEach((d) => {
          if (d) {
            d.type = AttachmentType.Image;
            d.previewURL = previewURL(m.id, d.id);
            d.displayURL = displayURL(m.id, d.id);
            d.proxyURL = proxyURL(m.id, e.id, d.url);
            d.originalURL = d.url;
          }
        });
        if (e.video) e.video.type = AttachmentType.Video;
      }
      for (const r of m.reactions ?? [])
        r.me = r.users.includes(this.currentUser ?? "");
      this.messages.set(m.id, m);
      updateClackState(ClackEvents.message(m.id));
    });
  };

  processUsers = (users: User[]) => {
    users.forEach((user) => {
      const oldUser = this.users.get(user.id);
      let color: number | undefined;
      let color_best = Number.MAX_VALUE;
      let rank = Number.MAX_VALUE;
      user.roles.forEach((roleId) => {
        const r = this.roles.get(roleId);
        if (r.position < rank) {
          rank = r.position;
        }
        if (r?.color && r.position < color_best) {
          color = r.color;
          color_best = r.position;
        }
      });
      user.roleColor = color;
      user.rank = rank;
      this.users.set(user.id, user);
      updateClackStateConditional(ClackEvents.user(user.id), oldUser, user);
    });
  };

  fetchUnknownUsers = (users: Snowflake[]) => {
    const unknown: Snowflake[] = [];

    [...new Set(users)].forEach((id) => {
      if (!this.users.has(id)) unknown.push(id);
    });
    if (unknown.length) {
      this.pushRequest({
        type: EventType.UsersRequest,
        data: { users: unknown },
      });
    }
  };

  onMessages = (msg: MessagesResponse) => {
    //console.log("ON MESSAGES", msg.channel, msg.messages.length);
    const all = [...msg.messages, ...(msg.references ?? [])];
    this.processMessages(all);

    var users = all.map((m) => m.author);
    all.forEach((m) => {
      m.reactions?.forEach((r) => {
        if (r.users) {
          users.push(...r.users);
        }
      });
    });
    this.fetchUnknownUsers(users);

    const state = this.channelStates.get(msg.channel);
    if (!state) return;
    state.fetching = false;

    const current = this.currentChannel === msg.channel;

    state.addMessages(msg, current);

    if (current) this.syncCurrent(state);
  };

  onMessageAdd = (msg: MessageAddEvent) => {
    this.processMessages([msg.message]);
    if (msg.reference) this.processMessages([msg.reference]);
    this.processUsers([msg.author]);
    const state = this.channelStates.get(msg.message.channel);
    if (!state) return;

    let marker: Snowflake | undefined;
    for (const m of this.pendingMessages.values()) {
      if (m.message === msg.message.id) {
        marker = m.marker;
        break;
      }
    }
    if (marker) this.pendingMessages.delete(marker);
    state.addMessage(msg.message, marker);
    if (this.currentChannel === msg.message.channel) this.syncCurrent(state);
  };

  onMessageUpdate = (msg: MessageUpdateEvent) => {
    console.log("ON MESSAGE UPDATE", msg);
    this.processMessages([msg.message]);
    if (this.pendingMessages.has(msg.message.id))
      this.pendingMessages.delete(msg.message.id);
  };

  onMessageDelete = (msg: MessageDeleteEvent) => {
    const channel = this.messages.get(msg.message)?.channel;
    this.messages.delete(msg.message);

    if (!channel) return;
    const state = this.channelStates.get(channel);

    if (state) {
      state.messages = state.messages.filter((m) => m !== msg.message);
      state.pendingMessages = state.pendingMessages.filter(
        (m) => m !== msg.message
      );
      if (this.currentChannel === msg.message) this.syncCurrent(state);
    }
    for (const [key, pending] of this.pendingMessages) {
      if (pending.message === msg.message) this.pendingMessages.delete(key);
    }

    updateClackState(ClackEvents.message(msg.message));
  };

  onReactionAdd = (msg: ReactionAddEvent) => {
    const isMe = msg.user === this.currentUser;

    this.fetchUnknownUsers([msg.user]);

    if (!this.messages.has(msg.message)) return;
    const message = this.messages.get(msg.message)!;

    const store = this.reactionUsers.get(msg.message);
    if (store) {
      store.addReactionUser(msg.emoji, msg.user);
    }

    let react = message.reactions?.find((r) => r.emoji === msg.emoji);
    if (!react) {
      react = {
        emoji: msg.emoji,
        users: [msg.user],
        count: 1,
        me: isMe,
      };
      const isFirstReact = message.reactions == undefined;
      if (!message.reactions) message.reactions = [];
      message.reactions.push(react);
      updateClackState(ClackEvents.reactions(msg.message));
      if (isFirstReact) {
        updateClackState(ClackEvents.message(msg.message));
      }
    } else {
      if (react.me && isMe) {
        return;
      }
      react.count++;
      if (react.users.length < 5) {
        react.users.push(msg.user);
      }
      if (isMe && !react.me) {
        react.me = true;
      }
      updateClackState(ClackEvents.reactions(msg.message));
    }
  };

  onReactionDelete = (msg: ReactionDeleteEvent) => {
    const isMe = msg.user === this.currentUser;

    this.fetchUnknownUsers([msg.user]);

    if (!this.messages.has(msg.message)) return;
    const message = this.messages.get(msg.message)!;

    const store = this.reactionUsers.get(msg.message);
    if (store) {
      store.deleteReactionUser(msg.emoji, msg.user);
    }

    const react = message.reactions?.find((r) => r.emoji === msg.emoji);
    if (!react) return;

    if (!react.me && isMe) {
      return;
    }
    react.count--;
    react.users = react.users.filter((u) => u !== msg.user);

    if (isMe && react.me) {
      react.me = false;
    }
    if (react.count === 0) {
      const index = message.reactions!.indexOf(react);
      if (index !== -1) message.reactions!.splice(index, 1);
    }
    updateClackState(ClackEvents.reactions(msg.message));

    if (message.reactions!.length === 0) {
      message.reactions = undefined;
      updateClackState(ClackEvents.message(msg.message));
    }

    getClackState((state) => {
      if(
        react.count == 0 &&
        state.gui.reactionTooltipPopup?.message === msg.message &&
        state.gui.reactionTooltipPopup?.emoji === msg.emoji
      ) {
        state.gui.setReactionTooltipPopup(undefined);
      }
    });
  };

  onReactionUsers = (msg: ReactionUsersResponse) => {
    if (!this.reactionUsers.has(msg.message)) {
      this.reactionUsers.set(msg.message, new ChatReactionUserStore());
    }

    const reactionStore = this.reactionUsers.get(msg.message)!;
    reactionStore.fetching = false;
    reactionStore.setReactionUsers(msg.emoji, msg.users);

    this.fetchUnknownUsers(msg.users);
    updateClackState(ClackEvents.reactions(msg.message));
  };

  onUsers = (msg: UsersResponse) => {
    this.processUsers(msg.users || []);
  };

  onUserList = (msg: UserListResponse) => {
    console.log("ON USER LIST", msg.slice.length, msg.groups.length);
    this.userList.setResponse(msg);
    this.fetchUnknownUsers(
      msg.slice.filter((u) => !msg.groups.some((g) => g.id == u))
    );
    updateClackState(ClackEvents.userList);
  };

  onUserAdd = (msg: UserAddEvent) => {};

  onUserDelete = (msg: UserDeleteEvent) => {};

  onUserUpdate = (msg: UserUpdateEvent) => {
    console.log("ON USER UPDATE", msg);
    this.processUsers([msg.user]);
  };

  searchEmojis = (query: string): Emoji[] => {
    if (query.length <= 1 || !/^[a-z0-9_]+$/.test(query)) return [];
    return EmojiSearchByPartialName(query)
      .slice(0, 50)
      .map((e) => ({ id: "", name: e.symbol }));
  };

  searchUsers = (query: string): User[] => {
    const lower = query.toLowerCase();
    const scored: { user: User; score: number }[] = [];
    this.users.forEach((user) => {
      const uname = user.userName.toLowerCase();
      const dname = user.displayName.toLowerCase();
      const score = Math.max(
        fuzzysort.single(lower, uname)?.score || 0,
        fuzzysort.single(lower, dname)?.score || 0
      );
      if (score > 0 || query.length === 0) scored.push({ user, score });
    });
    return scored.sort((a, b) => b.score - a.score).map((r) => r.user);
  };

  searchChannels = (query: string): Channel[] => {
    const lower = query.toLowerCase();
    const scored: { channel: Channel; score: number }[] = [];
    this.channels.forEach((ch) => {
      if (ch.type === ChannelType.Category) return;
      const name = ch.name.toLowerCase();
      const score = fuzzysort.single(lower, name)?.score || 0;
      if (score > 0 || query.length === 0) scored.push({ channel: ch, score });
    });
    return scored.sort((a, b) => b.score - a.score).map((r) => r.channel);
  };

  searchRoles = (query: string): Role[] => {
    const lower = query.toLowerCase();
    const scored: { role: Role; score: number }[] = [];
    this.roles.store.forEach((role) => {
      const name = role.name.toLowerCase();
      const score = fuzzysort.single(lower, name)?.score || 0;
      if (score > 0 || query.length === 0) scored.push({ role, score });
    });
    return scored.sort((a, b) => b.score - a.score).map((r) => r.role);
  };

  lookupUser = (name?: string, id?: string): User | undefined => {
    if (id) return this.users.get(id);
    if (name)
      return [...this.users.values()].find(
        (u) => u.userName === name || u.displayName === name
      );
  };

  lookupChannel = (name?: string, id?: string): Channel | undefined => {
    if (id) return this.channels.get(id);
    if (name) return [...this.channels.values()].find((c) => c.name === name);
  };

  lookupRole = (name?: string, id?: string): Role | undefined => {
    if (id) return this.roles.get(id);
    if (name)
      return [...this.roles.store.values()].find((r) => r.name === name);
  };

  pushRequest = (request: any) => {
    this.requests.push(request);
    updateClackState(ClackEvents.requests);
  };

  popRequest = (): any => {
    if (!this.requests.length) return undefined;
    const value = this.requests.pop();
    updateClackState(ClackEvents.requests);
    return value;
  };

  pushRequestWithCaptcha = (request: any) => {
    if (this.requestPendingCaptcha) {
      console.warn(
        "Already pending for captcha.",
        this.requestPendingCaptcha,
        request
      );
      return;
    }
    // Let CaptchaScreen get us a captcha response, we continue from FinishCaptcha
    this.requestPendingCaptcha = request;
    updateClackState(ClackEvents.captcha);
  };

  onResponse = (msg: any) => {
    console.log("RESPONSE", msg);

    if (msg.type === EventType.SettingsResponse) this.onSettings(msg.data);
    else if (msg.type === EventType.TokenResponse) this.onToken(msg.data);
    else if (msg.type === EventType.OverviewResponse) this.onOverview(msg.data);
    else if (msg.type === EventType.MessagesResponse) this.onMessages(msg.data);
    else if (msg.type === EventType.UsersResponse) this.onUsers(msg.data);
    else if (msg.type === EventType.UserListResponse) this.onUserList(msg.data);
    else if (msg.type === EventType.MessageSendResponse)
      this.onSendMessageResponse(msg.data, msg.seq);
    else if (msg.type === EventType.MessageAdd) this.onMessageAdd(msg.data);
    else if (msg.type === EventType.MessageDelete)
      this.onMessageDelete(msg.data);
    else if (msg.type === EventType.MessageUpdate)
      this.onMessageUpdate(msg.data);
    else if (msg.type === EventType.MessageReactionAdd)
      this.onReactionAdd(msg.data);
    else if (msg.type === EventType.MessageReactionDelete)
      this.onReactionDelete(msg.data);
    else if (msg.type === EventType.MessageReactionUsersResponse)
      this.onReactionUsers(msg.data);
    else if (msg.type === EventType.UserAdd) this.onUserAdd(msg.data);
    else if (msg.type === EventType.UserDelete) this.onUserDelete(msg.data);
    else if (msg.type === EventType.UserUpdate) this.onUserUpdate(msg.data);
    else if (msg.type === EventType.RoleAdd) this.onRoleAdd(msg.data);
    else if (msg.type === EventType.RoleUpdate) this.onRoleUpdate(msg.data);
    else if (msg.type === EventType.RoleDelete) this.onRoleDelete(msg.data);
    else if (msg.type === EventType.UploadSlot)
      this.onUploadSlot(msg.data, msg.seq);
    else if (msg.type === EventType.ErrorResponse) this.onError(msg.data);
  };

  onRoleAdd = (msg: RoleAddEvent) => {
    this.roles.insertRole(msg.role);
    updateClackState(ClackEvents.role(msg.role.id));
    updateClackState(ClackEvents.roleList);
  };

  onRoleUpdate = (msg: RoleUpdateEvent) => {
    this.roles.insertRole(msg.role);

    updateClackState(ClackEvents.role(msg.role.id));
    updateClackState(ClackEvents.roleList);

    const affected = [...this.users.values()].filter((u) =>
      u.roles.includes(msg.role.id)
    );

    this.processUsers(affected.map((u) => ({ ...u })));
  };

  onRoleDelete = (msg: RoleDeleteEvent) => {
    const id = msg.role;
    this.roles.deleteRole(id);

    updateClackState(ClackEvents.role(id));
    updateClackState(ClackEvents.roleList);

    const affected = [...this.users.values()].filter((u) =>
      u.roles.includes(id)
    );

    this.processUsers(affected.map((u) => ({ ...u })));
  };
}
