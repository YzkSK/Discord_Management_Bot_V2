import { Events, type Client } from "discord.js";

import {
  handleChatInputCommand,
  type CommandContext
} from "../commands/index.js";
import { createDiscordLogWriter } from "./log-writer.js";
import { handleRecruitmentButtonInteraction } from "./recruitment-interactions.js";
import { handleForceJoinButtonInteraction } from "../commands/tts.js";

export function installInteractionRouter(client: Client, context: CommandContext) {
  const commandContext: CommandContext = {
    ...context,
    logWriter: createDiscordLogWriter(client, context)
  };

  client.on(Events.InteractionCreate, (interaction) => {
    if (interaction.isButton()) {
      void handleForceJoinButtonInteraction(interaction, commandContext)
        .then((handled) =>
          handled
            ? undefined
            : handleRecruitmentButtonInteraction(interaction, commandContext)
        )
        .catch((error: unknown) => {
          console.error("button interaction handler failed", {
            customId: interaction.customId,
            guildId: interaction.guildId,
            error
          });
        });
      return;
    }

    if (!interaction.isChatInputCommand()) {
      return;
    }

    void handleChatInputCommand(interaction, commandContext).catch((error: unknown) => {
      console.error("interaction handler failed", {
        commandName: interaction.commandName,
        guildId: interaction.guildId,
        error
      });
    });
  });
}
