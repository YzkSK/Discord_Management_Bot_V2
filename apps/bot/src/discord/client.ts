import {
  Client,
  Events,
  GatewayIntentBits,
  type ClientOptions
} from "discord.js";

export const requiredGatewayIntents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildModeration,
  GatewayIntentBits.GuildEmojisAndStickers,
  GatewayIntentBits.GuildWebhooks,
  GatewayIntentBits.GuildInvites,
  GatewayIntentBits.GuildIntegrations,
  GatewayIntentBits.GuildScheduledEvents,
  GatewayIntentBits.AutoModerationConfiguration,
  GatewayIntentBits.AutoModerationExecution,
  GatewayIntentBits.GuildMessagePolls,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildMessageReactions
] as const;

export function createDiscordClient(options: Partial<ClientOptions> = {}) {
  return new Client({
    ...options,
    intents: options.intents ?? requiredGatewayIntents
  });
}

export function installDiscordLifecycleLogging(client: Client) {
  client.once(Events.ClientReady, (readyClient) => {
    console.log("discord client ready", {
      clientId: readyClient.user.id,
      tag: readyClient.user.tag
    });
  });

  client.on(Events.Error, (error) => {
    console.error("discord client error", error);
  });
}
