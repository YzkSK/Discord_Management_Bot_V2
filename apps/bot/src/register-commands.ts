import { parseAppEnv } from "@discord-bot/config";
import { REST, Routes } from "discord.js";

import { slashCommandPayloads } from "./commands/index.js";

export async function registerCommands() {
  const env = parseAppEnv();
  const rest = new REST({ version: "10" }).setToken(env.DISCORD_BOT_TOKEN);

  await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), {
    body: slashCommandPayloads()
  });

  console.log("slash commands registered", {
    commandCount: slashCommandPayloads().length
  });
}

registerCommands().catch((error: unknown) => {
  console.error("slash command registration failed", error);
  process.exitCode = 1;
});
