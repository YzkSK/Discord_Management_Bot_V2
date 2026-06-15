import type { DbClient } from "@discord-bot/db";
import type { RedisStreamWriter } from "@discord-bot/redis";
import type { NormalizedEvent } from "@discord-bot/shared";
import type { Client } from "discord.js";

import { createDiscordLogWriter } from "../log-writer.js";
import { installChannelGatewayLogHandlers } from "./channel-events.js";
import { installEmojiStickerGatewayLogHandlers } from "./emoji-sticker-events.js";
import { installGuildGatewayLogHandlers } from "./guild-events.js";
import { installMessageGatewayLogHandlers } from "./message-events.js";
import { installRoleGatewayLogHandlers } from "./role-events.js";
import { installThreadGatewayLogHandlers, installInviteGatewayLogHandlers } from "./thread-invite-events.js";
import { installVoiceGatewayLogHandlers } from "./voice-events.js";

export { shouldSkipVoiceStateLog, resolveVoiceStateLogEventName } from "./voice-events.js";

export interface InstallGatewayLogHandlersOptions {
  db: DbClient;
  redis: RedisStreamWriter;
}

export function installGatewayLogHandlers(
  client: Client,
  options: InstallGatewayLogHandlersOptions
) {
  const writer = createDiscordLogWriter(client, options);
  const write = (event: NormalizedEvent) => {
    void writer.write(event).catch((error: unknown) => {
      console.warn("failed to write gateway log event", {
        eventName: event.eventName,
        guildId: event.guildId,
        error
      });
    });
  };

  installGuildGatewayLogHandlers(client, write);
  installChannelGatewayLogHandlers(client, write);
  installRoleGatewayLogHandlers(client, write);
  installThreadGatewayLogHandlers(client, write);
  installInviteGatewayLogHandlers(client, write);
  installEmojiStickerGatewayLogHandlers(client, write);
  installMessageGatewayLogHandlers(client, write);
  installVoiceGatewayLogHandlers(client, write, options.db);
}
