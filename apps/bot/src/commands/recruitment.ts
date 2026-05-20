import {
  ChannelType,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type VoiceChannel
} from "discord.js";
import type { DbClient } from "@discord-bot/db";
import { createRecruitment, setRecruitmentMessageId } from "@discord-bot/db";

import { createComponentsV2TextMessage } from "../discord/components-v2.js";
import {
  createRecruitmentPostMessage,
  findMarkedRecruitmentChannel
} from "../discord/recruitment-channel.js";
import type { DiscordLogWriter } from "../discord/log-writer.js";
import { writeRecruitmentLifecycleLog } from "../discord/recruitment-logs.js";

export const recruitmentCommand = new SlashCommandBuilder()
  .setName("recruitment")
  .setDescription("Create and manage recruitment posts.")
  .setDMPermission(false)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("create")
      .setDescription("Create a recruitment post.")
      .addStringOption((option) =>
        option
          .setName("genre")
          .setDescription("Recruitment genre.")
          .setRequired(true)
          .setMaxLength(80)
      )
      .addIntegerOption((option) =>
        option
          .setName("capacity")
          .setDescription("Maximum participant count.")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(99)
      )
      .addStringOption((option) =>
        option
          .setName("content")
          .setDescription("Recruitment details.")
          .setRequired(true)
          .setMaxLength(1000)
      )
      .addChannelOption((option) =>
        option
          .setName("vc")
          .setDescription("Optional voice channel.")
          .addChannelTypes(ChannelType.GuildVoice)
          .setRequired(false)
      )
      .addBooleanOption((option) =>
        option
          .setName("auto-close")
          .setDescription("Close automatically when capacity is reached.")
          .setRequired(false)
      )
  );

export interface RecruitmentCommandContext {
  db: DbClient;
  logWriter?: DiscordLogWriter;
}

export async function handleRecruitmentCommand(
  interaction: ChatInputCommandInteraction,
  context: RecruitmentCommandContext
) {
  if (!interaction.guildId || !interaction.guild) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: "Recruitment failed",
        lines: ["This command can only be used in a guild."],
        privateResponse: true
      })
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand !== "create") {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: "Recruitment failed",
        lines: [`Unknown recruitment target: ${subcommand}`],
        privateResponse: true
      })
    });
    return;
  }

  await handleRecruitmentCreate(interaction, context);
}

async function handleRecruitmentCreate(
  interaction: ChatInputCommandInteraction,
  context: RecruitmentCommandContext
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
        title: "Recruitment setup required",
        lines: ["Run `/setup recruitment channel:<text channel>` first."],
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
      title: "Recruitment created",
      lines: [`Post: ${message.url}`],
      privateResponse: true
    })
  });
}

export function canManageRecruitmentSetup(
  interaction: ChatInputCommandInteraction
) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
}
