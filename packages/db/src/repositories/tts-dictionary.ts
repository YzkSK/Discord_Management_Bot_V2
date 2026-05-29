import { and, asc, desc, eq, isNull, or, sql } from "drizzle-orm";

import type { DbClient } from "../client.js";
import { ttsDictionaryEntries } from "../schema/index.js";

export const ttsDictionaryScopes = ["guild", "user"] as const;
export type TtsDictionaryScope = (typeof ttsDictionaryScopes)[number];

export interface EnsureTtsDictionaryEntryInput {
  guildId: string;
  scope: TtsDictionaryScope;
  userId?: string | null;
  fromText: string;
  toText: string;
  priority?: number;
  isEnabled?: boolean;
}

export interface NormalizedTtsDictionaryEntryInput {
  guildId: string;
  scope: TtsDictionaryScope;
  userId: string | null;
  fromText: string;
  toText: string;
  priority: number;
  isEnabled: boolean;
}

export interface EffectiveTtsDictionaryEntry {
  scope: TtsDictionaryScope;
  fromText: string;
  toText: string;
  priority: number;
  isEnabled: boolean;
}

export interface ListGuildTtsDictionaryEntriesInput {
  guildId: string;
}

export interface ListEffectiveTtsDictionaryEntriesInput {
  guildId: string;
  userId: string;
}

export interface DeleteTtsDictionaryEntryInput {
  guildId: string;
  scope: TtsDictionaryScope;
  userId?: string | null;
  fromText: string;
}

export function normalizeTtsDictionaryEntryInput(
  input: EnsureTtsDictionaryEntryInput
): NormalizedTtsDictionaryEntryInput {
  const guildId = normalizeRequiredString(input.guildId, "guildId");
  const fromText = normalizeRequiredString(input.fromText, "fromText");
  const toText = normalizeRequiredString(input.toText, "toText");
  const priority = input.priority ?? 0;

  if (!Number.isInteger(priority) || priority < 0) {
    throw new Error("priority must be a non-negative integer.");
  }

  if (!ttsDictionaryScopes.includes(input.scope)) {
    throw new Error("scope must be guild or user.");
  }

  const userId = input.scope === "user"
    ? normalizeRequiredString(input.userId, "userId")
    : null;

  return {
    guildId,
    scope: input.scope,
    userId,
    fromText,
    toText,
    priority,
    isEnabled: input.isEnabled ?? true
  };
}

export function sortEffectiveTtsDictionaryEntries<
  T extends EffectiveTtsDictionaryEntry
>(entries: T[]) {
  return [...entries]
    .filter((entry) => entry.isEnabled)
    .sort((a: T, b: T) => {
      const scopeOrder = scopeRank(b.scope) - scopeRank(a.scope);
      if (scopeOrder !== 0) return scopeOrder;
      const priorityOrder = b.priority - a.priority;
      if (priorityOrder !== 0) return priorityOrder;
      return b.fromText.length - a.fromText.length;
    });
}

export async function ensureTtsDictionaryEntry(
  db: DbClient,
  input: EnsureTtsDictionaryEntryInput
) {
  const normalized = normalizeTtsDictionaryEntryInput(input);
  const [entry] = await db
    .insert(ttsDictionaryEntries)
    .values(normalized)
    .onConflictDoUpdate(buildTtsDictionaryUpsertConflict(normalized))
    .returning();

  if (!entry) {
    throw new Error("Failed to ensure TTS dictionary entry.");
  }

  return entry;
}

export async function listGuildTtsDictionaryEntries(
  db: DbClient,
  input: ListGuildTtsDictionaryEntriesInput
) {
  return db
    .select()
    .from(ttsDictionaryEntries)
    .where(eq(ttsDictionaryEntries.guildId, input.guildId))
    .orderBy(
      asc(ttsDictionaryEntries.scope),
      asc(ttsDictionaryEntries.userId),
      desc(ttsDictionaryEntries.priority),
      asc(ttsDictionaryEntries.fromText)
    );
}

export async function listEffectiveTtsDictionaryEntries(
  db: DbClient,
  input: ListEffectiveTtsDictionaryEntriesInput
) {
  const entries = await db
    .select({
      scope: ttsDictionaryEntries.scope,
      fromText: ttsDictionaryEntries.fromText,
      toText: ttsDictionaryEntries.toText,
      priority: ttsDictionaryEntries.priority,
      isEnabled: ttsDictionaryEntries.isEnabled
    })
    .from(ttsDictionaryEntries)
    .where(
      and(
        eq(ttsDictionaryEntries.guildId, input.guildId),
        or(
          eq(ttsDictionaryEntries.scope, "guild"),
          and(
            eq(ttsDictionaryEntries.scope, "user"),
            eq(ttsDictionaryEntries.userId, input.userId)
          )
        )
      )
    );

  return sortEffectiveTtsDictionaryEntries(
    entries.map((entry) => ({
      ...entry,
      scope: entry.scope as TtsDictionaryScope
    }))
  );
}

export async function setTtsDictionaryEntryEnabled(
  db: DbClient,
  input: DeleteTtsDictionaryEntryInput & { isEnabled: boolean }
) {
  const [entry] = await db
    .update(ttsDictionaryEntries)
    .set({ isEnabled: input.isEnabled, updatedAt: sql`now()` })
    .where(entryIdentityFilter(input))
    .returning();

  return entry ?? null;
}

export async function deleteTtsDictionaryEntry(
  db: DbClient,
  input: DeleteTtsDictionaryEntryInput
) {
  const [entry] = await db
    .delete(ttsDictionaryEntries)
    .where(entryIdentityFilter(input))
    .returning();

  return entry ?? null;
}

function buildTtsDictionaryUpsertConflict(
  normalized: NormalizedTtsDictionaryEntryInput
) {
  const set = {
    toText: normalized.toText,
    priority: normalized.priority,
    isEnabled: normalized.isEnabled,
    updatedAt: sql`now()`
  };

  if (normalized.scope === "guild") {
    return {
      target: [ttsDictionaryEntries.guildId, ttsDictionaryEntries.fromText],
      targetWhere: sql`${ttsDictionaryEntries.scope} = 'guild'`,
      set
    };
  }

  return {
    target: [
      ttsDictionaryEntries.guildId,
      ttsDictionaryEntries.userId,
      ttsDictionaryEntries.fromText
    ],
    targetWhere: sql`${ttsDictionaryEntries.scope} = 'user'`,
    set
  };
}

function entryIdentityFilter(input: DeleteTtsDictionaryEntryInput) {
  const userFilter =
    input.scope === "guild"
      ? isNull(ttsDictionaryEntries.userId)
      : eq(
          ttsDictionaryEntries.userId,
          normalizeRequiredString(input.userId, "userId")
        );

  return and(
    eq(ttsDictionaryEntries.guildId, normalizeRequiredString(input.guildId, "guildId")),
    eq(ttsDictionaryEntries.scope, input.scope),
    userFilter,
    eq(ttsDictionaryEntries.fromText, normalizeRequiredString(input.fromText, "fromText"))
  );
}

function normalizeRequiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function scopeRank(scope: TtsDictionaryScope) {
  return scope === "user" ? 1 : 0;
}
