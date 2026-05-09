import {
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import type { DbClient } from "@discord-bot/db";
import { ensureGuildSetup } from "@discord-bot/db";

export const setupCommand = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Register this guild for the management bot.")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export interface SetupCommandContext {
  db: DbClient;
}

export async function handleSetupCommand(
  interaction: ChatInputCommandInteraction,
  context: SetupCommandContext
) {
  if (!interaction.guildId) {
    await interaction.reply({
      content: "This command can only be used in a guild.",
      ephemeral: true
    });
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: "You need Manage Server permission to run setup.",
      ephemeral: true
    });
    return;
  }

  await ensureGuildSetup(context.db, {
    guildId: interaction.guildId,
    name: interaction.guild?.name ?? null
  });

  await interaction.reply({
    content: "Setup complete. This guild is registered.",
    ephemeral: true
  });
}
