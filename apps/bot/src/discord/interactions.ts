import { Events, type Client } from "discord.js";

import {
  handleChatInputCommand,
  handleSpeakerAutocomplete,
  type CommandContext
} from "../commands/index.js";
import { createDiscordLogWriter } from "./log-writer.js";
import { createEvent } from "./gateway-logs/payloads.js";
import { handleRecruitmentButtonInteraction } from "./recruitment-interactions.js";
import { handleForceJoinButtonInteraction } from "../commands/tts.js";
import { handleTempVoiceControlInteraction } from "./temp-voice-controls.js";
import { handleRecruitmentModalSubmit } from "../commands/recruitment.js";

function writeHandlerError(
  context: CommandContext,
  type: string,
  guildId: string | null,
  details: Record<string, unknown>,
  error: unknown
) {
  void context.logWriter?.write(
    createEvent("system.handler.error", {
      guildId,
      actorId: null,
      channelId: null,
      messageId: null,
      payload: { type, error: String(error), ...details }
    })
  ).catch(() => {/* best-effort */});
}

export function installInteractionRouter(client: Client, context: CommandContext) {
  const commandContext: CommandContext = {
    ...context,
    logWriter: context.logWriter ?? createDiscordLogWriter(client, context)
  };

  client.on(Events.InteractionCreate, (interaction) => {
    if (interaction.isButton()) {
      void handleForceJoinButtonInteraction(interaction, commandContext)
        .then((handled) =>
          handled
            ? undefined
            : handleTempVoiceControlInteraction(interaction, commandContext)
        )
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
          writeHandlerError(commandContext, "button", interaction.guildId, { customId: interaction.customId }, error);
        });
      return;
    }

    if (interaction.isModalSubmit()) {
      void handleRecruitmentModalSubmit(interaction, commandContext)
        .then((handled) =>
          handled
            ? undefined
            : handleTempVoiceControlInteraction(interaction, commandContext)
        )
        .catch((error: unknown) => {
          console.error("modal interaction handler failed", {
            customId: interaction.customId,
            guildId: interaction.guildId,
            error
          });
          writeHandlerError(commandContext, "modal", interaction.guildId, { customId: interaction.customId }, error);
        });
      return;
    }

    if (interaction.isUserSelectMenu()) {
      void handleTempVoiceControlInteraction(interaction, commandContext).catch(
        (error: unknown) => {
          console.error("user select interaction handler failed", {
            customId: interaction.customId,
            guildId: interaction.guildId,
            error
          });
          writeHandlerError(commandContext, "user_select", interaction.guildId, { customId: interaction.customId }, error);
        }
      );
      return;
    }

    if (interaction.isAutocomplete()) {
      void handleSpeakerAutocomplete(interaction, commandContext).catch((error: unknown) => {
        console.error("autocomplete handler failed", {
          commandName: interaction.commandName,
          guildId: interaction.guildId,
          error
        });
        writeHandlerError(commandContext, "autocomplete", interaction.guildId, { commandName: interaction.commandName }, error);
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
      writeHandlerError(commandContext, "chat_input", interaction.guildId, { commandName: interaction.commandName }, error);
    });
  });
}
