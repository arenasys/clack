import {
  User,
  Channel,
  Role,
  Message,
  Snowflake,
  ChannelType,
  AttachmentType,
  MessageType,
  Permissions,
  OverwriteType,
} from "./models";

import {
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
} from "./events";

import { MakeSnowflake } from "./util";
import { useChatState } from "./state";

const previewURL = (id: Snowflake) =>
  `http://${window.location.host}/previews/${id}?type=preview`;
const displayURL = (id: Snowflake) =>
  `http://${window.location.host}/previews/${id}?type=display`;
const originalURL = (id: Snowflake, filename: string) =>
  `http://${window.location.host}/attachments/${id}/${filename}`;
const proxyURL = (id: Snowflake, url: string) =>
  `http://${window.location.host}/external/${id}?url=${encodeURIComponent(
    url
  )}`;
const uploadURL = (slot: Snowflake) =>
  `http://${window.location.host}/upload/${slot}`;

export interface GatewayChannelGroup {
  category?: Snowflake;
  channels: Snowflake[];
}

export interface GatewayUserGroup {
  role: Snowflake;
  count: number;
  start: number;
  users: Snowflake[];
}

export interface GatewayPendingAttachment {
  id: Snowflake;
  file: File;
  spoilered: boolean;
  filename: string;
  type: AttachmentType;
  blobURL: string;
}

export class GatewayChannelState {
  messages: Snowflake[] = [];

  anchor?: Snowflake;
  editor: string = "";
  attachments: GatewayPendingAttachment[] = [];

  firstMessage?: Snowflake;
  lastMessage?: Snowflake;

  fetching: boolean = false;

  topSkeletons: Snowflake[] = this.makeSkeletons(25);
  bottomSkeletons: Snowflake[] = this.makeSkeletons(25);

  pendingMessages: Snowflake[] = [];
  pendingAttachments: Map<Snowflake, GatewayPendingAttachment[]> = new Map();

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

  addMessages(msg: MessagesResponse) {
    const messages = msg.messages
      .map((m) => m.id)
      .filter((id) => !this.messages.includes(id));

    if (this.messages.length > 100) {
      if (msg.after) {
        this.messages = this.messages.splice(-50);
      } else {
        this.messages = this.messages.splice(0, 50);
      }
    }

    if (msg.after) {
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
          this.anchor = msg.after;
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
          this.anchor = msg.before;
        }
        if (messages.length < msg.limit) {
          this.firstMessage = messages[0];
        }
      }
    } else {
      //this.lastMessage = messages[messages.length - 1];
      this.messages.push(...messages);
      this.lastMessage = messages[messages.length - 1];
      this.anchor = messages[messages.length - 1];
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

  constructor() {}
}

export class GatewayUserOrder {
  groups: GatewayUserGroup[] = [];
  fetching: boolean = false;

  setRequest(req: UserListRequest) {
    this.fetching = true;

    var inRange = false;

    for (var i = 0; i < this.groups.length; i++) {
      var group = this.groups[i];

      var startIndex = 0;
      var endIndex = group.count - 1;

      if (group.role === req.startGroup) {
        inRange = true;
        startIndex = req.startIndex;
      }

      if (group.role === req.endGroup) {
        endIndex = req.endIndex;
      }

      if (inRange) {
        var startOverlap =
          startIndex >= group.start &&
          startIndex < group.start + group.users.length;
        var endOverlap =
          endIndex >= group.start &&
          endIndex < group.start + group.users.length;

        console.log(group.role, startOverlap, endOverlap);

        if (startOverlap && endOverlap) {
          // Do nothing
        } else if (startOverlap) {
          startIndex = group.start + group.users.length;
          for (var j = startIndex; j <= endIndex; j++) {
            var key = i * (1 << 16) + j;
            group.users.push(`skeleton-${key}`);
          }
        } else if (endOverlap) {
          endIndex = group.start - 1;
          for (var j = startIndex; j <= endIndex; j++) {
            var key = i * (1 << 16) + j;
            group.users.unshift(`skeleton-${key}`);
          }
          group.start = startIndex;
        } else {
          group.users = [];
          for (var j = startIndex; j <= endIndex; j++) {
            var key = i * (1 << 16) + j;
            group.users.push(`skeleton-${key}`);
          }
          group.start = startIndex;
        }
      }

      if (group.role === req.endGroup) {
        inRange = false;
      }
    }

    this.groups = [...this.groups];
  }

  setResponse(msg: UserListResponse) {
    this.fetching = false;
    this.groups = msg.groups.map((group) => ({
      role: group.id,
      count: group.count,
      start: group.start,
      users: group.users,
    }));
  }
  constructor() {}
}

export class GatewayRoleStore {
  store: Map<Snowflake, Role> = new Map();
  order: Snowflake[] = [];

  constructor() {}

  setRoles(roles: Role[]) {
    roles = roles.sort((a, b) => a.position - b.position);

    this.order = [];
    this.store = new Map();

    for (let role of roles) {
      this.store.set(role.id, role);
    }
    this.order = roles.map((role) => role.id);
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

  get(id: Snowflake) {
    return this.store.get(id);
  }
}

interface PendingMessage {
  marker: Snowflake;
  channel: Snowflake;
  message?: Snowflake;
  attachments?: GatewayPendingAttachment[];
  progress?: number;
  size?: number;
  request?: XMLHttpRequest;
}

export const enum GatewayAuthState {
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

export class Gateway {
  users: Map<Snowflake, User> = new Map();
  channels: Map<Snowflake, Channel> = new Map();
  roles: GatewayRoleStore = new GatewayRoleStore();
  messages: Map<Snowflake, Message> = new Map();

  channelGroups: GatewayChannelGroup[] = [];
  userOrder: GatewayUserOrder = new GatewayUserOrder();
  channelStates: Map<Snowflake, GatewayChannelState> = new Map();

  authState: GatewayAuthState = GatewayAuthState.Disconnected;
  authError: ErrorResponse | undefined = undefined;
  error: ErrorResponse | undefined = undefined;

  requests: any[] = [];
  requestPendingCaptcha: any | undefined = undefined;

  currentChannel?: Snowflake = undefined;
  currentUser?: Snowflake = undefined;
  currentMessages: Snowflake[] = [];
  currentMessagesIsCombined: Map<Snowflake, boolean> = new Map();
  currentEditor: string = "";
  currentFiles: GatewayPendingAttachment[] = [];

  pendingMessages: Map<Snowflake, PendingMessage> = new Map();

  userAnchor?: Snowflake = undefined;

  settings: SettingsResponse | undefined;

  login(username: string, password: string) {
    this.switchAuthState(GatewayAuthState.TryLogin);

    const request: LoginRequest = {
      username: username,
      password: password,
    };
    const event = {
      type: EventType.LoginRequest,
      data: request,
    };
    if (this.settings?.usesLoginCaptcha) {
      this.requestPendingCaptcha = event;
    } else {
      this.requests.push(event);
    }
  }

  register(
    username: string,
    password: string,
    email: string | undefined,
    inviteCode: string | undefined
  ) {
    this.switchAuthState(GatewayAuthState.TryRegister);

    const request: RegisterRequest = {
      username: username,
      password: password,
      email: email,
      inviteCode: inviteCode,
    };
    const event = {
      type: EventType.RegisterRequest,
      data: request,
    };
    if (this.settings?.usesCaptcha) {
      this.requestPendingCaptcha = event;
    } else {
      this.requests.push(event);
    }
  }

  getPermissions(userID: Snowflake, channelID: Snowflake | undefined): number {
    var allow = this.settings?.defaultPermissions ?? 0;
    var deny = 0;

    const user = this.users.get(userID);
    if (!user) {
      return 0;
    }

    for (const roleID of user.roles) {
      const role = this.roles.get(roleID);
      if (role) {
        allow |= role.permissions;
      }
    }

    if (channelID !== undefined) {
      const channel = this.channels.get(channelID);
      if (channel) {
        for (const overwrite of channel.overwrites) {
          if (overwrite.type === OverwriteType.Role) {
            if (user.roles.includes(overwrite.id)) {
              allow |= overwrite.allow;
              deny |= overwrite.deny;
            }
          } else if (overwrite.type === OverwriteType.User) {
            if (overwrite.id === userID) {
              allow |= overwrite.allow;
              deny |= overwrite.deny;
            }
          }
        }
      }
    }

    var permissions = allow & ~deny;

    if ((permissions & Permissions.Administrator) != 0) {
      return Permissions.All;
    }

    return permissions;
  }

  hasPermission(
    userID: Snowflake,
    channelID: Snowflake | undefined,
    permission: Permissions
  ): boolean {
    const permissions = this.getPermissions(userID, channelID);
    return (permissions & permission) === permission;
  }

  finishCaptcha(captchaResponse: string | undefined) {
    if (this.requestPendingCaptcha) {
      if (captchaResponse == undefined) {
        this.requestPendingCaptcha = undefined;
        if (this.authState == GatewayAuthState.TryLogin) {
          this.switchAuthState(GatewayAuthState.Login);
        }
        if (this.authState == GatewayAuthState.TryRegister) {
          this.switchAuthState(GatewayAuthState.Register);
        }
        return;
      } else {
        this.requestPendingCaptcha.data.captchaResponse = captchaResponse;
        this.requests.push(this.requestPendingCaptcha);
        this.requestPendingCaptcha = undefined;
      }
    }
  }

  processChannels(channels: Channel[]) {
    channels.forEach((channel) => {
      this.channels.set(channel.id, channel);
      this.channelStates.set(channel.id, new GatewayChannelState());
    });

    channels.forEach((channel) => {
      channel.parentName = this.channels.get(channel.parent)?.name;
      channel.overwrites = channel.overwrites ?? [];
      this.channels.set(channel.id, channel);
    });

    this.channelGroups = [];
    const orphanChannels = Array.from(this.channels.values())
      .filter(
        (channel) =>
          channel.type !== ChannelType.Category && channel.parent == undefined
      )
      .sort((a, b) => a.position - b.position);

    if (orphanChannels.length > 0) {
      this.channelGroups.push({
        channels: orphanChannels.map((channel) => channel.id),
      });
    }

    const categories = Array.from(this.channels.values())
      .filter(
        (channel) =>
          channel.type === ChannelType.Category && channel.parent == undefined
      )
      .sort((a, b) => a.position - b.position);

    categories.forEach((category) => {
      const channels = Array.from(this.channels.values())
        .filter(
          (channel) =>
            channel.type !== ChannelType.Category &&
            channel.parent === category.id
        )
        .sort((a, b) => a.position - b.position);

      this.channelGroups.push({
        category: category.id,
        channels: channels.map((channel) => channel.id),
      });
    });
  }

  syncCurrent(order: GatewayChannelState) {
    this.currentMessages = order.getMessageView();

    this.currentMessagesIsCombined.clear();
    for (let i = 1; i < this.currentMessages.length; i++) {
      const prev = this.messages.get(this.currentMessages[i - 1]);
      const curr = this.messages.get(this.currentMessages[i]);

      if (!prev || !curr) continue;

      const sameAuthor = curr.author === prev.author;
      const deltaTime = curr.timestamp - prev.timestamp;

      const combined = sameAuthor && deltaTime < 1000 * 60 * 5;

      this.currentMessagesIsCombined.set(curr.id, combined);
    }

    this.currentEditor = order.editor;
    this.currentFiles = order.attachments;
  }

  setChatScroll(top: Snowflake, center: Snowflake, bottom: Snowflake) {
    if (this.currentChannel == undefined) {
      return;
    }

    const state = this.channelStates.get(this.currentChannel);

    if (state == undefined) {
      return;
    }

    state.anchor = center;

    if (state.fetching) return;

    const topIdx = this.currentMessages.indexOf(top);
    const bottomIdx = this.currentMessages.indexOf(bottom);
    const margin = 8 + 25;

    //console.log("Top", topIdx, "Bottom", bottomIdx);

    if (topIdx >= 0 && topIdx < margin) {
      if (state.messages[0] != state.firstMessage) {
        state.fetching = true;
        console.log("Fetching top");
        this.requests.push({
          type: EventType.MessagesRequest,
          data: {
            channel: this.currentChannel,
            limit: 50,
            before: state.messages[0],
          },
        });
      }
    }
    if (bottomIdx >= 0 && bottomIdx > this.currentMessages.length - margin) {
      if (state.messages[state.messages.length - 1] != state.lastMessage) {
        state.fetching = true;
        console.log("Fetching bottom");
        this.requests.push({
          type: EventType.MessagesRequest,
          data: {
            channel: this.currentChannel,
            limit: 50,
            after: state.messages[state.messages.length - 1],
          },
        });
      }
    }
  }

  getChatScroll() {
    if (this.currentChannel == undefined) {
      return undefined;
    }

    return this.channelStates.get(this.currentChannel)!.anchor;
  }

  setUserScroll(
    topGroup: Snowflake,
    topIndex: number,
    bottomGroup: Snowflake,
    bottomIndex: number
  ) {
    console.log("USER SCROLL", topGroup, topIndex, bottomGroup, bottomIndex);

    if (this.userOrder.fetching) return;

    var req: UserListRequest = {
      startGroup: topGroup,
      startIndex: topIndex,
      endGroup: bottomGroup,
      endIndex: bottomIndex,
    };

    this.userOrder.setRequest(req);

    this.requests.push({
      type: EventType.UserListRequest,
      data: req,
    });
  }

  setEditorState(editor: string) {
    if (this.currentChannel == undefined) return;
    const state = this.channelStates.get(this.currentChannel);
    if (state == undefined) return;

    state.editor = editor;

    // Dont pointlessly re-render on every keystroke
    //this.syncCurrent(state);
  }

  setAttachments(
    add: GatewayPendingAttachment[],
    remove: GatewayPendingAttachment[],
    update: GatewayPendingAttachment[]
  ) {
    if (this.currentChannel == undefined) return;
    const state = this.channelStates.get(this.currentChannel);
    if (state == undefined) return;

    if (add.length > 0) {
      for (const file of add) {
        file.blobURL = URL.createObjectURL(file.file);
      }

      state.attachments.push(...add);
    }

    if (remove.length > 0) {
      for (const file of remove) {
        URL.revokeObjectURL(file.blobURL);
      }

      state.attachments = state.attachments.filter((f) => !remove.includes(f));
    }

    if (update.length > 0) {
      console.log("Updating files", update);
      for (const file of update) {
        const index = state.attachments.findIndex((f) => f.id === file.id);
        if (index !== -1) {
          console.log("Updating file", file.id);
          state.attachments[index] = file;
        }
      }

      state.attachments = [...state.attachments];
    }

    this.syncCurrent(state);
  }

  changeChannel(channel: Snowflake) {
    this.currentChannel = channel;

    const state = this.channelStates.get(this.currentChannel);

    if (state == undefined) return;

    this.syncCurrent(state);

    if (state.messages.length === 0) {
      this.requests.push({
        type: EventType.MessagesRequest,
        data: {
          channel: this.currentChannel,
          limit: 50,
        },
      });
    }
  }

  sendMessage(content: string) {
    if (this.currentUser == undefined || this.currentChannel == undefined) {
      return;
    }

    var marker = MakeSnowflake();
    var state = this.channelStates.get(this.currentChannel)!;

    var attachments = state.attachments;
    state.attachments = [];

    var request: MessageSendRequest = {
      channel: this.currentChannel,
      content: content,
      attachmentCount: attachments.length,
    };

    var msg: Message = {
      id: marker,
      type: MessageType.Default,
      author: this.currentUser,
      channel: this.currentChannel,
      content: content,
      timestamp: Date.now(),
    };

    this.messages.set(marker, msg);

    state.addPendingMessage(marker);
    this.pendingMessages.set(marker, {
      marker: marker,
      channel: this.currentChannel,
      attachments: attachments,
      progress: 0,
      size: attachments.reduce((acc, att) => acc + att.file.size, 0),
    });

    this.syncCurrent(state);

    this.requests.push({
      type: EventType.MessageSendRequest,
      seq: marker,
      data: request,
    });
  }

  onSendMessageResponse(msg: MessageSendResponse, seq: Snowflake) {
    console.log("SendMessageResponse", msg);
    var pending = this.pendingMessages.get(seq);
    if (pending == undefined) return;

    if (msg.slot) {
      var form = new FormData();
      pending.attachments?.forEach((att, i) => {
        form.append(
          `metadata_${i}`,
          JSON.stringify({
            filename: att.filename,
            spoilered: att.spoilered,
            size: att.file.size,
          })
        );

        form.append(`file_${i}`, att.file, att.filename);
      });

      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadURL(msg.slot), true);

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100;

          const pending = this.pendingMessages.get(seq);
          if (pending) {
            console.log("UPLOAD PROGRESS", pending.progress, "TO", percent);
            pending.progress = percent;
          }
        }
      });

      xhr.addEventListener("load", () => {
        console.log("Upload complete, status:", xhr.status);
      });
      xhr.addEventListener("error", () => {
        console.error("Upload failed");
      });

      xhr.send(form);
      pending.request = xhr;
    } else {
      pending.message = msg.message;
    }
  }

  cancelMessage(seq: Snowflake) {
    var pending = this.pendingMessages.get(seq);
    if (pending == undefined) return;

    if (pending.request) {
      pending.request.abort();
    }

    this.pendingMessages.delete(seq);

    const state = this.channelStates.get(pending.channel);
    if (state == undefined) return;

    state.pendingMessages = state.pendingMessages.filter((m) => m !== seq);

    this.syncCurrent(state);
  }

  updateMessage(message: Snowflake, content: string) {
    this.requests.push({
      type: EventType.MessageUpdate,
      data: {
        message: message,
        content: content,
      },
    });
    this.pendingMessages.set(message, {
      marker: message,
      channel: "",
    });
  }

  deleteMessage(message: Snowflake) {
    this.requests.push({
      type: EventType.MessageDelete,
      data: {
        message: message,
      },
    });
  }

  onOverview(msg: OverviewResponse) {
    console.log("Overview", msg);
    this.roles.setRoles(msg.roles);

    this.processChannels(msg.channels);

    this.processUsers(msg.users);

    this.onUserList(msg.userList);

    this.currentUser = msg.you.id;
    this.processUsers([msg.you]);

    if (this.currentChannel == undefined) {
      for (const group of this.channelGroups) {
        if (group.channels.length > 0) {
          this.changeChannel(group.channels[0]);
          break;
        }
      }
    }

    this.switchAuthState(GatewayAuthState.Connected);
  }

  onSettings(msg: SettingsResponse) {
    console.log("Site", msg);
    this.settings = msg;

    if (msg.authenticated) {
      this.switchAuthState(GatewayAuthState.Loading);
    } else {
      this.switchAuthState(GatewayAuthState.Login);
    }
  }

  onToken(msg: TokenResponse) {
    console.log("Token", msg, this.authState);

    localStorage.setItem("token", msg.token);

    if (this.authState == GatewayAuthState.TryLogin) {
      this.switchAuthState(GatewayAuthState.OkLogin);
    }

    if (this.authState == GatewayAuthState.TryRegister) {
      this.switchAuthState(GatewayAuthState.OkRegister);
    }
  }

  onError(msg: ErrorResponse) {
    if (this.authState == GatewayAuthState.TryLogin) {
      this.switchAuthState(GatewayAuthState.Login, msg);
      return;
    }

    if (this.authState == GatewayAuthState.TryRegister) {
      this.switchAuthState(GatewayAuthState.Register, msg);
      return;
    }

    if (msg.code === ErrorCode.InvalidToken) {
      this.switchAuthState(GatewayAuthState.Loading);
      return;
    }

    this.error = msg;
  }

  switchAuthState(authState: GatewayAuthState, error?: ErrorResponse) {
    this.authState = authState;
    this.authError = error;
  }

  processMessages(messages: Message[]) {
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];

      for (const a of m.attachments ?? []) {
        if (a.type !== AttachmentType.File) {
          a.previewURL = previewURL(a.id);
          a.displayURL = displayURL(a.id);
        }
        a.originalURL = originalURL(a.id, a.filename);
      }
      for (const e of m.embeds ?? []) {
        var media = [
          e.image,
          e.thumbnail,
          e.author?.icon,
          e.footer?.icon,
          e.video,
        ];
        for (var d of media) {
          if (d) {
            d.type = AttachmentType.Image;
            d.previewURL = previewURL(d.id);
            d.displayURL = displayURL(d.id);
            d.proxyURL = proxyURL(e.id, d.url);
            d.originalURL = d.url;
          }
        }
        if (e.video) {
          e.video.type = AttachmentType.Video;
        }
      }
    }
  }

  processUsers(users: User[]) {
    for (let user of users) {
      this.users.set(user.id, user);

      var color: number | undefined = undefined;
      var colorPosition = Number.MAX_VALUE;

      for (let role of user.roles) {
        const r = this.roles.get(role);
        if (r && r.color && r.position < colorPosition) {
          color = r.color;
          colorPosition = r.position;
        }
      }

      user.color = color;
    }
  }

  onMessages(msg: MessagesResponse) {
    this.processMessages(msg.messages);

    var unknownUsers: Snowflake[] = [];

    msg.messages.forEach((message) => {
      this.messages.set(message.id, message);
      if (!this.users.has(message.author)) {
        unknownUsers.push(message.author);
      }
    });

    if (unknownUsers.length > 0) {
      this.requests.push({
        type: EventType.UsersRequest,
        data: {
          users: unknownUsers,
        },
      });
    }

    const state = this.channelStates.get(msg.channel);
    if (state == undefined) {
      return;
    }

    state.fetching = false;

    state.addMessages(msg);

    if (this.currentChannel == msg.channel) {
      this.syncCurrent(state);
    }
  }

  onMessageAdd(msg: MessageAddEvent) {
    console.log("MessageAdd", msg);

    this.processMessages([msg.message]);
    this.processUsers([msg.author]);

    this.messages.set(msg.message.id, msg.message);

    const state = this.channelStates.get(msg.message.channel);
    if (state == undefined) {
      return;
    }

    console.log("Adding message", msg.message.id);

    var marker: Snowflake | undefined = undefined;

    for (const m of this.pendingMessages.values()) {
      if (m.message == msg.message.id) {
        marker = m.marker;
        break;
      }
    }

    if (marker != undefined) {
      this.pendingMessages.delete(marker);
    }

    state.addMessage(msg.message, marker);

    if (this.currentChannel == msg.message.channel) {
      this.syncCurrent(state);
    }
  }

  onMessageUpdate(msg: MessageUpdateEvent) {
    console.log("MessageUpdate", msg);
    this.processMessages([msg.message]);
    this.messages.set(msg.message.id, msg.message);

    if (this.pendingMessages.has(msg.message.id)) {
      this.pendingMessages.delete(msg.message.id);
    }
  }

  onMessageDelete(msg: MessageDeleteEvent) {
    console.log("MessageDelete", msg);
    this.messages.delete(msg.message);
    const state = this.channelStates.get(msg.message);
    if (state == undefined) {
      return;
    }
    state.messages = state.messages.filter((m) => m !== msg.message);
    state.pendingMessages = state.pendingMessages.filter(
      (m) => m !== msg.message
    );
    if (this.currentChannel == msg.message) {
      this.syncCurrent(state);
    }
    this.pendingMessages.forEach((pending, key) => {
      if (pending.message === msg.message) {
        this.pendingMessages.delete(key);
      }
    });
  }

  onUsers(msg: UsersResponse) {
    this.processUsers(msg.users);
  }

  onUserList(msg: UserListResponse) {
    this.userOrder.setResponse(msg);

    var unknownUsers: Snowflake[] = [];

    msg.groups.forEach((group) => {
      for (const user of group.users) {
        if (!this.users.has(user)) {
          unknownUsers.push(user);
        }
      }
    });

    if (unknownUsers.length > 0) {
      this.requests.push({
        type: EventType.UsersRequest,
        data: {
          users: unknownUsers,
        },
      });
    }
  }

  onResponse(msg: any) {
    if (msg.type === EventType.SettingsResponse) {
      this.onSettings(msg.data);
    } else if (msg.type === EventType.TokenResponse) {
      this.onToken(msg.data);
    } else if (msg.type === EventType.OverviewResponse) {
      this.onOverview(msg.data);
    } else if (msg.type === EventType.MessagesResponse) {
      this.onMessages(msg.data);
    } else if (msg.type === EventType.UsersResponse) {
      this.onUsers(msg.data);
    } else if (msg.type === EventType.UserListResponse) {
      this.onUserList(msg.data);
    } else if (msg.type === EventType.MessageSendResponse) {
      this.onSendMessageResponse(msg.data, msg.seq);
    } else if (msg.type === EventType.MessageDelete) {
      this.onMessageDelete(msg.data);
    } else if (msg.type === EventType.MessageAdd) {
      this.onMessageAdd(msg.data);
    } else if (msg.type === EventType.MessageUpdate) {
      this.onMessageUpdate(msg.data);
    } else if (msg.type === EventType.ErrorResponse) {
      this.onError(msg.data);
    }
  }
}
