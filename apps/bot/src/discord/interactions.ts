import { Events, type Client } from "discord.js";

import {
  handleChatInputCommand,
  type CommandContext
} from "../commands/index.js";

export function installInteractionRouter(client: Client, context: CommandContext) {
  client.on(Events.InteractionCreate, (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    void handleChatInputCommand(interaction, context).catch((error: unknown) => {
      console.error("interaction handler failed", {
        commandName: interaction.commandName,
        guildId: interaction.guildId,
        error
      });
    });
  });
}
