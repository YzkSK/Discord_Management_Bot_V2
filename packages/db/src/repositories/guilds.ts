import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";

import type { DbClient } from "../client.js";
import { guildConfigs, guilds } from "../schema/index.js";

export const guildLogModes = ["full", "metadata_only", "disabled"] as const;

export type GuildLogMode = (typeof guildLogModes)[number];

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

export async function getGuildConfigByGuildId(db: DbClient, guildId: string) {
  const [result] = await db
    .select({
      guildId: guilds.guildId,
      guildName: guilds.name,
      isActive: guilds.isActive,
      logMode: guildConfigs.logMode,
      updatedAt: guildConfigs.updatedAt
    })
    .from(guilds)
    .innerJoin(guildConfigs, eq(guildConfigs.guildRefId, guilds.id))
    .where(eq(guilds.guildId, guildId))
    .limit(1);

  return result ?? null;
}

export async function updateGuildConfigByGuildId(
  db: DbClient,
  input: { guildId: string; logMode: GuildLogMode }
) {
  const [guild] = await db
    .select({ id: guilds.id })
    .from(guilds)
    .where(eq(guilds.guildId, input.guildId))
    .limit(1);

  if (!guild) {
    return null;
  }

  const [config] = await db
    .insert(guildConfigs)
    .values({
      guildRefId: guild.id,
      logMode: input.logMode
    })
    .onConflictDoUpdate({
      target: guildConfigs.guildRefId,
      set: {
        logMode: input.logMode,
        updatedAt: sql`now()`
      }
    })
    .returning();

  return config ?? null;
}

export function isGuildLogMode(value: string): value is GuildLogMode {
  return guildLogModes.includes(value as GuildLogMode);
}
