import {
  ActionRowBuilder,
  ChannelType,
  type ChatInputCommandInteraction,
  type Guild,
  ModalBuilder,
  type ModalSubmitInteraction,
  SlashCommandBuilder,
  type TextBasedChannel,
  type TextChannel,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import type { DbClient } from "@discord-bot/db";
import {
  createRecruitment,
  getGuildConfigByGuildId,
  setRecruitmentMessageId
} from "@discord-bot/db";
import {
  getLocale,
  RECRUITMENT_DEADLINE_DEFAULT_DAYS,
  RECRUITMENT_DEADLINE_MAX_DAYS
} from "@discord-bot/shared";

import { createComponentsV2TextMessage, EVENT_COLORS } from "../discord/components-v2.js";
import {
  createRecruitmentPostMessage
} from "../discord/recruitment-channel.js";
import type { DiscordLogWriter } from "../discord/log-writer.js";
import { writeRecruitmentLifecycleLog } from "../discord/recruitment-logs.js";
import { resolveGuildLocale } from "../discord/resolve-locale.js";

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
  );

export interface RecruitmentCommandContext {
  db: DbClient;
  logWriter?: DiscordLogWriter;
  loadRecruitmentChannelId?: (guildId: string) => Promise<string | null>;
}


export async function resolveRecruitmentChannel(input: {
  guildId: string;
  guild: Guild;
  interactionChannel: TextBasedChannel | null;
  loadChannelId: (guildId: string) => Promise<string | null>;
}): Promise<TextChannel | null> {
  const configuredId = await input.loadChannelId(input.guildId);

  if (configuredId) {
    const fetched = await input.guild.channels.fetch(configuredId).catch(() => null);
    if (fetched?.type === ChannelType.GuildText) {
      return fetched as TextChannel;
    }
  }

  if (input.interactionChannel?.type === ChannelType.GuildText) {
    return input.interactionChannel as TextChannel;
  }

  return null;
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
  if (!interaction.guildId || !interaction.guild) return;

  const loadChannelId = context.loadRecruitmentChannelId ??
    ((guildId: string) =>
      getGuildConfigByGuildId(context.db, guildId)
        .then((c) => c?.recruitmentChannelId ?? null)
        .catch(() => null));

  const recruitmentChannel = await resolveRecruitmentChannel({
    guildId: interaction.guildId,
    guild: interaction.guild,
    interactionChannel: interaction.channel,
    loadChannelId
  });

  if (!recruitmentChannel) {
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

  const TITLE_MAX_LENGTH = 80;
  const CAPACITY_MAX_LENGTH = 2;
  const CONTENT_MAX_LENGTH = 1000;
  const DEADLINE_MAX_LENGTH = 2;

  const modal = new ModalBuilder()
    .setCustomId("recruitment-create-modal")
    .setTitle(loc.recruitmentModalTitle);

  const titleInput = new TextInputBuilder()
    .setCustomId("title")
    .setLabel(loc.recruitmentModalFieldTitle)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(TITLE_MAX_LENGTH)
    .setRequired(true);

  const capacityInput = new TextInputBuilder()
    .setCustomId("capacity")
    .setLabel(loc.recruitmentModalFieldCapacity)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(CAPACITY_MAX_LENGTH)
    .setRequired(true);

  const contentInput = new TextInputBuilder()
    .setCustomId("content")
    .setLabel(loc.recruitmentModalFieldContent)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(CONTENT_MAX_LENGTH)
    .setRequired(true);

  const deadlineInput = new TextInputBuilder()
    .setCustomId("deadline_days")
    .setLabel(loc.recruitmentModalFieldDeadline)
    .setPlaceholder(loc.recruitmentModalFieldDeadlinePlaceholder)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(DEADLINE_MAX_LENGTH)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(capacityInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(contentInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(deadlineInput)
  );

  await interaction.showModal(modal);
}

export async function handleRecruitmentModalSubmit(
  interaction: ModalSubmitInteraction,
  context: RecruitmentCommandContext
): Promise<boolean> {
  if (interaction.customId !== "recruitment-create-modal") return false;

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
    return true;
  }

  const loc = await resolveGuildLocale(context.db, interaction.guildId);

  const capacityRaw = interaction.fields.getTextInputValue("capacity");
  const capacity = parseInt(capacityRaw, 10);
  if (isNaN(capacity) || capacity < 1 || capacity > 99) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.recruitmentFailed,
        lines: [loc.recruitmentCapacityInvalid],
        accentColor: EVENT_COLORS.red,
        privateResponse: true
      })
    });
    return true;
  }

  const deadlineRaw = interaction.fields.getTextInputValue("deadline_days").trim();
  const deadlineDays = deadlineRaw === ""
    ? RECRUITMENT_DEADLINE_DEFAULT_DAYS
    : parseInt(deadlineRaw, 10);
  if (isNaN(deadlineDays) || deadlineDays < 1 || deadlineDays > RECRUITMENT_DEADLINE_MAX_DAYS) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.recruitmentFailed,
        lines: [loc.recruitmentDeadlineInvalid],
        accentColor: EVENT_COLORS.red,
        privateResponse: true
      })
    });
    return true;
  }
  const deadlineAt = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000);

  const loadChannelId = context.loadRecruitmentChannelId ??
    ((guildId: string) =>
      getGuildConfigByGuildId(context.db, guildId)
        .then((c) => c?.recruitmentChannelId ?? null)
        .catch(() => null));

  const recruitmentChannel = await resolveRecruitmentChannel({
    guildId: interaction.guildId,
    guild: interaction.guild,
    interactionChannel: interaction.channel,
    loadChannelId
  });

  if (!recruitmentChannel) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.recruitmentFailed,
        lines: [loc.notInGuild],
        accentColor: EVENT_COLORS.red,
        privateResponse: true
      })
    });
    return true;
  }

  const voiceChannelId = await interaction.guild.members
    .fetch(interaction.user.id)
    .then((m) => m.voice.channelId ?? null)
    .catch(() => null);

  const title = interaction.fields.getTextInputValue("title");
  const content = interaction.fields.getTextInputValue("content");


  const recruitment = await createRecruitment(context.db, {
    guildId: interaction.guildId,
    channelId: recruitmentChannel.id,
    creatorId: interaction.user.id,
    genre: title,
    capacity,
    content,
    voiceChannelId,
    deadlineAt
  });

  const message = await recruitmentChannel.send({
    ...createRecruitmentPostMessage(recruitment, loc, 0, [], []),
    allowedMentions: { parse: [] }
  });

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
      lines: [
        loc.recruitmentPostLink({ url: message.url })
      ],
      accentColor: EVENT_COLORS.teal,
      privateResponse: true
    })
  });
  return true;
}

