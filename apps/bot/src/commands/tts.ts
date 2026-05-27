import { getGuildConfigByGuildId, listDashboardAccessGrants, type DbClient } from "@discord-bot/db";
import { getLocale, isGuildLanguage, type GuildLanguage } from "@discord-bot/shared";
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

type Loc = ReturnType<typeof getLocale>;

export const joinCommand = new SlashCommandBuilder()
  .setName("join")
  .setDescription("Join your voice channel and read this text channel.")
  .setDescriptionLocalization("ja", "ボイスチャンネルに参加してこのテキストチャンネルを読み上げます。");

export const forceJoinCommand = new SlashCommandBuilder()
  .setName("force-join")
  .setDescription("Move TTS to your voice channel after confirmation.")
  .setDescriptionLocalization("ja", "確認後、TTSをあなたのボイスチャンネルに移動します。")
  .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages);

export const leaveCommand = new SlashCommandBuilder()
  .setName("leave")
  .setDescription("Stop TTS and leave the current voice channel.")
  .setDescriptionLocalization("ja", "TTSを停止し、現在のボイスチャンネルから退出します。");

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
  const loc = interaction.guildId
    ? await resolveGuildLocale(context.db, interaction.guildId)
    : getLocale("en");

  const target = await getTtsJoinTarget(interaction);

  if (!target) {
    await replyPrivate(interaction, loc.ttsJoinFailed, [loc.ttsJoinVoiceFirst]);
    return;
  }

  const result = await context.ttsSessionManager.join(target);

  if (result.status === "blocked") {
    await replyPrivate(interaction, loc.ttsAlreadyConnected, [
      loc.ttsAlreadyConnectedMessage,
      loc.ttsForceJoinSuggestion
    ]);
    return;
  }

  await replyPrivate(interaction, loc.ttsConnected, [
    loc.ttsVoiceChannel({ id: target.voiceChannelId }),
    loc.ttsReadingChannel({ id: target.textChannelId })
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
  const loc = interaction.guildId
    ? await resolveGuildLocale(context.db, interaction.guildId)
    : getLocale("en");

  const target = await getTtsJoinTarget(interaction);

  if (!target) {
    await replyPrivate(interaction, loc.ttsForceJoinFailed, [loc.ttsJoinVoiceFirst]);
    return;
  }

  if (!(await canUseForceJoin(interaction, context))) {
    await replyPrivate(interaction, loc.ttsForceJoinFailed, [loc.ttsForceJoinAdminRequired]);
    return;
  }

  const currentVoiceChannelId = context.ttsSessionManager.getVoiceChannelId(
    target.guildId
  );

  if (currentVoiceChannelId && currentVoiceChannelId !== target.voiceChannelId) {
    await interaction.reply(
      createForceJoinConfirmation({ ...target, userId: interaction.user.id }, loc)
    );
    return;
  }

  const result = await context.ttsSessionManager.forceJoin(target);
  await replyPrivate(interaction, loc.ttsConnected, [
    result.status === "moved" ? loc.ttsMoved : loc.ttsReady,
    loc.ttsVoiceChannel({ id: target.voiceChannelId }),
    loc.ttsReadingChannel({ id: target.textChannelId })
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
    const loc = getLocale("en");
    await replyPrivate(interaction, loc.ttsLeaveFailed, [loc.ttsLeaveNotInGuild]);
    return;
  }

  const loc = await resolveGuildLocale(context.db, guildId);
  const voiceChannelId = context.ttsSessionManager.getVoiceChannelId(guildId);
  const wasConnected = context.ttsSessionManager.isConnected(guildId);
  context.ttsSessionManager.leave(guildId);
  await replyPrivate(interaction, loc.ttsDisconnected, [loc.ttsChannelsCleared]);

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
  const loc = interaction.guildId
    ? await resolveGuildLocale(context.db, interaction.guildId)
    : getLocale("en");

  const cancel = parseForceJoinCancelCustomId(interaction.customId);

  if (cancel) {
    await interaction.update(
      createUpdateMessage(loc.ttsMoveCancelledTitle, [loc.ttsMoveCancelledMessage])
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
        title: loc.ttsForceJoinFailed,
        lines: [loc.ttsForceJoinWrongUser],
        privateResponse: true
      })
    });
    return true;
  }

  if (!interaction.guild) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.ttsForceJoinFailed,
        lines: [loc.ttsForceJoinNotInGuild],
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
    createUpdateMessage(loc.ttsMovedTitle, [
      loc.ttsVoiceChannel({ id: target.voiceChannelId }),
      loc.ttsReadingChannel({ id: target.textChannelId })
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
  input: ForceJoinCustomIdInput,
  loc: Loc
): InteractionReplyOptions {
  const confirm = new ButtonBuilder()
    .setCustomId(toForceJoinCustomId(input))
    .setLabel(loc.ttsButtonMove)
    .setStyle(ButtonStyle.Danger);
  const cancel = new ButtonBuilder()
    .setCustomId(toForceJoinCancelCustomId(input))
    .setLabel(loc.ttsButtonCancel)
    .setStyle(ButtonStyle.Secondary);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    confirm,
    cancel
  );

  const message = createComponentsV2TextMessage({
    title: loc.ttsForceJoinConfirmTitle,
    lines: [
      loc.ttsForceJoinAlreadyConnected,
      loc.ttsForceJoinMoveTo({ id: input.voiceChannelId })
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

async function resolveGuildLocale(db: DbClient, guildId: string) {
  const config = await getGuildConfigByGuildId(db, guildId).catch((error: unknown) => {
    console.warn("failed to fetch guild config for tts locale", error);
    return null;
  });
  const lang: GuildLanguage =
    config?.language && isGuildLanguage(config.language)
      ? config.language
      : "en";
  return getLocale(lang);
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
