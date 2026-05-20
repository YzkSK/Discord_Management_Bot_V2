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

export type CommandContext = RecruitmentCommandContext &
  SetupCommandContext & {
    db: DbClient;
    redis: RedisStreamWriter;
    logWriter?: DiscordLogWriter;
  };

export const slashCommands = [setupCommand, recruitmentCommand] as const;

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
