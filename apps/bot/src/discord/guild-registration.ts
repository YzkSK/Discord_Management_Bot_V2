import type { DbClient, EnsureGuildSetupInput } from "@discord-bot/db";
import { ensureGuildSetup } from "@discord-bot/db";
import { Events, type Client } from "discord.js";

type SetupFn = (db: DbClient, input: EnsureGuildSetupInput) => Promise<unknown>;

export async function handleClientReady(
  db: DbClient,
  cache: Iterable<[unknown, { id: string; name: string | null }]>,
  setup: SetupFn = ensureGuildSetup
): Promise<void> {
  for (const [, guild] of cache) {
    await setup(db, { guildId: guild.id, name: guild.name }).catch((error: unknown) => {
      console.warn("failed to register guild on startup", { guildId: guild.id, error });
    });
  }
}

export async function handleGuildCreate(
  db: DbClient,
  guild: { id: string; name: string | null },
  setup: SetupFn = ensureGuildSetup
): Promise<void> {
  await setup(db, { guildId: guild.id, name: guild.name }).catch((error: unknown) => {
    console.warn("failed to register guild on join", { guildId: guild.id, error });
  });
}

export function installGuildRegistrationHandlers(
  client: Client,
  options: { db: DbClient }
) {
  client.once(Events.ClientReady, (readyClient) => {
    void handleClientReady(options.db, readyClient.guilds.cache);
  });

  client.on(Events.GuildCreate, (guild) => {
    void handleGuildCreate(options.db, guild);
  });
}
