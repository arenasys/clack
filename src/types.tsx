export type Snowflake = string;

export const enum MessageType {
  Default = 0,
}

export interface Message {
  id: Snowflake;
  type: MessageType;
  channel: Snowflake;
  timestamp: number;
  pinned?: boolean;
  author: Snowflake;
  reference?: Snowflake;
  content: string;
  editedTimestamp?: number;
  attachments?: Attachment[];
  embeds?: Embed[];
  reactions?: Reaction[];
  mentionedUsers?: Snowflake[];
  mentionedRoles?: Snowflake[];
  mentionedChannels?: Snowflake[];
  embeddableURLs?: string[];
}

export const enum UserPresence {
  Offline = 0,
  Online = 1,
  Away = 2,
  DontDisturb = 3,
}

export const DefaultUserColor = 0xff0000;
export interface User {
  id: Snowflake;
  userName: string;
  displayName: string;

  statusMessage: string;
  profileMessage: string;
  profileColor: number;
  avatarModified: number;

  presence: UserPresence;
  roles: Snowflake[];

  // Client
  avatarURL?: string;
  roleColor?: number;
}

export interface Role {
  id: Snowflake;
  name: string;
  color: number;
  position: number;
  permissions: number;
  hoisted: boolean;
  mentionable: boolean;
}

export const enum ChannelType {
  Text = 0,
  Voice = 1,
  Category = 2,
}

export interface Channel {
  id: Snowflake;
  type: ChannelType;
  name: string;
  description: string;
  position: number;
  parent: Snowflake;
  overwrites: Overwrite[];
  parentName?: string;
}

export const enum OverwriteType {
  Role = 0,
  User = 1,
}

export interface Overwrite {
  id: Snowflake;
  type: OverwriteType;
  allow: number;
  deny: number;
}

export const enum AttachmentType {
  File = 0,
  Image = 1,
  Video = 2,
  Audio = 3,
  Text = 4,
}

export interface Attachment {
  id: Snowflake;
  filename: string;
  type: AttachmentType;
  mimetype: string;
  size: number;
  preload: string;
  height: number;
  width: number;

  // Client
  previewURL?: string;
  displayURL?: string;
  proxyURL?: string;
  originalURL?: string;
}

export interface Viewable {
  id: Snowflake;
  type: AttachmentType;
  width: number;
  height: number;

  preload: string;
  mimetype: string;

  // Client
  previewURL?: string;
  displayURL?: string;
  proxyURL?: string;
  originalURL?: string;
}

export interface EmbedMedia {
  id: Snowflake;
  url: string;
  height: number;
  width: number;
  preload: string;

  // Client
  type?: AttachmentType;
  previewURL?: string;
  displayURL?: string;
  proxyURL?: string;
  originalURL?: string;
}

export interface EmbedFooter {
  text: string;
  icon: EmbedMedia;
}

export interface EmbedAuthor {
  name: string;
  url: string;
  icon: EmbedMedia;
}

export interface EmbedProvider {
  name: string;
  url: string;
}

export interface EmbedField {
  name: string;
  value: string;
  inline: boolean;
}

export const enum EmbedType {
  Rich = 0,
  Image = 1,
  Video = 2,
}

export interface Embed {
  id: Snowflake;
  type: EmbedType;
  url: string;
  title: string;
  description: string;
  color: number;
  timestamp: number;
  image: EmbedMedia;
  thumbnail: EmbedMedia;
  video: EmbedMedia;
  author: EmbedAuthor;
  provider: EmbedProvider;
  footer: EmbedFooter;
  fields: EmbedField[];
}

export interface Emoji {
  id: Snowflake;
  name: string;
}

export interface Reaction {
  emoji: Snowflake;
  count: number;
  users: Snowflake[];
  me: boolean;
}

export const enum Permissions {
  Administrator = 1 << 0,
  InviteMembers = 1 << 1,
  SilenceMembers = 1 << 2,
  KickMembers = 1 << 3,
  BanMembers = 1 << 4,

  SendMessages = 1 << 5,
  AddReactions = 1 << 6,
  EmbedLinks = 1 << 7,
  AttachFiles = 1 << 8,
  MentionEveryone = 1 << 9,
  ChangeProfile = 1 << 10,

  ViewChannel = 1 << 11,
  ReadMessageHistory = 1 << 12,

  ManageProfiles = 1 << 13,
  ManageMessages = 1 << 14,
  ManageChannels = 1 << 15,
  ManageRoles = 1 << 16,
  ManageEmojis = 1 << 17,

  All = 0x7fffffff,
}

export const enum EventType {
  ErrorResponse,

  SettingsResponse,
  OverviewResponse,

  MessagesRequest,
  MessagesResponse,

  UsersRequest,
  UsersResponse,

  UserListRequest,
  UserListResponse,

  MessageSendRequest,
  MessageSendResponse,

  MessageAdd,
  MessageUpdate,
  MessageDelete,
  MessageDeleteBulk,

  MessageReactionAdd,
  MessageReactionDelete,
  MessageReactionDeleteAll,
  MessageReactionDeleteEmoji,

  MessageReactionUsersRequest,
  MessageReactionUsersResponse,

  ChannelAdd,
  ChannelUpdate,
  ChannelDelete,
  ChannelPinsUpdate,

  RoleAdd,
  RoleUpdate,
  RoleDelete,

  UserAdd,
  UserDelete,
  UserUpdate,

  UserPresence,
  UserTyping,

  LoginRequest,
  TokenResponse,
  LogoutRequest,
  RegisterRequest,

  UploadSlot,
}

export const EventTypeDescriptions: { [key: number]: string } = {
  [EventType.MessageSendRequest]: "send messages",
  [EventType.MessagesRequest]: "fetch messages",
  [EventType.MessageDelete]: "delete this message",
  [EventType.MessageDeleteBulk]: "delete messages in bulk",
};

export const enum ErrorCode {
  InternalError = 0,
  InvalidRequest = 1,
  InvalidToken = 2,
  InvalidCredentials = 3,
  InvalidUsername = 4,
  TakenUsername = 5,
  InvalidInviteCode = 6,
  InvalidCaptcha = 7,
  NoPermission = 8,
  ConnectionClosing = 9,
}

export const ErrorCodeMessages: { [key: number]: string } = {
  [ErrorCode.InternalError]: "Internal server error.",
  [ErrorCode.InvalidRequest]: "Invalid request.",
  [ErrorCode.InvalidToken]: "Invalid token.",
  [ErrorCode.InvalidCredentials]: "Invalid username or password.",
  [ErrorCode.InvalidUsername]: "Invalid username.",
  [ErrorCode.TakenUsername]: "Username already taken.",
  [ErrorCode.InvalidInviteCode]: "Invalid invite code.",
  [ErrorCode.InvalidCaptcha]: "Invalid captcha.",
  [ErrorCode.NoPermission]: "Insufficient permissions to perform this action.",
  [ErrorCode.ConnectionClosing]: "Connection closing.",
};

export interface ErrorResponse {
  code: number;
  request: number;
  message?: string;
}

export interface SettingsResponse {
  siteName: string;
  loginMessage: string;
  defaultPermissions: number;
  authenticated: boolean;
  usesEmail: boolean;
  usesInviteCodes: boolean;
  usesCaptcha: boolean;
  usesLoginCaptcha: boolean;
  captchaSiteKey?: string;
}

export interface OverviewResponse {
  you: User;
  users: User[];
  channels: Channel[];
  roles: Role[];
  userList: UserListResponse;
}

export interface UsersRequest {
  users: Snowflake[];
}

export interface UsersResponse {
  users: User[];
}

export interface MessagesRequest {
  channel: Snowflake;
  before?: Snowflake;
  after?: Snowflake;
  limit: number;
}

export interface MessagesResponse {
  channel: Snowflake;
  before: Snowflake;
  after: Snowflake;
  limit: number;
  messages: Message[];
  references?: Message[];
}

export interface UserListRequest {
  startGroup: string;
  startIndex: number;
  endGroup: string;
  endIndex: number;
}

export interface UserListGroup {
  id: Snowflake;
  count: number;
  start: number;
  users: Snowflake[];
}

export interface UserListResponse {
  startGroup: string;
  startIndex: number;
  endGroup: string;
  endIndex: number;
  groups: UserListGroup[];
}

export interface MessageSendRequest {
  channel: Snowflake;
  content: string;
  reference?: Snowflake;
  attachmentCount: number;
}

export interface MessageSendResponse {
  message?: Snowflake;
  slot?: Snowflake;
}

export interface MessgeUpdateRequest {
  message: Snowflake;
  content?: string;
}

export interface MessageDeleteRequest {
  message: Snowflake;
}

export interface MessageDeleteEvent {
  message: Snowflake;
}

export interface MessageAddEvent {
  message: Message;
  author: User;
  reference?: Message;
}

export interface MessageUpdateEvent {
  message: Message;
}

export interface ReactionAddEvent {
  message: Snowflake;
  user: Snowflake;
  emoji: Snowflake;
}

export interface ReactionDeleteEvent {
  message: Snowflake;
  user: Snowflake;
  emoji: Snowflake;
}

export interface ReactionDeleteAllEvent {
  message: Snowflake;
}

export interface ReactionDeleteEmojiEvent {
  message: Snowflake;
  emoji: Snowflake;
}

export interface ReactionUsersRequest {
  message: Snowflake;
  emoji: Snowflake;
}

export interface ReactionUsersResponse {
  message: Snowflake;
  emoji: Snowflake;
  users: Snowflake[];
}

export interface UserUpdateRequest {
  user: Snowflake;
  displayName?: string;
  statusMessage?: string;
  profileMessage?: string;
  profileColor?: number;
  avatarModified?: number;

  setName: boolean;
  setProfile: boolean;
  setAvatar: boolean;
}

export interface UserAddEvent {
  user: User;
}

export interface UserDeleteEvent {
  user: Snowflake;
}

export interface UserUpdateEvent {
  user: User;
}

export interface UploadSlotResponse {
  slot: Snowflake;
}

export interface LoginRequest {
  username: string;
  password: string;
  captchaResponse?: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
  inviteCode?: string;
  captchaResponse?: string;
}

export interface TokenResponse {
  token: string;
}

export interface LogoutRequest {}
