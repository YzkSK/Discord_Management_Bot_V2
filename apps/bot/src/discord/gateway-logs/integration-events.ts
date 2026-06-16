import { Events, type Client } from "discord.js";
import { createGuildEvent, type WriteEventFn } from "./payloads.js";

export function installIntegrationGatewayLogHandlers(client: Client, write: WriteEventFn) {
  client.on(Events.GuildIntegrationsUpdate, (guild) => {
    write(createGuildEvent("integration.update", guild, {}));
  });
}
