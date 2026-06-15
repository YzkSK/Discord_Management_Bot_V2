import {
  ChannelType,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  type TextChannel,
  SlashCommandBuilder
} from "discord.js";
import type { DbClient } from "@discord-bot/db";
import {
  ensureGuildSetup,
  getGuildConfigByGuildId,
  updateGuildTempVoiceConfigByGuildId
} from "@discord-bot/db";
import { getLocale, isGuildLanguage, type GuildLanguage } from "@discord-bot/shared";

import { createComponentsV2TextMessage, EVENT_COLORS } from "../discord/components-v2.js";
import { findMarkedLogChannel, markLogChannel } from "../discord/log-channel.js";
import {
  findMarkedVoiceStatusChannel,
  markVoiceStatusChannel
} from "../discord/voice-status-channel.js";

type Loc = ReturnType<typeof getLocale>;

export const setupCommand = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Configure bot features for this guild.")
  .setDescriptionLocalization("ja", "このサーバーのBot機能を設定します。")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("temp-vc")
      .setDescription("Configure Temp VC creation settings.")
      .setDescriptionLocalization("ja", "一時VCの作成設定を構成します。")
      .addChannelOption((option) =>
        option
          .setName("creation-channel")
          .setNameLocalization("ja", "作成チャンネル")
          .setDescription("Voice channel users join to create a Temp VC.")
          .setDescriptionLocalization("ja", "一時VCを作成するために参加するボイスチャンネル。")
          .addChannelTypes(ChannelType.GuildVoice)
          .setRequired(true)
      )
      .addChannelOption((option) =>
        option
          .setName("category")
          .setNameLocalization("ja", "カテゴリ")
          .setDescription("Category for generated Temp VCs and control channels.")
          .setDescriptionLocalization("ja", "生成された一時VCとコントロールチャンネルのカテゴリ。")
          .addChannelTypes(ChannelType.GuildCategory)
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("logs")
      .setDescription("Configure the guild log delivery channel.")
      .setDescriptionLocalization("ja", "ログ配信チャンネルを設定します。")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setNameLocalization("ja", "チャンネル")
          .setDescription("Text channel where detected log events are posted.")
          .setDescriptionLocalization("ja", "ログイベントを投稿するテキストチャンネル。")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("voice-status")
      .setDescription("Configure the voice status display channel.")
      .setDescriptionLocalization("ja", "通話状態表示チャンネルを設定します。")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setNameLocalization("ja", "チャンネル")
          .setDescription("Text channel where voice session status is displayed.")
          .setDescriptionLocalization("ja", "通話状態を表示するテキストチャンネル。")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("status")
      .setDescription("Show current bot configuration for this guild.")
      .setDescriptionLocalization("ja", "このサーバーの現在のBot設定を表示します。")
  );

export interface SetupCommandContext {
  db: DbClient;
}

async function resolveGuildLocale(db: DbClient, guildId: string) {
  const config = await getGuildConfigByGuildId(db, guildId).catch((error: unknown) => {
    console.warn("failed to fetch guild config for setup locale", error);
    return null;
  });
  const lang: GuildLanguage =
    config?.language && isGuildLanguage(config.language)
      ? config.language
      : "en";
  return getLocale(lang);
}

export async function handleSetupCommand(
  interaction: ChatInputCommandInteraction,
  context: SetupCommandContext
) {
  const guildId = interaction.guildId;

  if (!guildId) {
    const loc = getLocale("en");
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.setupFailed,
        lines: [loc.notInGuild],
        accentColor: EVENT_COLORS.red,
        privateResponse: true
      })
    });
    return;
  }

  const loc = await resolveGuildLocale(context.db, guildId);

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.setupFailed,
        lines: [loc.noManagePermission],
        accentColor: EVENT_COLORS.red,
        privateResponse: true
      })
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case "logs":
      await handleLogsSetup(interaction, context, guildId, loc);
      return;
    case "temp-vc":
      await handleTempVoiceSetup(interaction, context, guildId, loc);
      return;
    case "voice-status":
      await handleVoiceStatusSetup(interaction, context, guildId, loc);
      return;
    case "status":
      await handleStatusSetup(interaction, context, guildId, loc);
      return;
    default:
      await interaction.reply({
        ...createComponentsV2TextMessage({
          title: loc.setupFailed,
          lines: [loc.unknownSetupTarget({ target: subcommand })],
          accentColor: EVENT_COLORS.red,
          privateResponse: true
        })
      });
  }
}

async function handleTempVoiceSetup(
  interaction: ChatInputCommandInteraction,
  context: SetupCommandContext,
  guildId: string,
  loc: Loc
) {
  const creationChannel = interaction.options.getChannel("creation-channel", true);
  const category = interaction.options.getChannel("category");

  if (creationChannel.type !== ChannelType.GuildVoice) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.tempVcSetupFailed,
        lines: [loc.tempVcCreationChannelMustBeVoice],
        accentColor: EVENT_COLORS.red,
        privateResponse: true
      })
    });
    return;
  }

  if (category && category.type !== ChannelType.GuildCategory) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.tempVcSetupFailed,
        lines: [loc.tempVcCategoryMustBeCategory],
        accentColor: EVENT_COLORS.red,
        privateResponse: true
      })
    });
    return;
  }

  await ensureGuildSetup(context.db, {
    guildId,
    name: interaction.guild?.name ?? null
  });

  await updateGuildTempVoiceConfigByGuildId(context.db, {
    guildId,
    tempVoiceCreateChannelId: creationChannel.id,
    tempVoiceCategoryId: category?.id ?? null
  });

  await interaction.reply({
    ...createComponentsV2TextMessage({
      title: loc.tempVcSetupComplete,
      lines: [
        loc.tempVcCreationChannel({ id: creationChannel.id }),
        category
          ? loc.tempVcCategory({ id: category.id })
          : loc.tempVcCategorySame
      ],
      accentColor: EVENT_COLORS.green,
      privateResponse: true
    })
  });
}

async function handleLogsSetup(
  interaction: ChatInputCommandInteraction,
  context: SetupCommandContext,
  guildId: string,
  loc: Loc
) {
  const channel = interaction.options.getChannel("channel", true);

  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.logsSetupFailed,
        lines: [loc.logsChannelMustBeText],
        accentColor: EVENT_COLORS.red,
        privateResponse: true
      })
    });
    return;
  }

  await ensureGuildSetup(context.db, {
    guildId,
    name: interaction.guild?.name ?? null
  });

  await markLogChannel(channel as TextChannel);

  await interaction.reply({
    ...createComponentsV2TextMessage({
      title: loc.logsSetupComplete,
      lines: [
        loc.logsChannel({ id: channel.id }),
      ],
      accentColor: EVENT_COLORS.green,
      privateResponse: true
    })
  });
}

async function handleStatusSetup(
  interaction: ChatInputCommandInteraction,
  context: SetupCommandContext,
  guildId: string,
  loc: Loc
) {
  const config = await getGuildConfigByGuildId(context.db, guildId).catch(() => null);
  const guild = interaction.guild;

  const [logChannel, voiceStatusChannel] = await Promise.all([
    guild ? findMarkedLogChannel(guild).catch(() => null) : Promise.resolve(null),
    Promise.resolve(guild ? findMarkedVoiceStatusChannel(guild) : null)
  ]);

  await interaction.reply({
    ...createComponentsV2TextMessage({
      title: loc.setupStatusTitle,
      lines: [
        loc.setupStatusTempVc({ id: config?.tempVoiceCreateChannelId ?? null }),
        loc.setupStatusLogs({ id: logChannel?.id ?? null }),
        loc.setupStatusVoiceStatus({ id: voiceStatusChannel?.id ?? null })
      ],
      accentColor: EVENT_COLORS.gray,
      privateResponse: true
    })
  });
}

async function handleVoiceStatusSetup(
  interaction: ChatInputCommandInteraction,
  context: SetupCommandContext,
  guildId: string,
  loc: Loc
) {
  const channel = interaction.options.getChannel("channel", true);

  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.voiceStatusSetupFailed,
        lines: [loc.voiceStatusChannelMustBeText],
        accentColor: EVENT_COLORS.red,
        privateResponse: true
      })
    });
    return;
  }

  await ensureGuildSetup(context.db, {
    guildId,
    name: interaction.guild?.name ?? null
  });

  await markVoiceStatusChannel(channel as TextChannel);

  await interaction.reply({
    ...createComponentsV2TextMessage({
      title: loc.voiceStatusSetupComplete,
      lines: [
        loc.voiceStatusChannel({ id: channel.id }),
      ],
      accentColor: EVENT_COLORS.green,
      privateResponse: true
    })
  });
}
