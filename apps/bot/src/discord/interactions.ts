import { Events, type Client } from "discord.js";

import { handleChatInputCommand } from "../commands/index.js";

export function installInteractionRouter(client: Client) {
  client.on(Events.InteractionCreate, (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    void handleChatInputCommand(interaction).catch((error: unknown) => {
      console.error("interaction handler failed", {
        commandName: interaction.commandName,
        guildId: interaction.guildId,
        error
      });
    });
  });
}
