import type { ChatInputCommandInteraction } from "discord.js";

import { handleSetupCommand, setupCommand } from "./setup.js";

export const slashCommands = [setupCommand] as const;

export function slashCommandPayloads() {
  return slashCommands.map((command) => command.toJSON());
}

export async function handleChatInputCommand(
  interaction: ChatInputCommandInteraction
) {
  switch (interaction.commandName) {
    case setupCommand.name:
      await handleSetupCommand(interaction);
      return;
    default:
      await interaction.reply({
        content: "Unknown command.",
        ephemeral: true
      });
  }
}
