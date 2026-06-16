import type { NormalizedEvent } from "@discord-bot/shared";
import {
  type AnyThreadChannel,
  type DMChannel,
  type GuildBasedChannel,
  type GuildEmoji,
  type GuildMember,
  type GuildTextBasedChannel,
  type Invite,
  type Message,
  type NonThreadGuildBasedChannel,
  type PartialGuildMember,
  type PartialMessage,
  type PartialUser,
  type Role,
  type Sticker,
  type User,
  type VoiceState
} from "discord.js";
import type { CachedInvite } from "./invite-cache.js";
import type { Guild } from "discord.js";

export type WriteEventFn = (event: NormalizedEvent) => void;

export function createGuildEvent(
  eventName: string,
  guild: Pick<Guild, "id"> | null,
  payload: NormalizedEvent["payload"],
  actorId: string | null = null
): NormalizedEvent {
  return createEvent(eventName, {
    guildId: guild?.id ?? null,
    actorId,
    channelId: null,
    messageId: null,
    payload
  });
}

export function createChannelEvent(
  eventName: string,
  channel: DMChannel | GuildTextBasedChannel | NonThreadGuildBasedChannel,
  payload: NormalizedEvent["payload"]
): NormalizedEvent {
  const guildId = "guildId" in channel ? channel.guildId : null;

  return createEvent(eventName, {
    guildId,
    actorId: null,
    channelId: channel.id,
    messageId: null,
    payload
  });
}

export function createThreadEvent(
  eventName: string,
  thread: AnyThreadChannel,
  payload: NormalizedEvent["payload"]
): NormalizedEvent {
  return createEvent(eventName, {
    guildId: thread.guildId,
    actorId: null,
    channelId: thread.id,
    messageId: null,
    payload
  });
}

export function createInviteEvent(
  eventName: string,
  invite: Invite,
  cached?: CachedInvite | null
): NormalizedEvent {
  return createEvent(eventName, {
    guildId: invite.guild?.id ?? null,
    actorId: invite.inviter?.id ?? cached?.inviterId ?? null,
    channelId: invite.channel?.id ?? null,
    messageId: null,
    payload: {
      invite: {
        code: invite.code,
        url: invite.url,
        maxAge: invite.maxAge ?? cached?.maxAge ?? null,
        maxUses: invite.maxUses ?? cached?.maxUses ?? null,
        temporary: invite.temporary ?? cached?.temporary ?? null,
        uses: invite.uses ?? cached?.uses ?? null
      },
      inviter: invite.inviter ? userPayload(invite.inviter) : null
    }
  });
}

export function createReactionEvent(
  eventName: string,
  message: Message | PartialMessage,
  user: User | PartialUser,
  emoji: string
): NormalizedEvent {
  return createEvent(eventName, {
    guildId: message.guildId,
    actorId: user.id,
    channelId: message.channelId,
    messageId: message.id,
    payload: {
      user: userPayload(user),
      emoji
    }
  });
}

export function createVoiceEvent(
  eventName: string,
  oldState: VoiceState,
  newState: VoiceState
): NormalizedEvent {
  const member = newState.member ?? oldState.member;
  const channel = newState.channel ?? oldState.channel;

  return createEvent(eventName, {
    guildId: newState.guild.id,
    actorId: newState.member?.id ?? newState.id,
    channelId: newState.channelId ?? oldState.channelId,
    messageId: null,
    payload: {
      member: member ? memberPayload(member) : null,
      channel: channel ? { id: channel.id, name: channel.name } : null,
      before: voiceStatePayload(oldState),
      after: voiceStatePayload(newState),
      changes: diffRecord(voiceStatePayload(oldState), voiceStatePayload(newState))
    }
  });
}

export function createEvent(
  eventName: string,
  input: Pick<NormalizedEvent, "guildId" | "actorId" | "channelId" | "messageId" | "payload">
): NormalizedEvent {
  const now = new Date();

  return {
    eventTimestamp: now,
    receivedAt: now,
    eventName,
    guildId: input.guildId,
    actorId: input.actorId,
    channelId: input.channelId,
    messageId: input.messageId,
    payload: input.payload
  };
}

export function diffRecord(
  before: Record<string, unknown>,
  after: Record<string, unknown>
) {
  const changes: Record<string, { before: unknown; after: unknown }> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of keys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = {
        before: before[key],
        after: after[key]
      };
    }
  }

  return changes;
}

export function guildPayload(guild: Guild) {
  return {
    id: guild.id,
    name: guild.name,
    description: guild.description,
    ownerId: guild.ownerId,
    preferredLocale: guild.preferredLocale,
    verificationLevel: guild.verificationLevel,
    premiumTier: guild.premiumTier
  };
}

export function memberPayload(member: GuildMember | PartialGuildMember) {
  return {
    id: member.id,
    displayName: member.displayName,
    nickname: member.nickname,
    user: member.user ? userPayload(member.user) : null,
    roles: [...member.roles.cache.keys()],
    pending: member.pending,
    communicationDisabledUntil: member.communicationDisabledUntil?.toISOString() ?? null
  };
}

export function userPayload(user: User | PartialUser) {
  return {
    id: user.id,
    username: user.username,
    globalName: user.globalName,
    bot: user.bot
  };
}

export function channelPayload(channel: DMChannel | GuildBasedChannel | GuildTextBasedChannel) {
  return {
    id: channel.id,
    guildId: "guildId" in channel ? channel.guildId : null,
    name: "name" in channel ? channel.name : null,
    type: channel.type,
    parentId: "parentId" in channel ? channel.parentId : null,
    position: "position" in channel ? channel.position : null,
    rateLimitPerUser: "rateLimitPerUser" in channel ? channel.rateLimitPerUser : null
  };
}

export function threadPayload(thread: AnyThreadChannel) {
  return {
    id: thread.id,
    guildId: thread.guildId,
    name: thread.name,
    type: thread.type,
    parentId: thread.parentId,
    ownerId: thread.ownerId,
    archived: thread.archived,
    locked: thread.locked,
    invitable: thread.invitable,
    autoArchiveDuration: thread.autoArchiveDuration,
    rateLimitPerUser: thread.rateLimitPerUser
  };
}

export function rolePayload(role: Role) {
  return {
    id: role.id,
    name: role.name,
    color: role.color,
    hoist: role.hoist,
    position: role.position,
    managed: role.managed,
    mentionable: role.mentionable,
    permissions: role.permissions.bitfield.toString()
  };
}

export function emojiPayload(emoji: GuildEmoji) {
  return {
    id: emoji.id,
    name: emoji.name,
    animated: emoji.animated,
    managed: emoji.managed,
    available: emoji.available,
    roles: [...emoji.roles.cache.keys()]
  };
}

export function stickerPayload(sticker: Sticker) {
  return {
    id: sticker.id,
    guildId: sticker.guildId,
    name: sticker.name,
    description: sticker.description,
    type: sticker.type,
    format: sticker.format,
    available: sticker.available,
    tags: sticker.tags,
    user: sticker.user ? userPayload(sticker.user) : null
  };
}

export function voiceStatePayload(state: VoiceState) {
  return {
    userId: state.id,
    channelId: state.channelId,
    serverDeaf: state.serverDeaf ?? false,
    serverMute: state.serverMute ?? false,
    selfDeaf: state.selfDeaf ?? false,
    selfMute: state.selfMute ?? false,
    selfVideo: state.selfVideo ?? false,
    streaming: state.streaming ?? false,
    suppress: state.suppress ?? false,
    requestToSpeakTimestamp: state.requestToSpeakTimestamp
  };
}
