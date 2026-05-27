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
  updateGuildTtsConfigByGuildId,
  updateGuildTempVoiceConfigByGuildId
} from "@discord-bot/db";
import { getLocale, isGuildLanguage, type GuildLanguage } from "@discord-bot/shared";

import { createComponentsV2TextMessage } from "../discord/components-v2.js";
import { logChannelTopicMarker, markLogChannel } from "../discord/log-channel.js";
import {
  markRecruitmentChannel,
  recruitmentChannelTopicMarker
} from "../discord/recruitment-channel.js";

type Loc = ReturnType<typeof getLocale>;

export const setupCommand = new SlashCommandBuilder()
  .setName("setup")
  .setNameLocalization("ja", "setup")
  .setDescription("Configure bot features for this guild.")
  .setDescriptionLocalization("ja", "このサーバーのBot機能を設定します。")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("temp-vc")
      .setNameLocalization("ja", "一時vc")
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
      .setNameLocalization("ja", "ログ")
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
      .setName("recruitment")
      .setNameLocalization("ja", "募集")
      .setDescription("Configure the recruitment posting channel.")
      .setDescriptionLocalization("ja", "募集投稿チャンネルを設定します。")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setNameLocalization("ja", "チャンネル")
          .setDescription("Text channel where recruitment posts are sent.")
          .setDescriptionLocalization("ja", "募集投稿を送信するテキストチャンネル。")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("tts")
      .setNameLocalization("ja", "tts")
      .setDescription("Configure the persistent TTS text channel.")
      .setDescriptionLocalization("ja", "TTSテキストチャンネルを設定します。")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setNameLocalization("ja", "チャンネル")
          .setDescription("Text channel whose messages are read while TTS is connected.")
          .setDescriptionLocalization("ja", "TTS接続中にメッセージが読み上げられるテキストチャンネル。")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
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
    case "recruitment":
      await handleRecruitmentSetup(interaction, context, guildId, loc);
      return;
    case "temp-vc":
      await handleTempVoiceSetup(interaction, context, guildId, loc);
      return;
    case "tts":
      await handleTtsSetup(interaction, context, guildId, loc);
      return;
    default:
      await interaction.reply({
        ...createComponentsV2TextMessage({
          title: loc.setupFailed,
          lines: [loc.unknownSetupTarget({ target: subcommand })],
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
        loc.logsMarker({ marker: logChannelTopicMarker })
      ],
      privateResponse: true
    })
  });
}

async function handleRecruitmentSetup(
  interaction: ChatInputCommandInteraction,
  context: SetupCommandContext,
  guildId: string,
  loc: Loc
) {
  const channel = interaction.options.getChannel("channel", true);

  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.recruitmentSetupFailed,
        lines: [loc.recruitmentChannelMustBeText],
        privateResponse: true
      })
    });
    return;
  }

  await ensureGuildSetup(context.db, {
    guildId,
    name: interaction.guild?.name ?? null
  });

  await markRecruitmentChannel(channel as TextChannel);

  await interaction.reply({
    ...createComponentsV2TextMessage({
      title: loc.recruitmentSetupComplete,
      lines: [
        loc.recruitmentChannel({ id: channel.id }),
        loc.recruitmentMarker({ marker: recruitmentChannelTopicMarker })
      ],
      privateResponse: true
    })
  });
}

async function handleTtsSetup(
  interaction: ChatInputCommandInteraction,
  context: SetupCommandContext,
  guildId: string,
  loc: Loc
) {
  const channel = interaction.options.getChannel("channel", true);

  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.ttsSetupFailed,
        lines: [loc.ttsChannelMustBeText],
        privateResponse: true
      })
    });
    return;
  }

  await ensureGuildSetup(context.db, {
    guildId,
    name: interaction.guild?.name ?? null
  });

  await updateGuildTtsConfigByGuildId(context.db, {
    guildId,
    ttsTextChannelId: channel.id
  });

  await interaction.reply({
    ...createComponentsV2TextMessage({
      title: loc.ttsSetupComplete,
      lines: [
        loc.ttsTtsChannel({ id: channel.id }),
        loc.ttsChannelDescription
      ],
      privateResponse: true
    })
  });
}
