import { inArray, sql } from "drizzle-orm";

import type { DbClient } from "../client.js";
import { discordChannels } from "../schema/index.js";

export async function upsertDiscordChannel(
  db: DbClient,
  input: { channelId: string; guildId: string; name: string }
) {
  await db
    .insert(discordChannels)
    .values({
      channelId: input.channelId,
      guildId: input.guildId,
      name: input.name
    })
    .onConflictDoUpdate({
      target: discordChannels.channelId,
      set: {
        name: sql`excluded.name`,
        updatedAt: sql`now()`
      }
    });
}

export async function listDiscordChannelNamesByIds(
  db: DbClient,
  channelIds: string[]
): Promise<Map<string, string>> {
  if (channelIds.length === 0) return new Map();

  const rows = await db
    .select({ channelId: discordChannels.channelId, name: discordChannels.name })
    .from(discordChannels)
    .where(inArray(discordChannels.channelId, channelIds));

  return new Map(rows.map((r) => [r.channelId, r.name]));
}
