import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";

import type { DbClient } from "../client.js";
import { ttsSpeakerSettings } from "../schema/index.js";
import { normalizeRequiredString } from "./_utils.js";

export interface TtsSpeakerSettingInput {
  guildId: string;
  speakerId: number;
  userId?: string | null;
}

export interface NormalizedTtsSpeakerSettingInput {
  guildId: string;
  speakerId: number;
  userId: string | null;
}

export interface ResolveTtsSpeakerIdInput {
  fallbackSpeakerId: number;
  guildDefaultSpeakerId: number | null;
  userSpeakerId: number | null;
}

export interface GetEffectiveTtsSpeakerIdInput {
  fallbackSpeakerId: number;
  guildId: string;
  userId: string;
}

export function normalizeTtsSpeakerSettingInput(
  input: TtsSpeakerSettingInput
): NormalizedTtsSpeakerSettingInput {
  const speakerId = input.speakerId;
  if (!Number.isInteger(speakerId) || speakerId < 0) {
    throw new Error("speakerId must be a non-negative integer.");
  }

  return {
    guildId: normalizeRequiredString(input.guildId, "guildId"),
    speakerId,
    userId:
      input.userId === undefined || input.userId === null
        ? null
        : normalizeRequiredString(input.userId, "userId")
  };
}

export function resolveTtsSpeakerId(input: ResolveTtsSpeakerIdInput) {
  return (
    input.userSpeakerId ??
    input.guildDefaultSpeakerId ??
    input.fallbackSpeakerId
  );
}

export async function setGuildDefaultTtsSpeaker(
  db: DbClient,
  input: TtsSpeakerSettingInput
) {
  const normalized = normalizeTtsSpeakerSettingInput({
    ...input,
    userId: null
  });
  const [setting] = await db
    .insert(ttsSpeakerSettings)
    .values(normalized)
    .onConflictDoUpdate({
      target: [ttsSpeakerSettings.guildId],
      targetWhere: sql`${ttsSpeakerSettings.userId} is null`,
      set: {
        speakerId: normalized.speakerId,
        updatedAt: sql`now()`
      }
    })
    .returning();

  if (!setting) {
    throw new Error("Failed to set guild default TTS speaker.");
  }

  return setting;
}

export async function setUserTtsSpeaker(
  db: DbClient,
  input: TtsSpeakerSettingInput & { userId: string }
) {
  const normalized = normalizeTtsSpeakerSettingInput(input);
  const [setting] = await db
    .insert(ttsSpeakerSettings)
    .values(normalized)
    .onConflictDoUpdate({
      target: [ttsSpeakerSettings.guildId, ttsSpeakerSettings.userId],
      targetWhere: sql`${ttsSpeakerSettings.userId} is not null`,
      set: {
        speakerId: normalized.speakerId,
        updatedAt: sql`now()`
      }
    })
    .returning();

  if (!setting) {
    throw new Error("Failed to set user TTS speaker.");
  }

  return setting;
}

export async function getGuildDefaultTtsSpeaker(
  db: DbClient,
  guildId: string
) {
  const [setting] = await db
    .select()
    .from(ttsSpeakerSettings)
    .where(
      and(
        eq(ttsSpeakerSettings.guildId, normalizeRequiredString(guildId, "guildId")),
        isNull(ttsSpeakerSettings.userId)
      )
    )
    .limit(1);

  return setting ?? null;
}

export async function getUserTtsSpeaker(
  db: DbClient,
  input: { guildId: string; userId: string }
) {
  const [setting] = await db
    .select()
    .from(ttsSpeakerSettings)
    .where(
      and(
        eq(ttsSpeakerSettings.guildId, normalizeRequiredString(input.guildId, "guildId")),
        eq(ttsSpeakerSettings.userId, normalizeRequiredString(input.userId, "userId"))
      )
    )
    .limit(1);

  return setting ?? null;
}

export async function listUserTtsSpeakers(db: DbClient, guildId: string) {
  const settings = await db
    .select()
    .from(ttsSpeakerSettings)
    .where(
      and(
        eq(ttsSpeakerSettings.guildId, normalizeRequiredString(guildId, "guildId")),
        isNotNull(ttsSpeakerSettings.userId)
      )
    );

  return settings.filter(isUserTtsSpeakerSetting);
}

export function isUserTtsSpeakerSetting<T extends { userId: string | null }>(
  setting: T
): setting is T & { userId: string } {
  return setting.userId !== null;
}

export async function getEffectiveTtsSpeakerId(
  db: DbClient,
  input: GetEffectiveTtsSpeakerIdInput
) {
  const [userSetting, guildSetting] = await Promise.all([
    getUserTtsSpeaker(db, input),
    getGuildDefaultTtsSpeaker(db, input.guildId)
  ]);

  return resolveTtsSpeakerId({
    fallbackSpeakerId: input.fallbackSpeakerId,
    guildDefaultSpeakerId: guildSetting?.speakerId ?? null,
    userSpeakerId: userSetting?.speakerId ?? null
  });
}

export async function clearGuildDefaultTtsSpeaker(
  db: DbClient,
  guildId: string
) {
  const [setting] = await db
    .delete(ttsSpeakerSettings)
    .where(
      and(
        eq(ttsSpeakerSettings.guildId, normalizeRequiredString(guildId, "guildId")),
        isNull(ttsSpeakerSettings.userId)
      )
    )
    .returning();

  return setting ?? null;
}

export async function clearUserTtsSpeaker(
  db: DbClient,
  input: { guildId: string; userId: string }
) {
  const [setting] = await db
    .delete(ttsSpeakerSettings)
    .where(
      and(
        eq(ttsSpeakerSettings.guildId, normalizeRequiredString(input.guildId, "guildId")),
        eq(ttsSpeakerSettings.userId, normalizeRequiredString(input.userId, "userId"))
      )
    )
    .returning();

  return setting ?? null;
}

