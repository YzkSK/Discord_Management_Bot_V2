import type { ChatInputCommandInteraction } from "discord.js";
import type { DbClient } from "@discord-bot/db";
import type { RedisStreamWriter } from "@discord-bot/redis";

import { createComponentsV2TextMessage } from "../discord/components-v2.js";
import type { DiscordLogWriter } from "../discord/log-writer.js";
import {
  handleRecruitmentCommand,
  recruitmentCommand,
  type RecruitmentCommandContext
} from "./recruitment.js";
import {
  handleSetupCommand,
  setupCommand,
  type SetupCommandContext
} from "./setup.js";
import {
  forceJoinCommand,
  handleForceJoinCommand,
  handleJoinCommand,
  handleLeaveCommand,
  handleSpeakerAutocomplete,
  handleSpeakerCommand,
  joinCommand,
  leaveCommand,
  speakerCommand,
  type TtsCommandContext
} from "./tts.js";
export type CommandContext = RecruitmentCommandContext &
  SetupCommandContext &
  TtsCommandContext & {
    db: DbClient;
    redis: RedisStreamWriter;
    logWriter?: DiscordLogWriter;
  };

export const slashCommands = [
  setupCommand,
  recruitmentCommand,
  joinCommand,
  forceJoinCommand,
  leaveCommand,
  speakerCommand
] as const;

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
    case recruitmentCommand.name:
      await handleRecruitmentCommand(interaction, context);
      return;
    case joinCommand.name:
      await handleJoinCommand(interaction, context);
      return;
    case forceJoinCommand.name:
      await handleForceJoinCommand(interaction, context);
      return;
    case leaveCommand.name:
      await handleLeaveCommand(interaction, context);
      return;
    case speakerCommand.name:
      await handleSpeakerCommand(interaction, context);
      return;
    default:
      await interaction.reply({
        ...createComponentsV2TextMessage({
          title: "Command failed",
          lines: ["Unknown command."],
          privateResponse: true
        })
      });
  }
}

export { handleSpeakerAutocomplete };
