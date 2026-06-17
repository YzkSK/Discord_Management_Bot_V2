import type { DbClient } from "@discord-bot/db";
import type { RedisStreamWriter } from "@discord-bot/logger";
import type { NormalizedEvent } from "@discord-bot/shared";
import type { Client } from "discord.js";

import { createDiscordLogWriter } from "../log-writer.js";
import { installAutoModGatewayLogHandlers } from "./automod-events.js";
import { installChannelGatewayLogHandlers } from "./channel-events.js";
import { installEmojiStickerGatewayLogHandlers } from "./emoji-sticker-events.js";
import { installGuildGatewayLogHandlers } from "./guild-events.js";
import { installIntegrationGatewayLogHandlers } from "./integration-events.js";
import { installPollAuditGatewayLogHandlers } from "./poll-audit-events.js";
import { createInviteCache } from "./invite-cache.js";
import { installMessageGatewayLogHandlers } from "./message-events.js";
import { installRoleGatewayLogHandlers } from "./role-events.js";
import { installScheduledEventGatewayLogHandlers } from "./scheduled-event-events.js";
import { installStageGatewayLogHandlers } from "./stage-events.js";
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

  const inviteCache = createInviteCache();
  installGuildGatewayLogHandlers(client, write, inviteCache);
  installChannelGatewayLogHandlers(client, write);
  installRoleGatewayLogHandlers(client, write);
  installThreadGatewayLogHandlers(client, write);
  installInviteGatewayLogHandlers(client, write, inviteCache);
  installAutoModGatewayLogHandlers(client, write);
  installIntegrationGatewayLogHandlers(client, write);
  installPollAuditGatewayLogHandlers(client, write);
  installScheduledEventGatewayLogHandlers(client, write);
  installStageGatewayLogHandlers(client, write);
  installEmojiStickerGatewayLogHandlers(client, write);
  installMessageGatewayLogHandlers(client, write);
  installVoiceGatewayLogHandlers(client, write, options.db);
}
