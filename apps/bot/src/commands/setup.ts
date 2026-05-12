import {
  ChannelType,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import type { DbClient } from "@discord-bot/db";
import {
  ensureGuildSetup,
  updateGuildTempVoiceConfigByGuildId
} from "@discord-bot/db";

import { createComponentsV2TextMessage } from "../discord/components-v2.js";

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
        ephemeral: true
      })
    });
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: "Setup failed",
        lines: ["You need Manage Server permission to run setup."],
        ephemeral: true
      })
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand !== "temp-vc") {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: "Setup failed",
        lines: [`Unknown setup target: ${subcommand}`],
        ephemeral: true
      })
    });
    return;
  }

  await handleTempVoiceSetup(interaction, context, guildId);
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
        ephemeral: true
      })
    });
    return;
  }

  if (category && category.type !== ChannelType.GuildCategory) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: "Temp VC setup failed",
        lines: ["Category must be a channel category."],
        ephemeral: true
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
      ephemeral: true
    })
  });
}
