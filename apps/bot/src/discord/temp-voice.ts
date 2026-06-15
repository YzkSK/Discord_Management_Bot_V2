import {
  ChannelType,
  type Client,
  ComponentType,
  DiscordAPIError,
  Events,
  type Guild,
  type GuildBasedChannel,
  MessageFlags,
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
  getGuildConfigByGuildId,
  listActiveCallSessionMembers,
  listAllActiveTempVoiceChannels,
  listDiscordChannelNamesByIds,
  markCallSessionMemberLeft,
  scheduleTempVoiceChannelDelete,
  transferTempVoiceChannelOwner,
  upsertCallSessionMember
} from "@discord-bot/db";

import { updateDiscordVoiceStatusMessage } from "./voice-activity.js";

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

  client.once(Events.ClientReady, (readyClient) => {
    void reconcileTempVoiceChannels(readyClient, options.db, logWriter).catch(
      (err: unknown) => {
        console.error("temp-vc: startup reconciliation failed", err);
      }
    );
  });
}

export function formatTempVoiceChannelName(username: string) {
  return `\u{1F3AE} ${username}`;
}

export function formatTempVoiceControlChannelName(username: string) {
  return `control-${formatTempVoiceChannelName(username)}`;
}

export function createTempVoiceChannelPermissionOverwrites(input: {
  botMemberId: string | null | undefined;
}) {
  return input.botMemberId
    ? [
        {
          id: input.botMemberId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageRoles,
            PermissionFlagsBits.Connect
          ]
        }
      ]
    : [];
}

export async function createTempVoiceDiscordChannel(
  guild: Guild,
  input: {
    botMemberId: string | null | undefined;
    categoryId: string | null;
    displayName: string;
  }
) {
  const permissionOverwrites = createTempVoiceChannelPermissionOverwrites({
    botMemberId: input.botMemberId
  });
  const baseOptions = {
    name: formatTempVoiceChannelName(input.displayName),
    reason: tempVoiceCreateReason,
    type: ChannelType.GuildVoice
  } as const;
  const attempts = [
    {
      ...baseOptions,
      ...(input.categoryId ? { parent: input.categoryId } : {}),
      ...(permissionOverwrites.length > 0 ? { permissionOverwrites } : {})
    },
    ...(input.categoryId
      ? [
          {
            ...baseOptions,
            ...(permissionOverwrites.length > 0 ? { permissionOverwrites } : {})
          }
        ]
      : []),
    ...(permissionOverwrites.length > 0
      ? [
          {
            ...baseOptions,
            ...(input.categoryId ? { parent: input.categoryId } : {})
          },
          ...(input.categoryId ? [baseOptions] : [])
        ]
      : [])
  ];

  let lastError: unknown = null;
  for (const [index, options] of attempts.entries()) {
    try {
      return await guild.channels.create(options);
    } catch (error) {
      lastError = error;
      if (!isMissingPermissionsError(error) || index === attempts.length - 1) {
        throw error;
      }

      console.warn("temp-vc: voice channel creation forbidden; retrying with fewer constraints", {
        guildId: guild.id,
        categoryId: "parent" in options ? input.categoryId : null,
        hadPermissionOverwrites: "permissionOverwrites" in options
      });
    }
  }

  throw lastError;
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

  let channel;
  try {
    channel = await createTempVoiceDiscordChannel(context.newState.guild, {
      botMemberId: context.newState.guild.members.me?.id,
      categoryId: input.categoryId,
      displayName: member.displayName
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
  });

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
  suppressTempVoiceChannelLog(channel.id);

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
  await channel.send({ ...createTempVoiceControlMessage(input), allowedMentions: { parse: [] } });
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

  await transferTempVoiceChannelOwner(db, {
    channelId: input.channelId,
    ownerId: nextOwner.userId
  });
  await updateControlChannelOwnerPermissions(guild, {
    controlChannelId: tempVoiceChannel.controlChannelId,
    nextOwnerId: nextOwner.userId,
    previousOwnerId: tempVoiceChannel.ownerId
  });
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
  }
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
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.Container,
          accent_color: 0xFFD700,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `## 👑 オーナーが変更されました`
            },
            {
              type: ComponentType.TextDisplay,
              content: `<@${input.nextOwnerId}> さんがこの Temp VC のオーナーになりました。\nコントロールパネルからチャンネルを管理できます。`
            }
          ]
        }
      ]
    } as never).catch(() => undefined);
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
  try {
    await freshChannel.delete(tempVoiceDeleteReason);
  } catch (error) {
    if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownChannel) {
      // チャンネルはすでに存在しない → DB のクリーンアップだけ続行
    } else {
      console.error("temp-vc: failed to delete channel", { channelId: freshChannel.id, error });
      return;
    }
  }
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

async function reconcileTempVoiceChannels(
  client: Client,
  db: DbClient,
  logWriter: DiscordLogWriter
) {
  const tempVCs = await listAllActiveTempVoiceChannels(db);
  if (tempVCs.length === 0) return;

  let ended = 0;
  let rescheduled = 0;

  for (const tempVC of tempVCs) {
    const guild = client.guilds.cache.get(tempVC.guildId);
    if (!guild) continue;

    const channel = await guild.channels.fetch(tempVC.channelId).catch(() => null);

    if (!channel) {
      const deleted = await endTempVoiceChannel(db, { channelId: tempVC.channelId }).catch(
        (err: unknown) => {
          console.error("temp-vc: reconcile endTempVoiceChannel failed", { channelId: tempVC.channelId, err });
          return null;
        }
      );

      if (deleted?.controlChannelId) {
        const controlChannel = await guild.channels
          .fetch(deleted.controlChannelId)
          .catch(() => null);
        if (controlChannel) {
          suppressTempVoiceChannelLog(controlChannel.id);
          await controlChannel.delete(tempVoiceDeleteReason).catch(() => undefined);
        }
      }

      if (deleted?.callSessionId) {
        const session = await getCallSessionById(db, deleted.callSessionId).catch(() => null);
        if (session) {
          const nameMap = await listDiscordChannelNamesByIds(db, [tempVC.channelId]).catch(() => new Map<string, string>());
          await updateDiscordVoiceStatusMessage(client, db, {
            activeMemberCount: 0,
            channelName: nameMap.get(tempVC.channelId) ?? null,
            endedAt: session.endedAt ?? new Date(),
            session,
            state: "ended"
          }).catch(() => undefined);
        }
      }

      if (deleted) {
        await writeTempVoiceLog(logWriter, {
          eventName: "voice.temp.deleted",
          guildId: deleted.guildId,
          actorId: deleted.ownerId,
          channelId: deleted.channelId,
          payload: {
            ownerId: deleted.ownerId,
            callSessionId: deleted.callSessionId,
            tempVoiceChannelId: deleted.channelId,
            tempVoiceChannelName: null,
            controlChannelId: deleted.controlChannelId,
            creationChannelId: deleted.creationChannelId
          }
        }).catch(() => undefined);
      }

      ended++;
      continue;
    }

    if (isVoiceBasedChannel(channel) && isEmptyVoiceChannel(channel)) {
      scheduleDiscordChannelDelete(db, logWriter, channel);
      rescheduled++;
    }
  }

  console.log("temp-vc reconciliation complete", { ended, rescheduled });
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

function isMissingPermissionsError(error: unknown) {
  return (
    (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.MissingPermissions) ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === RESTJSONErrorCodes.MissingPermissions)
  );
}
