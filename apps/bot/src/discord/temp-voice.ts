import {
  ChannelType,
  type Client,
  DiscordAPIError,
  Events,
  type Guild,
  type GuildBasedChannel,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
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
  getCallSessionById,
  listActiveCallSessionMembers,
  markCallSessionMemberLeft,
  scheduleTempVoiceChannelDelete,
  transferTempVoiceChannelOwner,
  upsertCallSessionMember
} from "@discord-bot/db";

import { updateDiscordVoiceStatusMessage } from "./voice-activity.js";
import { resolveGuildLocale } from "./resolve-locale.js";
import { createComponentsV2TextMessage } from "./components-v2.js";
import {
  installVoiceStateHandlers,
  type VoiceStateTransition,
  type VoiceStateTransitionContext
} from "./voice-state.js";
import { createTempVoiceControlMessage } from "./temp-voice-controls.js";
import {
  createDiscordLogWriter,
  type DiscordLogWriter
} from "./log-writer.js";
import {
  suppressTempVoiceChannelLog,
  tempVoiceControlCreateReason,
  tempVoiceCreateReason,
  tempVoiceDeleteReason
} from "./temp-voice-log-suppression.js";

const emptyDeleteDelayMs = 5000;
const ownerTransferDelayMs = 10 * 60 * 1000; // 10分

const pendingOwnerTransferTimers = new Map<string, ReturnType<typeof setTimeout>>();

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

  client.on(Events.ChannelDelete, (channel) => {
    const pendingTimer = pendingOwnerTransferTimers.get(channel.id);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingOwnerTransferTimers.delete(channel.id);
    }
    void getActiveTempVoiceChannelByChannelId(options.db, channel.id)
      .then(async (tempVC) => {
        if (!tempVC) return;
        const deleted = await endTempVoiceChannel(options.db, { channelId: channel.id });
        if (!deleted) return;

        if (deleted.controlChannelId) {
          const guild = client.guilds.cache.get(deleted.guildId);
          const controlChannel = await guild?.channels
            .fetch(deleted.controlChannelId)
            .catch(() => null);
          if (controlChannel) {
            suppressTempVoiceChannelLog(controlChannel.id);
            await controlChannel.delete(tempVoiceDeleteReason).catch(() => undefined);
          }
        }

        if (deleted.callSessionId) {
          const session = await getCallSessionById(options.db, deleted.callSessionId).catch(() => null);
          if (session) {
            await updateDiscordVoiceStatusMessage(client, options.db, {
              activeMemberCount: 0,
              channelName: "name" in channel ? channel.name : null,
              endedAt: session.endedAt ?? new Date(),
              session,
              state: "ended"
            }).catch(() => undefined);
          }
        }

        await writeTempVoiceLog(logWriter, {
          eventName: "voice.temp.deleted",
          guildId: deleted.guildId,
          actorId: deleted.ownerId,
          channelId: deleted.channelId,
          payload: {
            ownerId: deleted.ownerId,
            callSessionId: deleted.callSessionId,
            tempVoiceChannelId: deleted.channelId,
            tempVoiceChannelName: "name" in channel ? channel.name : null,
            controlChannelId: deleted.controlChannelId,
            creationChannelId: deleted.creationChannelId
          }
        });
      })
      .catch((err: unknown) => {
        console.error("temp-vc: channelDelete cleanup failed", { channelId: channel.id, err });
      });
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

  if (tempVoiceChannel.ownerId === transition.userId) {
    const existing = pendingOwnerTransferTimers.get(transition.newChannelId);
    if (existing) {
      clearTimeout(existing);
      pendingOwnerTransferTimers.delete(transition.newChannelId);
    }
  }
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

  if (tempVoiceChannel.ownerId === transition.userId) {
    const existing = pendingOwnerTransferTimers.get(transition.oldChannelId);
    if (existing) clearTimeout(existing);

    const channelId = tempVoiceChannel.channelId;
    const tempVoiceChannelName = context.oldState.channel?.name ?? null;
    const guild = context.oldState.guild;

    const timer = setTimeout(async () => {
      pendingOwnerTransferTimers.delete(channelId);
      await transferOwnerIfNeeded(db, logWriter, guild, {
        channelId,
        tempVoiceChannelName
      });
    }, ownerTransferDelayMs);

    pendingOwnerTransferTimers.set(channelId, timer);
  }

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

  const loc = await resolveGuildLocale(db, transition.guildId);

  let channel;
  try {
    channel = await context.newState.guild.channels.create({
      name: formatTempVoiceChannelName(member.displayName),
      ...(input.categoryId ? { parent: input.categoryId } : {}),
      reason: tempVoiceCreateReason,
      type: ChannelType.GuildVoice
    });
  } catch (error) {
    if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.MissingPermissions) {
      console.warn("temp-vc: bot lacks permission to create voice channel", {
        guildId: transition.guildId,
        categoryId: input.categoryId
      });
      return;
    }
    throw error;
  }

  suppressTempVoiceChannelLog(channel.id);
  const controlChannel = await createControlChannel(context, {
    categoryId: input.categoryId,
    ownerId: transition.userId,
    tempVoiceChannelId: channel.id
  }, loc);

  try {
    const createdTempVoice = await createTempVoiceChannel(db, {
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
        callSessionId: createdTempVoice.callSession.id,
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
  },
  loc: Awaited<ReturnType<typeof resolveGuildLocale>>
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
  suppressTempVoiceChannelLog(channel.id);

  await sendControlChannelMessage(channel, {
    ownerId: input.ownerId,
    tempVoiceChannelId: input.tempVoiceChannelId
  }, loc);

  return channel;
}

async function sendControlChannelMessage(
  channel: TextChannel,
  input: { ownerId: string; tempVoiceChannelId: string },
  loc: Awaited<ReturnType<typeof resolveGuildLocale>>
) {
  await channel.send({ ...createTempVoiceControlMessage(input, loc), allowedMentions: { parse: [] } });
}

export interface TempVoiceOwnerCandidate {
  joinOrder: number;
  joinedAt: Date;
  userId: string;
}

export function selectNextTempVoiceOwner(
  activeMembers: readonly TempVoiceOwnerCandidate[],
  currentOwnerId: string
) {
  return [...activeMembers]
    .filter((member) => member.userId !== currentOwnerId)
    .sort(
      (left, right) =>
        left.joinedAt.getTime() - right.joinedAt.getTime() ||
        left.joinOrder - right.joinOrder
    )[0] ?? null;
}

export function createTempVoiceOwnerTransferredEvent(input: {
  callSessionId: string | null;
  channelId: string;
  controlChannelId: string | null;
  guildId: string;
  nextOwnerId: string;
  previousOwnerId: string;
  tempVoiceChannelName: string | null;
}) {
  return {
    eventName: "voice.temp.owner_transferred",
    guildId: input.guildId,
    actorId: input.nextOwnerId,
    channelId: input.channelId,
    payload: {
      callSessionId: input.callSessionId,
      controlChannelId: input.controlChannelId,
      nextOwnerId: input.nextOwnerId,
      previousOwnerId: input.previousOwnerId,
      tempVoiceChannelId: input.channelId,
      tempVoiceChannelName: input.tempVoiceChannelName
    }
  };
}

async function transferOwnerIfNeeded(
  db: DbClient,
  logWriter: DiscordLogWriter,
  guild: Guild,
  input: { channelId: string; tempVoiceChannelName: string | null }
) {
  const tempVoiceChannel = await getActiveTempVoiceChannelByChannelId(
    db,
    input.channelId
  );

  if (!tempVoiceChannel?.callSessionId) {
    return;
  }

  const activeMembers = await listActiveCallSessionMembers(
    db,
    tempVoiceChannel.callSessionId
  );
  const nextOwner = selectNextTempVoiceOwner(
    activeMembers,
    tempVoiceChannel.ownerId
  );

  if (!nextOwner) {
    return;
  }

  const loc = await resolveGuildLocale(db, tempVoiceChannel.guildId);

  await transferTempVoiceChannelOwner(db, {
    channelId: input.channelId,
    ownerId: nextOwner.userId
  });
  await updateControlChannelOwnerPermissions(guild, {
    controlChannelId: tempVoiceChannel.controlChannelId,
    nextOwnerId: nextOwner.userId,
    previousOwnerId: tempVoiceChannel.ownerId
  }, loc);
  await writeTempVoiceLog(
    logWriter,
    createTempVoiceOwnerTransferredEvent({
      callSessionId: tempVoiceChannel.callSessionId,
      channelId: tempVoiceChannel.channelId,
      controlChannelId: tempVoiceChannel.controlChannelId,
      guildId: tempVoiceChannel.guildId,
      nextOwnerId: nextOwner.userId,
      previousOwnerId: tempVoiceChannel.ownerId,
      tempVoiceChannelName: input.tempVoiceChannelName
    })
  );
}

export async function updateControlChannelOwnerPermissions(
  guild: Guild,
  input: {
    controlChannelId: string | null;
    nextOwnerId: string;
    previousOwnerId: string;
  },
  loc: Awaited<ReturnType<typeof resolveGuildLocale>>
) {
  if (!input.controlChannelId) {
    return;
  }

  const controlChannel = await guild.channels
    .fetch(input.controlChannelId)
    .catch(() => null);

  if (!controlChannel || !("permissionOverwrites" in controlChannel)) {
    return;
  }

  await controlChannel.permissionOverwrites
    .edit(input.previousOwnerId, {
      ReadMessageHistory: null,
      SendMessages: null,
      ViewChannel: null
    })
    .catch(() => undefined);
  await controlChannel.permissionOverwrites.edit(input.nextOwnerId, {
    ReadMessageHistory: true,
    SendMessages: true,
    ViewChannel: true
  });

  if ("send" in controlChannel) {
    await (controlChannel as TextChannel).send({
      ...createComponentsV2TextMessage({
        title: loc.tempVcOwnerChangedTitle,
        lines: [loc.tempVcOwnerChangedMessage({ userId: input.nextOwnerId })],
        accentColor: 0xFFD700
      })
    }).catch(() => undefined);
  }
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

  suppressTempVoiceChannelLog(freshChannel.id);
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
    suppressTempVoiceChannelLog(controlChannel.id);
    await controlChannel.delete(tempVoiceDeleteReason).catch(() => undefined);
  }

  if (deletedTempVoiceChannel) {
    await writeTempVoiceLog(logWriter, {
      eventName: "voice.temp.deleted",
      guildId: deletedTempVoiceChannel.guildId,
      actorId: deletedTempVoiceChannel.ownerId,
      channelId: deletedTempVoiceChannel.channelId,
      payload: {
        ownerId: deletedTempVoiceChannel.ownerId,
        callSessionId: deletedTempVoiceChannel.callSessionId,
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
