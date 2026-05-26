import { and, eq, inArray, sql } from "drizzle-orm";

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
      tempVoiceCreateChannelId: guildConfigs.tempVoiceCreateChannelId,
      tempVoiceCategoryId: guildConfigs.tempVoiceCategoryId,
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

export async function updateGuildTempVoiceConfigByGuildId(
  db: DbClient,
  input: {
    guildId: string;
    tempVoiceCreateChannelId?: string | null;
    tempVoiceCategoryId?: string | null;
  }
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
      tempVoiceCreateChannelId: input.tempVoiceCreateChannelId ?? null,
      tempVoiceCategoryId: input.tempVoiceCategoryId ?? null
    })
    .onConflictDoUpdate({
      target: guildConfigs.guildRefId,
      set: {
        tempVoiceCreateChannelId: input.tempVoiceCreateChannelId ?? null,
        tempVoiceCategoryId: input.tempVoiceCategoryId ?? null,
        updatedAt: sql`now()`
      }
    })
    .returning();

  return config ?? null;
}

export function isGuildLogMode(value: string): value is GuildLogMode {
  return guildLogModes.includes(value as GuildLogMode);
}

export async function getKnownGuildIds(
  db: DbClient,
  guildIds: string[]
): Promise<Set<string>> {
  if (guildIds.length === 0) return new Set();
  const rows = await db
    .select({ guildId: guilds.guildId })
    .from(guilds)
    .where(inArray(guilds.guildId, guildIds));
  return new Set(rows.map((r) => r.guildId));
}

export async function getGuildsWithManagementRoles(
  db: DbClient,
  guildIds: string[]
): Promise<string[]> {
  if (guildIds.length === 0) return [];
  const rows = await db
    .select({ guildId: guilds.guildId })
    .from(guilds)
    .innerJoin(guildConfigs, eq(guildConfigs.guildRefId, guilds.id))
    .where(
      and(
        inArray(guilds.guildId, guildIds),
        sql`array_length(${guildConfigs.dashboardManagementRoleIds}, 1) > 0`
      )
    );
  return rows.map((r) => r.guildId);
}

export async function getGuildManagementRoleIds(
  db: DbClient,
  guildId: string
): Promise<string[]> {
  const [row] = await db
    .select({ roleIds: guildConfigs.dashboardManagementRoleIds })
    .from(guilds)
    .innerJoin(guildConfigs, eq(guildConfigs.guildRefId, guilds.id))
    .where(eq(guilds.guildId, guildId))
    .limit(1);
  return row?.roleIds ?? [];
}

export async function updateGuildManagementRoleIds(
  db: DbClient,
  guildId: string,
  roleIds: string[]
): Promise<void> {
  const [guild] = await db
    .select({ id: guilds.id })
    .from(guilds)
    .where(eq(guilds.guildId, guildId))
    .limit(1);
  if (!guild) return;
  await db
    .update(guildConfigs)
    .set({ dashboardManagementRoleIds: roleIds, updatedAt: sql`now()` })
    .where(eq(guildConfigs.guildRefId, guild.id));
}
