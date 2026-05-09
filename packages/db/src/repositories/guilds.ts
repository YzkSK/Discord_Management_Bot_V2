import { sql } from "drizzle-orm";

import type { DbClient } from "../client.js";
import { guildConfigs, guilds } from "../schema/index.js";

export interface EnsureGuildSetupInput {
  guildId: string;
  name: string | null;
}

export async function ensureGuildSetup(
  db: DbClient,
  input: EnsureGuildSetupInput
) {
  const [guild] = await db
    .insert(guilds)
    .values({
      guildId: input.guildId,
      name: input.name,
      isActive: true
    })
    .onConflictDoUpdate({
      target: guilds.guildId,
      set: {
        name: input.name,
        isActive: true,
        updatedAt: sql`now()`
      }
    })
    .returning();

  if (!guild) {
    throw new Error("Failed to ensure guild row.");
  }

  const [config] = await db
    .insert(guildConfigs)
    .values({
      guildRefId: guild.id
    })
    .onConflictDoUpdate({
      target: guildConfigs.guildRefId,
      set: {
        updatedAt: sql`now()`
      }
    })
    .returning();

  if (!config) {
    throw new Error("Failed to ensure guild config row.");
  }

  return { guild, config };
}
