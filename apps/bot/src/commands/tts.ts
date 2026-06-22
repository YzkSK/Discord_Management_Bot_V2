import {
  getUserTtsSpeaker,
  listDashboardAccessGrants,
  setGuildDefaultTtsSpeaker,
  setUserTtsSpeaker,
  type DbClient
} from "@discord-bot/db";
import { getLocale } from "@discord-bot/shared";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type GuildMember,
  type InteractionReplyOptions,
  type InteractionUpdateOptions
} from "discord.js";

import { createComponentsV2TextMessage, EVENT_COLORS } from "../discord/components-v2.js";
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
import type { VoicevoxSpeaker } from "../discord/voicevox.js";
import { resolveGuildLocale } from "../discord/resolve-locale.js";

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

export const speakerCommand = new SlashCommandBuilder()
  .setName("speaker")
  .setDescription("Configure TTS speaker settings.")
  .setDescriptionLocalization("ja", "TTSの話者設定を変更します。")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("set")
      .setDescription("Set your TTS speaker.")
      .setDescriptionLocalization("ja", "自分のTTS話者を変更します。")
      .addIntegerOption((option) =>
        option
          .setName("speaker_id")
          .setDescription("VOICEVOX speaker id.")
          .setDescriptionLocalization("ja", "VOICEVOXの話者ID。")
          .setAutocomplete(true)
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("server-default")
      .setDescription("Set the server default TTS speaker.")
      .setDescriptionLocalization("ja", "サーバー既定のTTS話者を変更します。")
      .addIntegerOption((option) =>
        option
          .setName("speaker_id")
          .setDescription("VOICEVOX speaker id.")
          .setDescriptionLocalization("ja", "VOICEVOXの話者ID。")
          .setAutocomplete(true)
          .setRequired(true)
      )
  );

export interface TtsCommandContext {
  db: DbClient;
  getSpeakers?: () => Promise<VoicevoxSpeaker[]>;
  logWriter?: DiscordLogWriter;
  setGuildDefaultSpeaker?: typeof setGuildDefaultTtsSpeaker;
  setUserSpeaker?: typeof setUserTtsSpeaker;
  ttsSessionManager: TtsSessionManager;
}

export function buildSpeakerAutocompleteChoices(
  speakers: VoicevoxSpeaker[],
  query: string
) {
  const lowerQuery = query.toLowerCase();
  const choices: { name: string; value: number }[] = [];

  for (const speaker of speakers) {
    for (const style of speaker.styles) {
      const label = `${speaker.name}（${style.name}） [ID: ${style.id}]`;
      if (!lowerQuery || label.toLowerCase().includes(lowerQuery)) {
        choices.push({ name: label, value: style.id });
      }
      if (choices.length >= 25) return choices;
    }
  }

  return choices;
}

export async function handleSpeakerAutocomplete(
  interaction: AutocompleteInteraction,
  context: TtsCommandContext
) {
  if (interaction.commandName !== speakerCommand.name) {
    return false;
  }

  const focused = interaction.options.getFocused(true);
  if (focused.name !== "speaker_id") {
    return false;
  }

  const speakers = context.getSpeakers ? await context.getSpeakers() : [];
  const choices = buildSpeakerAutocompleteChoices(speakers, String(focused.value));
  await interaction.respond(choices);
  return true;
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

function parseForceJoinCustomIdBase(customId: string, prefix: string) {
  const [p, guildId, userId, textChannelId, voiceChannelId] = customId.split(":");
  if (p !== prefix || !guildId || !userId || !textChannelId || !voiceChannelId) {
    return null;
  }
  return { guildId, textChannelId, userId, voiceChannelId };
}

export function parseForceJoinCustomId(customId: string) {
  return parseForceJoinCustomIdBase(customId, forceJoinCustomIdPrefix);
}

export function parseForceJoinCancelCustomId(customId: string) {
  return parseForceJoinCustomIdBase(customId, forceJoinCancelCustomIdPrefix);
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
    await replyPrivate(interaction, loc.ttsJoinFailed, [loc.ttsJoinVoiceFirst], EVENT_COLORS.red);
    return;
  }

  const result = await context.ttsSessionManager.join(target);

  if (result.status === "blocked") {
    await replyPrivate(interaction, loc.ttsAlreadyConnected, [
      loc.ttsAlreadyConnectedMessage,
      loc.ttsForceJoinSuggestion
    ], EVENT_COLORS.yellow);
    return;
  }

  if (result.status === "already-connected") {
    await replyPrivate(interaction, loc.ttsAlreadyConnectedHere, [], EVENT_COLORS.yellow);
    return;
  }

  await replyPrivate(interaction, loc.ttsConnected, [
    `${loc.ttsVoiceChannel({ id: target.voiceChannelId })}  ·  ${loc.ttsReadingChannel({ id: target.textChannelId })}`,
    loc.ttsTipMutePrefix
  ], EVENT_COLORS.green);

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
    await replyPrivate(interaction, loc.ttsForceJoinFailed, [loc.ttsJoinVoiceFirst], EVENT_COLORS.red);
    return;
  }

  if (!(await canUseDashboardAdminCommand(interaction, context))) {
    await replyPrivate(interaction, loc.ttsForceJoinFailed, [loc.ttsForceJoinAdminRequired], EVENT_COLORS.red);
    return;
  }

  const currentVoiceChannelId = context.ttsSessionManager.getVoiceChannelId(
    target.guildId
  );

  if (currentVoiceChannelId && currentVoiceChannelId !== target.voiceChannelId) {
    await interaction.reply(
      createForceJoinConfirmation({ ...target, userId: interaction.user.id, currentVoiceChannelId }, loc)
    );
    return;
  }

  const result = await context.ttsSessionManager.forceJoin(target);

  if (result.status === "already-connected") {
    await replyPrivate(interaction, loc.ttsAlreadyConnectedHere, [], EVENT_COLORS.yellow);
    return;
  }

  await replyPrivate(interaction, loc.ttsConnected, [
    `${loc.ttsVoiceChannel({ id: target.voiceChannelId })}  ·  ${loc.ttsReadingChannel({ id: target.textChannelId })}`
  ], EVENT_COLORS.green);

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

export async function handleLeaveCommand(
  interaction: ChatInputCommandInteraction,
  context: TtsCommandContext
) {
  const guildId = interaction.guildId;

  if (!guildId) {
    const loc = getLocale("en");
    await replyPrivate(interaction, loc.ttsLeaveFailed, [loc.ttsLeaveNotInGuild], EVENT_COLORS.red);
    return;
  }

  const loc = await resolveGuildLocale(context.db, guildId);
  const voiceChannelId = context.ttsSessionManager.getVoiceChannelId(guildId);
  if (!context.ttsSessionManager.isConnected(guildId)) {
    await replyPrivate(interaction, loc.ttsNotConnected, [], EVENT_COLORS.yellow);
    return;
  }

  context.ttsSessionManager.leave(guildId);
  await replyPrivate(interaction, loc.ttsDisconnected, [loc.ttsChannelsCleared], EVENT_COLORS.gray);

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

export async function handleSpeakerCommand(
  interaction: ChatInputCommandInteraction,
  context: TtsCommandContext
) {
  const guildId = interaction.guildId;
  const loc = guildId
    ? await resolveGuildLocale(context.db, guildId)
    : getLocale("en");

  if (!guildId) {
    await replyPrivate(interaction, loc.ttsSpeakerFailed, [
      loc.ttsLeaveNotInGuild
    ], EVENT_COLORS.red);
    return;
  }

  const speakerId = parseSpeakerIdOption(
    interaction.options.getInteger("speaker_id")
  );
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "set") {
    const current = await getUserTtsSpeaker(context.db, { guildId, userId: interaction.user.id });
    if (current?.speakerId === speakerId) {
      await replyPrivate(interaction, loc.ttsSpeakerAlreadySet, [], EVENT_COLORS.yellow);
      return;
    }
    const setUserSpeaker = context.setUserSpeaker ?? setUserTtsSpeaker;
    await setUserSpeaker(context.db, {
      guildId,
      speakerId,
      userId: interaction.user.id
    });
    await replyPrivate(interaction, loc.ttsSpeakerUpdated, [
      loc.ttsSpeakerUser({ id: speakerId })
    ], EVENT_COLORS.green);
    return;
  }

  if (subcommand === "server-default") {
    if (!(await canUseDashboardAdminCommand(interaction, context))) {
      await replyPrivate(interaction, loc.ttsSpeakerFailed, [
        loc.ttsForceJoinAdminRequired
      ], EVENT_COLORS.red);
      return;
    }

    const setGuildDefaultSpeaker =
      context.setGuildDefaultSpeaker ?? setGuildDefaultTtsSpeaker;
    await setGuildDefaultSpeaker(context.db, {
      guildId,
      speakerId
    });
    await replyPrivate(interaction, loc.ttsSpeakerUpdated, [
      loc.ttsSpeakerServerDefault({ id: speakerId })
    ], EVENT_COLORS.green);
    return;
  }

  await replyPrivate(interaction, loc.ttsSpeakerFailed, [
    loc.unknownSetupTarget({ target: subcommand })
  ], EVENT_COLORS.red);
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
      createUpdateMessage(loc.ttsMoveCancelledTitle, [loc.ttsMoveCancelledMessage], EVENT_COLORS.gray)
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
        accentColor: EVENT_COLORS.red,
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
        accentColor: EVENT_COLORS.red,
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
      `${loc.ttsVoiceChannel({ id: target.voiceChannelId })}  ·  ${loc.ttsReadingChannel({ id: target.textChannelId })}`
    ], EVENT_COLORS.green)
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

async function canUseDashboardAdminCommand(
  interaction: ChatInputCommandInteraction,
  context: TtsCommandContext
) {
  if (!interaction.guild || !interaction.guildId) {
    return false;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id).catch((err: unknown) => {
    console.warn("failed to fetch guild member for permission check", err);
    return null;
  });
  if (!member) return false;
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

export function parseSpeakerIdOption(value: number | null) {
  if (value === null) {
    throw new Error("speaker id is required.");
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("speaker id must be a non-negative integer.");
  }

  return value;
}

function getMemberRoleIds(member: GuildMember) {
  return member.roles.cache.map((role) => role.id);
}

function createForceJoinConfirmation(
  input: ForceJoinCustomIdInput & { currentVoiceChannelId: string },
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
      loc.ttsForceJoinCurrentChannel({ id: input.currentVoiceChannelId }),
      loc.ttsForceJoinAlreadyConnected,
      loc.ttsForceJoinMoveTo({ id: input.voiceChannelId })
    ],
    accentColor: EVENT_COLORS.yellow,
    privateResponse: true
  });

  return {
    ...message,
    components: [...(message.components ?? []), row]
  };
}

function createUpdateMessage(
  title: string,
  lines: string[],
  accentColor?: number
): InteractionUpdateOptions {
  const message = createComponentsV2TextMessage({
    title,
    lines,
    ...(accentColor !== undefined && { accentColor })
  });

  return {
    components: message.components ?? [],
    flags: "IsComponentsV2"
  };
}

async function replyPrivate(
  interaction: ChatInputCommandInteraction,
  title: string,
  lines: string[],
  accentColor?: number
) {
  await interaction.reply({
    ...createComponentsV2TextMessage({
      title,
      lines,
      ...(accentColor !== undefined && { accentColor }),
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
