import { listDashboardAccessGrants, type DbClient } from "@discord-bot/db";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type GuildMember,
  type InteractionReplyOptions,
  type InteractionUpdateOptions
} from "discord.js";

import { createComponentsV2TextMessage } from "../discord/components-v2.js";
import {
  hasDashboardAdminCommandAccess,
  resolveDashboardCommandAccessRole
} from "../discord/dashboard-access.js";
import type { DiscordLogWriter } from "../discord/log-writer.js";
import {
  createTtsSessionStartedEvent,
  createTtsSessionStoppedEvent
} from "../discord/tts-logs.js";
import type { TtsSessionManager } from "../discord/tts-session.js";

export const joinCommand = new SlashCommandBuilder()
  .setName("join")
  .setDescription("Join your voice channel and read this text channel.");

export const forceJoinCommand = new SlashCommandBuilder()
  .setName("force-join")
  .setDescription("Move TTS to your voice channel after confirmation.")
  .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages);

export const leaveCommand = new SlashCommandBuilder()
  .setName("leave")
  .setDescription("Stop TTS and leave the current voice channel.");

export interface TtsCommandContext {
  db: DbClient;
  logWriter?: DiscordLogWriter;
  ttsSessionManager: TtsSessionManager;
}

export interface ForceJoinCustomIdInput {
  guildId: string;
  textChannelId: string;
  userId: string;
  voiceChannelId: string;
}

const forceJoinCustomIdPrefix = "tts-force-join";
const forceJoinCancelCustomIdPrefix = "tts-force-join-cancel";

export function toForceJoinCustomId(input: ForceJoinCustomIdInput) {
  return [
    forceJoinCustomIdPrefix,
    input.guildId,
    input.userId,
    input.textChannelId,
    input.voiceChannelId
  ].join(":");
}

export function toForceJoinCancelCustomId(input: ForceJoinCustomIdInput) {
  return [
    forceJoinCancelCustomIdPrefix,
    input.guildId,
    input.userId,
    input.textChannelId,
    input.voiceChannelId
  ].join(":");
}

export function parseForceJoinCustomId(customId: string) {
  const [prefix, guildId, userId, textChannelId, voiceChannelId] =
    customId.split(":");

  if (
    prefix !== forceJoinCustomIdPrefix ||
    !guildId ||
    !userId ||
    !textChannelId ||
    !voiceChannelId
  ) {
    return null;
  }

  return { guildId, textChannelId, userId, voiceChannelId };
}

export function parseForceJoinCancelCustomId(customId: string) {
  const [prefix, guildId, userId, textChannelId, voiceChannelId] =
    customId.split(":");

  if (
    prefix !== forceJoinCancelCustomIdPrefix ||
    !guildId ||
    !userId ||
    !textChannelId ||
    !voiceChannelId
  ) {
    return null;
  }

  return { guildId, textChannelId, userId, voiceChannelId };
}

export async function handleJoinCommand(
  interaction: ChatInputCommandInteraction,
  context: TtsCommandContext
) {
  const target = await getTtsJoinTarget(interaction);

  if (!target) {
    await replyPrivate(interaction, "TTS join failed", [
      "Join a voice channel first."
    ]);
    return;
  }

  const result = await context.ttsSessionManager.join(target);

  if (result.status === "blocked") {
    await replyPrivate(interaction, "TTS already connected", [
      "The bot is already connected to another voice channel.",
      "Ask a Dashboard admin or owner to use `/force-join`."
    ]);
    return;
  }

  await replyPrivate(interaction, "TTS connected", [
    `Voice channel: <#${target.voiceChannelId}>`,
    `Reading text channel: <#${target.textChannelId}>`
  ]);

  if (result.status === "joined") {
    await writeTtsLog(
      context,
      createTtsSessionStartedEvent({
        actorId: interaction.user.id,
        guildId: target.guildId,
        reason: "join-command",
        textChannelId: target.textChannelId,
        voiceChannelId: target.voiceChannelId
      })
    );
  }
}

export async function handleForceJoinCommand(
  interaction: ChatInputCommandInteraction,
  context: TtsCommandContext
) {
  const target = await getTtsJoinTarget(interaction);

  if (!target) {
    await replyPrivate(interaction, "TTS force join failed", [
      "Join a voice channel first."
    ]);
    return;
  }

  if (!(await canUseForceJoin(interaction, context))) {
    await replyPrivate(interaction, "TTS force join failed", [
      "Dashboard admin or owner access is required."
    ]);
    return;
  }

  const currentVoiceChannelId = context.ttsSessionManager.getVoiceChannelId(
    target.guildId
  );

  if (currentVoiceChannelId && currentVoiceChannelId !== target.voiceChannelId) {
    await interaction.reply(
      createForceJoinConfirmation({
        ...target,
        userId: interaction.user.id
      })
    );
    return;
  }

  const result = await context.ttsSessionManager.forceJoin(target);
  await replyPrivate(interaction, "TTS connected", [
    result.status === "moved" ? "Moved TTS to your voice channel." : "TTS is ready.",
    `Voice channel: <#${target.voiceChannelId}>`,
    `Reading text channel: <#${target.textChannelId}>`
  ]);

  if (result.status !== "already-connected") {
    await writeTtsLog(
      context,
      createTtsSessionStartedEvent({
        actorId: interaction.user.id,
        guildId: target.guildId,
        reason: "force-join-command",
        textChannelId: target.textChannelId,
        voiceChannelId: target.voiceChannelId
      })
    );
  }
}

export async function handleLeaveCommand(
  interaction: ChatInputCommandInteraction,
  context: TtsCommandContext
) {
  const guildId = interaction.guildId;

  if (!guildId) {
    await replyPrivate(interaction, "TTS leave failed", [
      "This command can only be used in a guild."
    ]);
    return;
  }

  const voiceChannelId = context.ttsSessionManager.getVoiceChannelId(guildId);
  const wasConnected = context.ttsSessionManager.isConnected(guildId);
  context.ttsSessionManager.leave(guildId);
  await replyPrivate(interaction, "TTS disconnected", [
    "Temporary TTS text channels were cleared."
  ]);

  if (wasConnected) {
    await writeTtsLog(
      context,
      createTtsSessionStoppedEvent({
        actorId: interaction.user.id,
        guildId,
        reason: "leave-command",
        voiceChannelId
      })
    );
  }
}

export async function handleForceJoinButtonInteraction(
  interaction: ButtonInteraction,
  context: TtsCommandContext
) {
  const cancel = parseForceJoinCancelCustomId(interaction.customId);

  if (cancel) {
    await interaction.update(
      createUpdateMessage("TTS move cancelled", [
        "No voice channel move was performed."
      ])
    );
    return true;
  }

  const target = parseForceJoinCustomId(interaction.customId);

  if (!target) {
    return false;
  }

  if (interaction.user.id !== target.userId) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: "TTS force join failed",
        lines: ["Only the user who ran `/force-join` can confirm this move."],
        privateResponse: true
      })
    });
    return true;
  }

  if (!interaction.guild) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: "TTS force join failed",
        lines: ["This confirmation can only be used in a guild."],
        privateResponse: true
      })
    });
    return true;
  }

  const result = await context.ttsSessionManager.forceJoin({
    adapterCreator: interaction.guild.voiceAdapterCreator,
    guildId: target.guildId,
    textChannelId: target.textChannelId,
    voiceChannelId: target.voiceChannelId
  });
  await interaction.update(
    createUpdateMessage("TTS moved", [
      `Voice channel: <#${target.voiceChannelId}>`,
      `Reading text channel: <#${target.textChannelId}>`
    ])
  );

  if (result.status !== "already-connected") {
    await writeTtsLog(
      context,
      createTtsSessionStartedEvent({
        actorId: interaction.user.id,
        guildId: target.guildId,
        reason: "force-join-confirmed",
        textChannelId: target.textChannelId,
        voiceChannelId: target.voiceChannelId
      })
    );
  }
  return true;
}

async function getTtsJoinTarget(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild || !interaction.guildId || !interaction.channelId) {
    return null;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    return null;
  }

  return {
    adapterCreator: interaction.guild.voiceAdapterCreator,
    guildId: interaction.guildId,
    textChannelId: interaction.channelId,
    voiceChannelId: voiceChannel.id
  };
}

async function canUseForceJoin(
  interaction: ChatInputCommandInteraction,
  context: TtsCommandContext
) {
  if (!interaction.guild || !interaction.guildId) {
    return false;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const roleIds = getMemberRoleIds(member);
  const grants = await listDashboardAccessGrants(context.db, {
    guildId: interaction.guildId,
    roleIds,
    userId: interaction.user.id
  });
  const role = resolveDashboardCommandAccessRole({
    grants,
    isGuildOwner: interaction.guild.ownerId === interaction.user.id
  });

  return hasDashboardAdminCommandAccess(role);
}

function getMemberRoleIds(member: GuildMember) {
  return member.roles.cache.map((role) => role.id);
}

function createForceJoinConfirmation(
  input: ForceJoinCustomIdInput
): InteractionReplyOptions {
  const confirm = new ButtonBuilder()
    .setCustomId(toForceJoinCustomId(input))
    .setLabel("Move")
    .setStyle(ButtonStyle.Danger);
  const cancel = new ButtonBuilder()
    .setCustomId(toForceJoinCancelCustomId(input))
    .setLabel("Cancel")
    .setStyle(ButtonStyle.Secondary);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    confirm,
    cancel
  );

  const message = createComponentsV2TextMessage({
    title: "Confirm TTS move",
    lines: [
      "The bot is already connected to another voice channel.",
      `Move TTS to <#${input.voiceChannelId}>?`
    ],
    privateResponse: true
  });

  return {
    ...message,
    components: [...(message.components ?? []), row]
  };
}

function createUpdateMessage(
  title: string,
  lines: string[]
): InteractionUpdateOptions {
  const message = createComponentsV2TextMessage({
    title,
    lines
  });

  return {
    components: message.components ?? [],
    flags: "IsComponentsV2"
  };
}

async function replyPrivate(
  interaction: ChatInputCommandInteraction,
  title: string,
  lines: string[]
) {
  await interaction.reply({
    ...createComponentsV2TextMessage({
      title,
      lines,
      privateResponse: true
    })
  });
}

async function writeTtsLog(
  context: TtsCommandContext,
  event: Parameters<DiscordLogWriter["write"]>[0]
) {
  if (!context.logWriter) {
    return;
  }

  await context.logWriter.write(event).catch((error: unknown) => {
    console.warn("failed to write tts command log event", {
      eventName: event.eventName,
      guildId: event.guildId,
      error
    });
  });
}
