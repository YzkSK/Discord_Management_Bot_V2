import type { DbClient } from "@discord-bot/db";
import type { RedisStreamWriter } from "@discord-bot/redis";
import type { NormalizedEvent } from "@discord-bot/shared";
import {
  Events,
  type AnyThreadChannel,
  type Client,
  type DMChannel,
  type Guild,
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

import { createDiscordLogWriter } from "./log-writer.js";

export interface InstallGatewayLogHandlersOptions {
  db: DbClient;
  redis: RedisStreamWriter;
}

export function installGatewayLogHandlers(
  client: Client,
  options: InstallGatewayLogHandlersOptions
) {
  const writer = createDiscordLogWriter(client, options);
  const write = (event: NormalizedEvent) => {
    void writer.write(event).catch((error: unknown) => {
      console.warn("failed to write gateway log event", {
        eventName: event.eventName,
        guildId: event.guildId,
        error
      });
    });
  };

  client.on(Events.GuildUpdate, (oldGuild, newGuild) => {
    write(
      createGuildEvent("guild.update", newGuild, {
        before: guildPayload(oldGuild),
        after: guildPayload(newGuild),
        changes: diffRecord(guildPayload(oldGuild), guildPayload(newGuild))
      })
    );
  });

  client.on(Events.GuildMemberAdd, (member) => {
    write(
      createGuildEvent("member.join", member.guild, {
        member: memberPayload(member)
      }, member.id)
    );
  });

  client.on(Events.GuildMemberRemove, (member) => {
    write(
      createGuildEvent("member.leave", member.guild, {
        member: memberPayload(member)
      }, member.id)
    );
  });

  client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
    const oldTimeout = oldMember.communicationDisabledUntilTimestamp ?? null;
    const newTimeout = newMember.communicationDisabledUntilTimestamp ?? null;
    const eventName = oldTimeout !== newTimeout ? "member.timeout" : "member.update";

    write(
      createGuildEvent(eventName, newMember.guild, {
        before: memberPayload(oldMember),
        after: memberPayload(newMember),
        changes: diffRecord(memberPayload(oldMember), memberPayload(newMember))
      }, newMember.id)
    );
  });

  client.on(Events.GuildBanAdd, (ban) => {
    write(
      createGuildEvent("member.ban", ban.guild, {
        user: userPayload(ban.user),
        reason: ban.reason
      }, ban.user.id)
    );
  });

  client.on(Events.GuildBanRemove, (ban) => {
    write(
      createGuildEvent("member.unban", ban.guild, {
        user: userPayload(ban.user),
        reason: ban.reason
      }, ban.user.id)
    );
  });

  client.on(Events.ChannelCreate, (channel) => {
    write(createChannelEvent("channel.create", channel, { channel: channelPayload(channel) }));
  });

  client.on(Events.ChannelUpdate, (oldChannel, newChannel) => {
    write(
      createChannelEvent("channel.update", newChannel, {
        before: channelPayload(oldChannel),
        after: channelPayload(newChannel),
        changes: diffRecord(channelPayload(oldChannel), channelPayload(newChannel))
      })
    );
  });

  client.on(Events.ChannelDelete, (channel) => {
    write(createChannelEvent("channel.delete", channel, { channel: channelPayload(channel) }));
  });

  client.on(Events.GuildRoleCreate, (role) => {
    write(createGuildEvent("role.create", role.guild, { role: rolePayload(role) }));
  });

  client.on(Events.GuildRoleUpdate, (oldRole, newRole) => {
    write(
      createGuildEvent("role.update", newRole.guild, {
        before: rolePayload(oldRole),
        after: rolePayload(newRole),
        changes: diffRecord(rolePayload(oldRole), rolePayload(newRole))
      })
    );
  });

  client.on(Events.GuildRoleDelete, (role) => {
    write(createGuildEvent("role.delete", role.guild, { role: rolePayload(role) }));
  });

  client.on(Events.ThreadCreate, (thread, newlyCreated) => {
    write(createThreadEvent("thread.create", thread, { thread: threadPayload(thread), newlyCreated }));
  });

  client.on(Events.ThreadUpdate, (oldThread, newThread) => {
    write(
      createThreadEvent("thread.update", newThread, {
        before: threadPayload(oldThread),
        after: threadPayload(newThread),
        changes: diffRecord(threadPayload(oldThread), threadPayload(newThread))
      })
    );
  });

  client.on(Events.ThreadDelete, (thread) => {
    write(createThreadEvent("thread.delete", thread, { thread: threadPayload(thread) }));
  });

  client.on(Events.InviteCreate, (invite) => {
    write(createInviteEvent("invite.create", invite));
  });

  client.on(Events.InviteDelete, (invite) => {
    write(createInviteEvent("invite.delete", invite));
  });

  client.on(Events.GuildEmojiCreate, (emoji) => {
    write(createGuildEvent("emoji.create", emoji.guild, { emoji: emojiPayload(emoji) }));
  });

  client.on(Events.GuildEmojiUpdate, (oldEmoji, newEmoji) => {
    write(
      createGuildEvent("emoji.update", newEmoji.guild, {
        before: emojiPayload(oldEmoji),
        after: emojiPayload(newEmoji),
        changes: diffRecord(emojiPayload(oldEmoji), emojiPayload(newEmoji))
      })
    );
  });

  client.on(Events.GuildEmojiDelete, (emoji) => {
    write(createGuildEvent("emoji.delete", emoji.guild, { emoji: emojiPayload(emoji) }));
  });

  client.on(Events.GuildStickerCreate, (sticker) => {
    write(createGuildEvent("sticker.create", sticker.guild, { sticker: stickerPayload(sticker) }));
  });

  client.on(Events.GuildStickerUpdate, (oldSticker, newSticker) => {
    write(
      createGuildEvent("sticker.update", newSticker.guild, {
        before: stickerPayload(oldSticker),
        after: stickerPayload(newSticker),
        changes: diffRecord(stickerPayload(oldSticker), stickerPayload(newSticker))
      })
    );
  });

  client.on(Events.GuildStickerDelete, (sticker) => {
    write(createGuildEvent("sticker.delete", sticker.guild, { sticker: stickerPayload(sticker) }));
  });

  client.on(Events.MessageReactionAdd, (reaction, user) => {
    if (user.bot) {
      return;
    }

    write(
      createReactionEvent(
        "message.reaction.add",
        reaction.message,
        user,
        reaction.emoji.toString()
      )
    );
  });

  client.on(Events.MessageReactionRemove, (reaction, user) => {
    if (user.bot) {
      return;
    }

    write(
      createReactionEvent(
        "message.reaction.remove",
        reaction.message,
        user,
        reaction.emoji.toString()
      )
    );
  });

  client.on(Events.MessageBulkDelete, (messages, channel) => {
    write(
      createChannelEvent("message.bulk_delete", channel, {
        channel: channelPayload(channel),
        messageIds: [...messages.keys()],
        count: messages.size
      })
    );
  });

  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    write(createVoiceEvent(oldState, newState));
  });

  client.on(Events.WebhooksUpdate, (channel) => {
    write(createChannelEvent("webhook.update", channel, { channel: channelPayload(channel) }));
  });
}

export function resolveVoiceStateLogEventName(
  oldState: Pick<VoiceState, "channelId">,
  newState: Pick<VoiceState, "channelId">
) {
  if (!oldState.channelId && newState.channelId) {
    return "voice.session.join";
  }

  if (oldState.channelId && !newState.channelId) {
    return "voice.session.leave";
  }

  if (oldState.channelId !== newState.channelId) {
    return "voice.session.move";
  }

  return "voice.state.update";
}

function createGuildEvent(
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

function createChannelEvent(
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

function createThreadEvent(
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

function createInviteEvent(eventName: string, invite: Invite): NormalizedEvent {
  return createEvent(eventName, {
    guildId: invite.guild?.id ?? null,
    actorId: invite.inviter?.id ?? null,
    channelId: invite.channel?.id ?? null,
    messageId: null,
    payload: {
      invite: {
        code: invite.code,
        url: invite.url,
        maxAge: invite.maxAge,
        maxUses: invite.maxUses,
        temporary: invite.temporary,
        uses: invite.uses
      },
      inviter: invite.inviter ? userPayload(invite.inviter) : null
    }
  });
}

function createReactionEvent(
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

function createVoiceEvent(
  oldState: VoiceState,
  newState: VoiceState
): NormalizedEvent {
  const eventName = resolveVoiceStateLogEventName(oldState, newState);

  return createEvent(eventName, {
    guildId: newState.guild.id,
    actorId: newState.member?.id ?? newState.id,
    channelId: newState.channelId ?? oldState.channelId,
    messageId: null,
    payload: {
      before: voiceStatePayload(oldState),
      after: voiceStatePayload(newState),
      changes: diffRecord(voiceStatePayload(oldState), voiceStatePayload(newState))
    }
  });
}

function createEvent(
  eventName: string,
  input: Pick<
    NormalizedEvent,
    "guildId" | "actorId" | "channelId" | "messageId" | "payload"
  >
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

function guildPayload(guild: Guild) {
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

function memberPayload(member: GuildMember | PartialGuildMember) {
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

function userPayload(user: User | PartialUser) {
  return {
    id: user.id,
    username: user.username,
    globalName: user.globalName,
    bot: user.bot
  };
}

function channelPayload(channel: DMChannel | GuildBasedChannel | GuildTextBasedChannel) {
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

function threadPayload(thread: AnyThreadChannel) {
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

function rolePayload(role: Role) {
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

function emojiPayload(emoji: GuildEmoji) {
  return {
    id: emoji.id,
    name: emoji.name,
    animated: emoji.animated,
    managed: emoji.managed,
    available: emoji.available,
    roles: [...emoji.roles.cache.keys()]
  };
}

function stickerPayload(sticker: Sticker) {
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

function voiceStatePayload(state: VoiceState) {
  return {
    userId: state.id,
    channelId: state.channelId,
    deaf: state.deaf,
    mute: state.mute,
    selfDeaf: state.selfDeaf,
    selfMute: state.selfMute,
    selfVideo: state.selfVideo,
    streaming: state.streaming,
    suppress: state.suppress,
    requestToSpeakTimestamp: state.requestToSpeakTimestamp
  };
}

function diffRecord(
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
