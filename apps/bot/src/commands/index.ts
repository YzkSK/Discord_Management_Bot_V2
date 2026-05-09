import type { ChatInputCommandInteraction } from "discord.js";

import {
  handleSetupCommand,
  setupCommand,
  type SetupCommandContext
} from "./setup.js";

export type CommandContext = SetupCommandContext;

export const slashCommands = [setupCommand] as const;

export function slashCommandPayloads() {
  return slashCommands.map((command) => command.toJSON());
}

export async function handleChatInputCommand(
  interaction: ChatInputCommandInteraction,
  context: CommandContext
) {
  switch (interaction.commandName) {
    case setupCommand.name:
      await handleSetupCommand(interaction, context);
      return;
    default:
      await interaction.reply({
        content: "Unknown command.",
        ephemeral: true
      });
  }
}
