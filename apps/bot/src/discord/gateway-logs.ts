import type { DbClient } from "@discord-bot/db";
import {
  getActiveTempVoiceChannelByChannelId,
  getGuildConfigByGuildId
} from "@discord-bot/db";
import type { RedisStreamWriter } from "@discord-bot/redis";
import type { NormalizedEvent } from "@discord-bot/shared";
import {
  AuditLogEvent,
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

import {
  applyAuditLog,
  getChannelGuild,
  getInviteGuild,
  lookupAuditLog,
  writeWithAuditLog
} from "./audit-log.js";
import { createDiscordLogWriter } from "./log-writer.js";
import {
  isTempVoiceAuditReason,
  shouldSuppressTempVoiceChannelLog
} from "./temp-voice-log-suppression.js";

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
    writeWithAuditLog(
      write,
      createGuildEvent("guild.update", newGuild, {
        before: guildPayload(oldGuild),
        after: guildPayload(newGuild),
        changes: diffRecord(guildPayload(oldGuild), guildPayload(newGuild))
      }),
      newGuild,
      AuditLogEvent.GuildUpdate,
      newGuild.id
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
    void writeMemberRemoveEvent(write, member);
  });

  client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
    const oldTimeout = oldMember.communicationDisabledUntilTimestamp ?? null;
    const newTimeout = newMember.communicationDisabledUntilTimestamp ?? null;
    const eventName = oldTimeout !== newTimeout ? "member.timeout" : "member.update";

    writeWithAuditLog(
      write,
      createGuildEvent(eventName, newMember.guild, {
        before: memberPayload(oldMember),
        after: memberPayload(newMember),
        changes: diffRecord(memberPayload(oldMember), memberPayload(newMember))
      }, newMember.id),
      newMember.guild,
      AuditLogEvent.MemberUpdate,
      newMember.id
    );
  });

  client.on(Events.GuildBanAdd, (ban) => {
    writeWithAuditLog(
      write,
      createGuildEvent("member.ban", ban.guild, {
        user: userPayload(ban.user),
        reason: ban.reason
      }, ban.user.id),
      ban.guild,
      AuditLogEvent.MemberBanAdd,
      ban.user.id
    );
  });

  client.on(Events.GuildBanRemove, (ban) => {
    writeWithAuditLog(
      write,
      createGuildEvent("member.unban", ban.guild, {
        user: userPayload(ban.user),
        reason: ban.reason
      }, ban.user.id),
      ban.guild,
      AuditLogEvent.MemberBanRemove,
      ban.user.id
    );
  });

  client.on(Events.ChannelCreate, (channel) => {
    writeChannelLifecycleEvent(
      write,
      "channel.create",
      channel,
      AuditLogEvent.ChannelCreate
    );
  });

  client.on(Events.ChannelUpdate, (oldChannel, newChannel) => {
    writeWithAuditLog(
      write,
      createChannelEvent("channel.update", newChannel, {
        before: channelPayload(oldChannel),
        after: channelPayload(newChannel),
        changes: diffRecord(channelPayload(oldChannel), channelPayload(newChannel))
      }),
      getChannelGuild(newChannel),
      AuditLogEvent.ChannelUpdate,
      newChannel.id
    );
  });

  client.on(Events.ChannelDelete, (channel) => {
    writeChannelLifecycleEvent(
      write,
      "channel.delete",
      channel,
      AuditLogEvent.ChannelDelete
    );
  });

  client.on(Events.GuildRoleCreate, (role) => {
    writeWithAuditLog(
      write,
      createGuildEvent("role.create", role.guild, { role: rolePayload(role) }),
      role.guild,
      AuditLogEvent.RoleCreate,
      role.id
    );
  });

  client.on(Events.GuildRoleUpdate, (oldRole, newRole) => {
    writeWithAuditLog(
      write,
      createGuildEvent("role.update", newRole.guild, {
        before: rolePayload(oldRole),
        after: rolePayload(newRole),
        changes: diffRecord(rolePayload(oldRole), rolePayload(newRole))
      }),
      newRole.guild,
      AuditLogEvent.RoleUpdate,
      newRole.id
    );
  });

  client.on(Events.GuildRoleDelete, (role) => {
    writeWithAuditLog(
      write,
      createGuildEvent("role.delete", role.guild, { role: rolePayload(role) }),
      role.guild,
      AuditLogEvent.RoleDelete,
      role.id
    );
  });

  client.on(Events.ThreadCreate, (thread, newlyCreated) => {
    writeWithAuditLog(
      write,
      createThreadEvent("thread.create", thread, { thread: threadPayload(thread), newlyCreated }),
      thread.guild,
      AuditLogEvent.ThreadCreate,
      thread.id
    );
  });

  client.on(Events.ThreadUpdate, (oldThread, newThread) => {
    writeWithAuditLog(
      write,
      createThreadEvent("thread.update", newThread, {
        before: threadPayload(oldThread),
        after: threadPayload(newThread),
        changes: diffRecord(threadPayload(oldThread), threadPayload(newThread))
      }),
      newThread.guild,
      AuditLogEvent.ThreadUpdate,
      newThread.id
    );
  });

  client.on(Events.ThreadDelete, (thread) => {
    writeWithAuditLog(
      write,
      createThreadEvent("thread.delete", thread, { thread: threadPayload(thread) }),
      thread.guild,
      AuditLogEvent.ThreadDelete,
      thread.id
    );
  });

  client.on(Events.InviteCreate, (invite) => {
    writeWithAuditLog(
      write,
      createInviteEvent("invite.create", invite),
      getInviteGuild(invite),
      AuditLogEvent.InviteCreate,
      invite.code
    );
  });

  client.on(Events.InviteDelete, (invite) => {
    writeWithAuditLog(
      write,
      createInviteEvent("invite.delete", invite),
      getInviteGuild(invite),
      AuditLogEvent.InviteDelete,
      invite.code
    );
  });

  client.on(Events.GuildEmojiCreate, (emoji) => {
    writeWithAuditLog(
      write,
      createGuildEvent("emoji.create", emoji.guild, { emoji: emojiPayload(emoji) }),
      emoji.guild,
      AuditLogEvent.EmojiCreate,
      emoji.id
    );
  });

  client.on(Events.GuildEmojiUpdate, (oldEmoji, newEmoji) => {
    writeWithAuditLog(
      write,
      createGuildEvent("emoji.update", newEmoji.guild, {
        before: emojiPayload(oldEmoji),
        after: emojiPayload(newEmoji),
        changes: diffRecord(emojiPayload(oldEmoji), emojiPayload(newEmoji))
      }),
      newEmoji.guild,
      AuditLogEvent.EmojiUpdate,
      newEmoji.id
    );
  });

  client.on(Events.GuildEmojiDelete, (emoji) => {
    writeWithAuditLog(
      write,
      createGuildEvent("emoji.delete", emoji.guild, { emoji: emojiPayload(emoji) }),
      emoji.guild,
      AuditLogEvent.EmojiDelete,
      emoji.id
    );
  });

  client.on(Events.GuildStickerCreate, (sticker) => {
    writeWithAuditLog(
      write,
      createGuildEvent("sticker.create", sticker.guild, { sticker: stickerPayload(sticker) }),
      sticker.guild,
      AuditLogEvent.StickerCreate,
      sticker.id
    );
  });

  client.on(Events.GuildStickerUpdate, (oldSticker, newSticker) => {
    writeWithAuditLog(
      write,
      createGuildEvent("sticker.update", newSticker.guild, {
        before: stickerPayload(oldSticker),
        after: stickerPayload(newSticker),
        changes: diffRecord(stickerPayload(oldSticker), stickerPayload(newSticker))
      }),
      newSticker.guild,
      AuditLogEvent.StickerUpdate,
      newSticker.id
    );
  });

  client.on(Events.GuildStickerDelete, (sticker) => {
    writeWithAuditLog(
      write,
      createGuildEvent("sticker.delete", sticker.guild, { sticker: stickerPayload(sticker) }),
      sticker.guild,
      AuditLogEvent.StickerDelete,
      sticker.id
    );
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
    writeWithAuditLog(
      write,
      createChannelEvent("message.bulk_delete", channel, {
        channel: channelPayload(channel),
        messageIds: [...messages.keys()],
        count: messages.size
      }),
      getChannelGuild(channel),
      AuditLogEvent.MessageBulkDelete,
      channel.id
    );
  });

  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    void writeVoiceStateEvent(write, oldState, newState, options.db);
  });

  client.on(Events.WebhooksUpdate, (channel) => {
    writeWithAuditLog(
      write,
      createChannelEvent("webhook.update", channel, { channel: channelPayload(channel) }),
      getChannelGuild(channel),
      AuditLogEvent.WebhookUpdate,
      channel.id
    );
  });
}

function writeChannelLifecycleEvent(
  write: (event: NormalizedEvent) => void,
  eventName: "channel.create" | "channel.delete",
  channel: DMChannel | GuildTextBasedChannel | NonThreadGuildBasedChannel,
  action: AuditLogEvent.ChannelCreate | AuditLogEvent.ChannelDelete
) {
  if (shouldSuppressTempVoiceChannelLog(channel.id)) {
    return;
  }

  const event = createChannelEvent(eventName, channel, {
    channel: channelPayload(channel)
  });
  const guild = getChannelGuild(channel);

  void Promise.resolve()
    .then(() => lookupAuditLog(guild, action, channel.id))
    .then((auditLog) => {
      if (isTempVoiceAuditReason(auditLog.reason)) {
        return;
      }

      write(applyAuditLog(event, auditLog));
    })
    .catch((error: unknown) => {
      console.warn("failed to enrich channel lifecycle log event", {
        eventName,
        guildId: event.guildId,
        error
      });
      write(event);
    });
}

async function writeVoiceStateEvent(
  write: (event: NormalizedEvent) => void,
  oldState: VoiceState,
  newState: VoiceState,
  db: DbClient
) {
  const eventName = resolveVoiceStateLogEventName(oldState, newState);

  if (
    shouldSkipVoiceStateLog({
      eventName,
      memberIsBot:
        oldState.member?.user.bot === true || newState.member?.user.bot === true
    })
  ) {
    return;
  }

  if (await shouldSuppressTempVoiceStateEvent(oldState, newState, db)) {
    return;
  }

  write(createVoiceEvent(eventName, oldState, newState));
}

export function shouldSkipVoiceStateLog(input: {
  eventName: string;
  memberIsBot: boolean;
}) {
  return (
    input.memberIsBot &&
    (input.eventName === "voice.session.join" ||
      input.eventName === "voice.session.leave")
  );
}

async function shouldSuppressTempVoiceStateEvent(
  oldState: VoiceState,
  newState: VoiceState,
  db: DbClient
) {
  const config = await getGuildConfigByGuildId(db, newState.guild.id);

  if (!config?.tempVoiceCreateChannelId) {
    return false;
  }

  if (newState.channelId === config.tempVoiceCreateChannelId) {
    return true;
  }

  if (
    oldState.channelId === config.tempVoiceCreateChannelId &&
    newState.channelId
  ) {
    const tempVoiceChannel = await getActiveTempVoiceChannelByChannelId(
      db,
      newState.channelId
    );

    return tempVoiceChannel !== null;
  }

  return false;
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

async function writeMemberRemoveEvent(
  write: (event: NormalizedEvent) => void,
  member: GuildMember | PartialGuildMember
) {
  const auditLog = await lookupAuditLog(
    member.guild,
    AuditLogEvent.MemberKick,
    member.id
  );
  const eventName = auditLog.status === "matched" ? "member.kick" : "member.leave";
  const event = createGuildEvent(eventName, member.guild, {
    member: memberPayload(member)
  }, auditLog.actorId ?? member.id);

  write(applyAuditLog(event, auditLog));
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
