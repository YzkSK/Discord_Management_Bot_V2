import {
  ChannelType,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type VoiceChannel
} from "discord.js";
import type { DbClient } from "@discord-bot/db";
import {
  createRecruitment,
  getGuildConfigByGuildId,
  setRecruitmentMessageId
} from "@discord-bot/db";
import { getLocale, isGuildLanguage, type GuildLanguage } from "@discord-bot/shared";

import { createComponentsV2TextMessage, EVENT_COLORS } from "../discord/components-v2.js";
import {
  createRecruitmentPostMessage,
  findMarkedRecruitmentChannel
} from "../discord/recruitment-channel.js";
import type { DiscordLogWriter } from "../discord/log-writer.js";
import { writeRecruitmentLifecycleLog } from "../discord/recruitment-logs.js";

type Loc = ReturnType<typeof getLocale>;

export const recruitmentCommand = new SlashCommandBuilder()
  .setName("recruitment")
  .setDescription("Create and manage recruitment posts.")
  .setDescriptionLocalization("ja", "募集投稿を作成・管理します。")
  .setDMPermission(false)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("create")
      .setDescription("Create a recruitment post.")
      .setDescriptionLocalization("ja", "募集投稿を作成します。")
      .addStringOption((option) =>
        option
          .setName("genre")
          .setNameLocalization("ja", "ジャンル")
          .setDescription("Recruitment genre.")
          .setDescriptionLocalization("ja", "募集のジャンル。")
          .setRequired(true)
          .setMaxLength(80)
      )
      .addIntegerOption((option) =>
        option
          .setName("capacity")
          .setNameLocalization("ja", "定員")
          .setDescription("Maximum participant count.")
          .setDescriptionLocalization("ja", "最大参加人数。")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(99)
      )
      .addStringOption((option) =>
        option
          .setName("content")
          .setNameLocalization("ja", "内容")
          .setDescription("Recruitment details.")
          .setDescriptionLocalization("ja", "募集の詳細。")
          .setRequired(true)
          .setMaxLength(1000)
      )
      .addChannelOption((option) =>
        option
          .setName("vc")
          .setNameLocalization("ja", "vc")
          .setDescription("Optional voice channel.")
          .setDescriptionLocalization("ja", "任意のボイスチャンネル。")
          .addChannelTypes(ChannelType.GuildVoice)
          .setRequired(false)
      )
      .addBooleanOption((option) =>
        option
          .setName("auto-close")
          .setNameLocalization("ja", "自動締め切り")
          .setDescription("Close automatically when capacity is reached.")
          .setDescriptionLocalization("ja", "定員に達したら自動的に締め切ります。")
          .setRequired(false)
      )
  );

export interface RecruitmentCommandContext {
  db: DbClient;
  logWriter?: DiscordLogWriter;
}

async function resolveGuildLocale(db: DbClient, guildId: string) {
  const config = await getGuildConfigByGuildId(db, guildId).catch((error: unknown) => {
    console.warn("failed to fetch guild config for recruitment locale", error);
    return null;
  });
  const lang: GuildLanguage =
    config?.language && isGuildLanguage(config.language)
      ? config.language
      : "en";
  return getLocale(lang);
}

export async function handleRecruitmentCommand(
  interaction: ChatInputCommandInteraction,
  context: RecruitmentCommandContext
) {
  if (!interaction.guildId || !interaction.guild) {
    const loc = getLocale("en");
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.recruitmentFailed,
        lines: [loc.notInGuild],
        accentColor: EVENT_COLORS.red,
        privateResponse: true
      })
    });
    return;
  }

  const loc = await resolveGuildLocale(context.db, interaction.guildId);
  const subcommand = interaction.options.getSubcommand();

  if (subcommand !== "create") {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.recruitmentFailed,
        lines: [loc.unknownSetupTarget({ target: subcommand })],
        accentColor: EVENT_COLORS.red,
        privateResponse: true
      })
    });
    return;
  }

  await handleRecruitmentCreate(interaction, context, loc);
}

async function handleRecruitmentCreate(
  interaction: ChatInputCommandInteraction,
  context: RecruitmentCommandContext,
  loc: Loc
) {
  if (!interaction.guildId || !interaction.guild) {
    return;
  }

  const recruitmentChannel = await findMarkedRecruitmentChannel(
    interaction.guild
  );

  if (!recruitmentChannel) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.recruitmentSetupRequired,
        lines: [loc.recruitmentSetupRequiredMessage],
        accentColor: EVENT_COLORS.yellow,
        privateResponse: true
      })
    });
    return;
  }

  const voiceChannel = interaction.options.getChannel("vc") as
    | VoiceChannel
    | null;
  const recruitment = await createRecruitment(context.db, {
    guildId: interaction.guildId,
    channelId: recruitmentChannel.id,
    creatorId: interaction.user.id,
    genre: interaction.options.getString("genre", true),
    capacity: interaction.options.getInteger("capacity", true),
    content: interaction.options.getString("content", true),
    voiceChannelId: voiceChannel?.id ?? null,
    autoClose: interaction.options.getBoolean("auto-close") ?? true
  });
  const message = await recruitmentChannel.send(
    createRecruitmentPostMessage(recruitment)
  );

  const recruitmentWithMessage =
    (await setRecruitmentMessageId(context.db, {
    recruitmentId: recruitment.id,
    messageId: message.id
    })) ?? recruitment;

  if (context.logWriter) {
    writeRecruitmentLifecycleLog(context.logWriter, "recruitment.created", {
      recruitment: recruitmentWithMessage,
      actorId: interaction.user.id,
      participantCount: 0,
      reason: "created"
    });
  }

  await interaction.reply({
    ...createComponentsV2TextMessage({
      title: loc.recruitmentCreated,
      lines: [loc.recruitmentPostLink({ url: message.url })],
      accentColor: EVENT_COLORS.teal,
      privateResponse: true
    })
  });
}

export function canManageRecruitmentSetup(
  interaction: ChatInputCommandInteraction
) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
}
