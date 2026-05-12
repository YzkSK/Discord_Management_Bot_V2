import {
  ChannelType,
  type Client,
  EmbedBuilder,
  type GuildBasedChannel,
  PermissionFlagsBits,
  type TextChannel,
  type VoiceBasedChannel
} from "discord.js";

import type { DbClient } from "@discord-bot/db";
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

const emptyDeleteDelayMs = 5000;

export interface InstallTempVoiceHandlersOptions {
  db: DbClient;
}

export function installTempVoiceHandlers(
  client: Client,
  options: InstallTempVoiceHandlersOptions
) {
  installVoiceStateHandlers(client, {
    onTransition(transition, context) {
      return handleTempVoiceTransition(options.db, transition, context);
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
  transition: VoiceStateTransition,
  context: VoiceStateTransitionContext
) {
  await handleJoinedChannel(db, transition, context);
  await handleLeftChannel(db, transition, context);
}

async function handleJoinedChannel(
  db: DbClient,
  transition: VoiceStateTransition,
  context: VoiceStateTransitionContext
) {
  if (!transition.newChannelId) {
    return;
  }

  const config = await getGuildConfigByGuildId(db, transition.guildId);

  if (transition.newChannelId === config?.tempVoiceCreateChannelId) {
    await createGeneratedChannel(db, transition, context, {
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
    scheduleDiscordChannelDelete(db, context.oldState.channel);
  }
}

async function createGeneratedChannel(
  db: DbClient,
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
    reason: "Temp VC created from creation channel.",
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
    reason: "Temp VC control channel created.",
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
  const embed = new EmbedBuilder()
    .setTitle("Temp VC Control")
    .setDescription("Control buttons will be added in a later issue.")
    .addFields(
      { name: "Owner", value: `<@${input.ownerId}>`, inline: true },
      {
        name: "Voice Channel",
        value: `<#${input.tempVoiceChannelId}>`,
        inline: true
      }
    )
    .setTimestamp(new Date());

  await channel.send({ embeds: [embed] });
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
  channel: VoiceBasedChannel | null
) {
  if (!channel) {
    return;
  }

  setTimeout(() => {
    void deleteIfStillEmpty(db, channel);
  }, emptyDeleteDelayMs);
}

async function deleteIfStillEmpty(db: DbClient, channel: VoiceBasedChannel) {
  const freshChannel = await channel.guild.channels
    .fetch(channel.id)
    .catch(() => null);

  if (!isVoiceBasedChannel(freshChannel) || !isEmptyVoiceChannel(freshChannel)) {
    return;
  }

  await freshChannel.delete("Temp VC empty.");
  const deletedTempVoiceChannel = await endTempVoiceChannel(db, {
    channelId: channel.id
  });

  if (deletedTempVoiceChannel?.controlChannelId) {
    const controlChannel = await channel.guild.channels
      .fetch(deletedTempVoiceChannel.controlChannelId)
      .catch(() => null);

    await controlChannel?.delete("Temp VC empty.").catch(() => undefined);
  }
}

function isEmptyVoiceChannel(channel: VoiceBasedChannel | null) {
  return channel?.members.size === 0;
}

function isVoiceBasedChannel(
  channel: GuildBasedChannel | null
): channel is VoiceBasedChannel {
  return channel?.isVoiceBased() === true;
}
