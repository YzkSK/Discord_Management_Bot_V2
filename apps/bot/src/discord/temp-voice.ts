import {
  ChannelType,
  type Client,
  type GuildBasedChannel,
  PermissionFlagsBits,
  type TextChannel,
  type VoiceBasedChannel
} from "discord.js";

import type { DbClient } from "@discord-bot/db";
import type { RedisStreamWriter } from "@discord-bot/redis";
import type { NormalizedEvent } from "@discord-bot/shared";
import {
  clearTempVoiceChannelDeleteSchedule,
  createTempVoiceChannel,
  endTempVoiceChannel,
  getActiveTempVoiceChannelByChannelId,
  getGuildConfigByGuildId,
  listActiveCallSessionMembers,
  markCallSessionMemberLeft,
  scheduleTempVoiceChannelDelete,
  transferTempVoiceChannelOwner,
  upsertCallSessionMember
} from "@discord-bot/db";

import {
  installVoiceStateHandlers,
  type VoiceStateTransition,
  type VoiceStateTransitionContext
} from "./voice-state.js";
import { createComponentsV2TextMessage } from "./components-v2.js";
import {
  createDiscordLogWriter,
  type DiscordLogWriter
} from "./log-writer.js";
import {
  tempVoiceControlCreateReason,
  tempVoiceCreateReason,
  tempVoiceDeleteReason
} from "./temp-voice-log-suppression.js";

const emptyDeleteDelayMs = 5000;

export interface InstallTempVoiceHandlersOptions {
  db: DbClient;
  redis: RedisStreamWriter;
}

export function installTempVoiceHandlers(
  client: Client,
  options: InstallTempVoiceHandlersOptions
) {
  const logWriter = createDiscordLogWriter(client, options);

  installVoiceStateHandlers(client, {
    onTransition(transition, context) {
      return handleTempVoiceTransition(
        options.db,
        logWriter,
        transition,
        context
      );
    }
  });
}

export function formatTempVoiceChannelName(username: string) {
  return `\u{1F3AE} ${username}`;
}

export function formatTempVoiceControlChannelName(username: string) {
  return `control-${formatTempVoiceChannelName(username)}`;
}

async function handleTempVoiceTransition(
  db: DbClient,
  logWriter: DiscordLogWriter,
  transition: VoiceStateTransition,
  context: VoiceStateTransitionContext
) {
  await handleJoinedChannel(db, logWriter, transition, context);
  await handleLeftChannel(db, logWriter, transition, context);
}

async function handleJoinedChannel(
  db: DbClient,
  logWriter: DiscordLogWriter,
  transition: VoiceStateTransition,
  context: VoiceStateTransitionContext
) {
  if (!transition.newChannelId) {
    return;
  }

  const config = await getGuildConfigByGuildId(db, transition.guildId);

  if (transition.newChannelId === config?.tempVoiceCreateChannelId) {
    await createGeneratedChannel(db, logWriter, transition, context, {
      creationChannelId: config.tempVoiceCreateChannelId,
      categoryId:
        config.tempVoiceCategoryId ?? context.newState.channel?.parentId ?? null
    });
    return;
  }

  const tempVoiceChannel = await getActiveTempVoiceChannelByChannelId(
    db,
    transition.newChannelId
  );

  if (!tempVoiceChannel?.callSessionId) {
    return;
  }

  await clearTempVoiceChannelDeleteSchedule(db, transition.newChannelId);
  await upsertCallSessionMember(db, {
    callSessionId: tempVoiceChannel.callSessionId,
    userId: transition.userId
  });
}

async function handleLeftChannel(
  db: DbClient,
  logWriter: DiscordLogWriter,
  transition: VoiceStateTransition,
  context: VoiceStateTransitionContext
) {
  if (!transition.oldChannelId) {
    return;
  }

  const tempVoiceChannel = await getActiveTempVoiceChannelByChannelId(
    db,
    transition.oldChannelId
  );

  if (!tempVoiceChannel?.callSessionId) {
    return;
  }

  await markCallSessionMemberLeft(db, {
    callSessionId: tempVoiceChannel.callSessionId,
    userId: transition.userId
  });
  await transferOwnerIfNeeded(db, tempVoiceChannel.channelId);

  if (isEmptyVoiceChannel(context.oldState.channel)) {
    await scheduleTempVoiceChannelDelete(db, {
      channelId: transition.oldChannelId,
      deleteScheduledAt: new Date(Date.now() + emptyDeleteDelayMs)
    });
    scheduleDiscordChannelDelete(db, logWriter, context.oldState.channel);
  }
}

async function createGeneratedChannel(
  db: DbClient,
  logWriter: DiscordLogWriter,
  transition: VoiceStateTransition,
  context: VoiceStateTransitionContext,
  input: { creationChannelId: string; categoryId: string | null }
) {
  const member = context.newState.member;

  if (!member) {
    return;
  }

  const channel = await context.newState.guild.channels.create({
    name: formatTempVoiceChannelName(member.displayName),
    ...(input.categoryId ? { parent: input.categoryId } : {}),
    reason: tempVoiceCreateReason,
    type: ChannelType.GuildVoice
  });
  const controlChannel = await createControlChannel(context, {
    categoryId: input.categoryId,
    ownerId: transition.userId,
    tempVoiceChannelId: channel.id
  });

  try {
    await createTempVoiceChannel(db, {
      guildId: transition.guildId,
      channelId: channel.id,
      ownerId: transition.userId,
      creationChannelId: input.creationChannelId,
      controlChannelId: controlChannel.id
    });
    await member.voice.setChannel(channel);
    await writeTempVoiceLog(logWriter, {
      eventName: "voice.temp.created",
      guildId: transition.guildId,
      actorId: transition.userId,
      channelId: channel.id,
      payload: {
        ownerId: transition.userId,
        creationChannelId: input.creationChannelId,
        tempVoiceChannelId: channel.id,
        tempVoiceChannelName: channel.name,
        controlChannelId: controlChannel.id,
        controlChannelName: controlChannel.name,
        categoryId: input.categoryId
      }
    });
  } catch (error) {
    await controlChannel
      .delete("Temp VC creation failed.")
      .catch(() => undefined);
    await channel.delete("Temp VC creation failed.").catch(() => undefined);
    throw error;
  }
}

async function createControlChannel(
  context: VoiceStateTransitionContext,
  input: {
    categoryId: string | null;
    ownerId: string;
    tempVoiceChannelId: string;
  }
) {
  const member = context.newState.member;
  const botMember = context.newState.guild.members.me;
  const permissionOverwrites = [
    {
      id: context.newState.guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: input.ownerId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]
    },
    ...(botMember
      ? [
          {
            id: botMember.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels
            ]
          }
        ]
      : [])
  ];

  const channel = await context.newState.guild.channels.create({
    name: formatTempVoiceControlChannelName(member?.displayName ?? "temp-vc"),
    ...(input.categoryId ? { parent: input.categoryId } : {}),
    permissionOverwrites,
    reason: tempVoiceControlCreateReason,
    type: ChannelType.GuildText
  });

  await sendControlChannelMessage(channel, {
    ownerId: input.ownerId,
    tempVoiceChannelId: input.tempVoiceChannelId
  });

  return channel;
}

async function sendControlChannelMessage(
  channel: TextChannel,
  input: { ownerId: string; tempVoiceChannelId: string }
) {
  await channel.send(
    createComponentsV2TextMessage({
      title: "Temp VC Control",
      lines: [
        `Owner: <@${input.ownerId}>`,
        `Voice channel: <#${input.tempVoiceChannelId}>`,
        "Control buttons will be added in a later issue."
      ]
    })
  );
}

async function transferOwnerIfNeeded(db: DbClient, channelId: string) {
  const tempVoiceChannel = await getActiveTempVoiceChannelByChannelId(
    db,
    channelId
  );

  if (!tempVoiceChannel?.callSessionId) {
    return;
  }

  const activeMembers = await listActiveCallSessionMembers(
    db,
    tempVoiceChannel.callSessionId
  );
  const nextOwner = activeMembers[0];

  if (!nextOwner || nextOwner.userId === tempVoiceChannel.ownerId) {
    return;
  }

  await transferTempVoiceChannelOwner(db, {
    channelId,
    ownerId: nextOwner.userId
  });
}

function scheduleDiscordChannelDelete(
  db: DbClient,
  logWriter: DiscordLogWriter,
  channel: VoiceBasedChannel | null
) {
  if (!channel) {
    return;
  }

  setTimeout(() => {
    void deleteIfStillEmpty(db, logWriter, channel);
  }, emptyDeleteDelayMs);
}

async function deleteIfStillEmpty(
  db: DbClient,
  logWriter: DiscordLogWriter,
  channel: VoiceBasedChannel
) {
  const freshChannel = await channel.guild.channels
    .fetch(channel.id)
    .catch(() => null);

  if (!isVoiceBasedChannel(freshChannel) || !isEmptyVoiceChannel(freshChannel)) {
    return;
  }

  await freshChannel.delete(tempVoiceDeleteReason);
  const deletedTempVoiceChannel = await endTempVoiceChannel(db, {
    channelId: channel.id
  });

  const controlChannel = deletedTempVoiceChannel?.controlChannelId
    ? await channel.guild.channels
      .fetch(deletedTempVoiceChannel.controlChannelId)
      .catch(() => null)
    : null;

  if (controlChannel) {
    await controlChannel?.delete(tempVoiceDeleteReason).catch(() => undefined);
  }

  if (deletedTempVoiceChannel) {
    await writeTempVoiceLog(logWriter, {
      eventName: "voice.temp.deleted",
      guildId: deletedTempVoiceChannel.guildId,
      actorId: deletedTempVoiceChannel.ownerId,
      channelId: deletedTempVoiceChannel.channelId,
      payload: {
        ownerId: deletedTempVoiceChannel.ownerId,
        tempVoiceChannelId: deletedTempVoiceChannel.channelId,
        tempVoiceChannelName: freshChannel.name,
        controlChannelId: deletedTempVoiceChannel.controlChannelId,
        controlChannelName:
          controlChannel && "name" in controlChannel ? controlChannel.name : null,
        creationChannelId: deletedTempVoiceChannel.creationChannelId
      }
    });
  }
}

async function writeTempVoiceLog(
  logWriter: DiscordLogWriter,
  input: Pick<
    NormalizedEvent,
    "eventName" | "guildId" | "actorId" | "channelId" | "payload"
  >
) {
  const now = new Date();

  await logWriter
    .write({
      eventName: input.eventName,
      guildId: input.guildId,
      actorId: input.actorId,
      channelId: input.channelId,
      messageId: null,
      payload: input.payload,
      eventTimestamp: now,
      receivedAt: now
    })
    .catch((error: unknown) => {
      console.warn("failed to write temp voice log event", {
        eventName: input.eventName,
        guildId: input.guildId,
        error
      });
    });
}

function isEmptyVoiceChannel(channel: VoiceBasedChannel | null) {
  return channel?.members.size === 0;
}

function isVoiceBasedChannel(
  channel: GuildBasedChannel | null
): channel is VoiceBasedChannel {
  return channel?.isVoiceBased() === true;
}
