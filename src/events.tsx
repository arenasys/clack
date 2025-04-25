import { Channel, Message, Role, User } from "./models";

export type Snowflake = string;

/*
const (
	EventTypeErrorResponse = iota

	EventTypeSiteResponse     = iota
	EventTypeOverviewResponse = iota

	EventTypeMessagesRequest  = iota
	EventTypeMessagesResponse = iota

	EventTypeUsersRequest  = iota
	EventTypeUsersResponse = iota

	EventTypeUserListRequest  = iota
	EventTypeUserListResponse = iota

	EventTypeMessageSendRequest  = iota
	EventTypeMessageSendResponse = iota
	
	EventTypeMessageAdd          = iota
	EventTypeMessageUpdate       = iota
	EventTypeMessageDelete       = iota
	EventTypeMessageDeleteBulk   = iota

	EventTypeMessageReactionAdd         = iota
	EventTypeMessageReactionRemove      = iota
	EventTypeMessageReactionRemoveAll   = iota
	EventTypeMessageReactionRemoveEmoji = iota

	EventTypeChannelAdd        = iota
	EventTypeChannelUpdate     = iota
	EventTypeChannelDelete     = iota
	EventTypeChannelPinsUpdate = iota

	EventTypeRoleAdd    = iota
	EventTypeRoleUpdate = iota
	EventTypeRoleDelete = iota

	EventTypeUserAdd    = iota
	EventTypeUserRemove = iota
	EventTypeUserUpdate = iota

	EventTypeUserPresence = iota
	EventTypeUserTyping   = iota

	EventTypeLoginRequest    = iota
	EventTypeTokenResponse   = iota
	EventTypeLogoutRequest   = iota
	EventTypeRegisterRequest = iota
)*/

export const enum EventType {
  ErrorResponse = 0,

  SiteResponse = 1,
  OverviewResponse = 2,

  MessagesRequest = 3,
  MessagesResponse = 4,

  UsersRequest = 5,
  UsersResponse = 6,

  UserListRequest = 7,
  UserListResponse = 8,

  MessageSendRequest = 9,
  MessageSendResponse = 10,

  MessageAdd = 11,
  MessageUpdate = 12,
  MessageDelete = 13,
  MessageDeleteBulk = 14,

  MessageReactionAdd = 15,
  MessageReactionRemove = 16,
  MessageReactionRemoveAll = 17,
  MessageReactionRemoveEmoji = 18,

  ChannelAdd = 19,
  ChannelUpdate = 20,
  ChannelDelete = 21,
  ChannelPinsUpdate = 22,

  RoleAdd = 23,
  RoleUpdate = 24,
  RoleDelete = 25,

  UserAdd = 26,
  UserRemove = 27,
  UserUpdate = 28,

  UserPresence = 29,
  UserTyping = 30,

  LoginRequest = 31,
  TokenResponse = 32,
  LogoutRequest = 33,
  RegisterRequest = 34,
}

export const enum ErrorCode {
  InternalError = 0,
  InvalidRequest = 1,
  InvalidToken = 2,
  InvalidCredentials = 3,
  InvalidUsername = 4,
  TakenUsername = 5,
  InvalidInviteCode = 6,
  InvalidCaptcha = 7,
  ConnectionClosing = 8,
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
  [ErrorCode.ConnectionClosing]: "Connection closing.",
};

export interface ErrorResponse {
  code: number;
  message: string;
}

export interface SiteResponse {
  siteName: string;
  loginMessage: string;
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
  attachmentCount: number;
}

export interface MessageSendResponse {
  message?: Snowflake;
  slot?: Snowflake;
}

export interface MessageAddEvent {
  message: Message;
  author: User;
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
