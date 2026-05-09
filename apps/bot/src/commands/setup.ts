import {
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";

export const setupCommand = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Register this guild for the management bot.")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

export async function handleSetupCommand(
  interaction: ChatInputCommandInteraction
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

  await interaction.reply({
    content: "Setup command received. Guild registration is handled next.",
    ephemeral: true
  });
}
