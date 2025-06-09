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

export const enum UserStatus {
  Offline = 0,
  Online = 1,
  Away = 2,
}

export interface User {
  id: Snowflake;
  username: string;
  nickname: string;
  status: UserStatus;
  roles: Snowflake[];

  // Client
  avatarURL?: string;
  color?: number;
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
  id?: Snowflake;
  name: string;
}

export interface Reaction {
  emoji: Emoji;
  users: Snowflake[];
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
  ChangeNickname = 1 << 10,

  ViewChannel = 1 << 11,
  ReadMessageHistory = 1 << 12,

  ManageNicknames = 1 << 13,
  ManageMessages = 1 << 14,
  ManageChannels = 1 << 15,
  ManageRoles = 1 << 16,
  ManageEmojis = 1 << 17,

  All = 0x7fffffff,
}
