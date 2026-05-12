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
  updateGuildTempVoiceConfigByGuildId
} from "@discord-bot/db";

import { createComponentsV2TextMessage } from "../discord/components-v2.js";
import { logChannelTopicMarker, markLogChannel } from "../discord/log-channel.js";

export const setupCommand = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Configure bot features for this guild.")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("temp-vc")
      .setDescription("Configure Temp VC creation settings.")
      .addChannelOption((option) =>
        option
          .setName("creation-channel")
          .setDescription("Voice channel users join to create a Temp VC.")
          .addChannelTypes(ChannelType.GuildVoice)
          .setRequired(true)
      )
      .addChannelOption((option) =>
        option
          .setName("category")
          .setDescription("Category for generated Temp VCs and control channels.")
          .addChannelTypes(ChannelType.GuildCategory)
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("logs")
      .setDescription("Configure the guild log delivery channel.")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("Text channel where detected log events are posted.")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  );

export interface SetupCommandContext {
  db: DbClient;
}

export async function handleSetupCommand(
  interaction: ChatInputCommandInteraction,
  context: SetupCommandContext
) {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: "Setup failed",
        lines: ["This command can only be used in a guild."],
        privateResponse: true
      })
    });
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: "Setup failed",
        lines: ["You need Manage Server permission to run setup."],
        privateResponse: true
      })
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case "logs":
      await handleLogsSetup(interaction, context, guildId);
      return;
    case "temp-vc":
      await handleTempVoiceSetup(interaction, context, guildId);
      return;
    default:
      await interaction.reply({
        ...createComponentsV2TextMessage({
          title: "Setup failed",
          lines: [`Unknown setup target: ${subcommand}`],
          privateResponse: true
        })
      });
  }
}

async function handleTempVoiceSetup(
  interaction: ChatInputCommandInteraction,
  context: SetupCommandContext,
  guildId: string
) {
  const creationChannel = interaction.options.getChannel(
    "creation-channel",
    true
  );
  const category = interaction.options.getChannel("category");

  if (creationChannel.type !== ChannelType.GuildVoice) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: "Temp VC setup failed",
        lines: ["Creation channel must be a voice channel."],
        privateResponse: true
      })
    });
    return;
  }

  if (category && category.type !== ChannelType.GuildCategory) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: "Temp VC setup failed",
        lines: ["Category must be a channel category."],
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
      title: "Temp VC setup complete",
      lines: [
        `Creation channel: <#${creationChannel.id}>`,
        `Category: ${category ? `<#${category.id}>` : "same category as the creation channel"}`
      ],
      privateResponse: true
    })
  });
}

async function handleLogsSetup(
  interaction: ChatInputCommandInteraction,
  context: SetupCommandContext,
  guildId: string
) {
  const channel = interaction.options.getChannel("channel", true);

  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: "Logs setup failed",
        lines: ["Log channel must be a text channel."],
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
      title: "Logs setup complete",
      lines: [
        `Log channel: <#${channel.id}>`,
        `Marker: ${logChannelTopicMarker}`
      ],
      privateResponse: true
    })
  });
}
