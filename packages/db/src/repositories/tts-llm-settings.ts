import { eq } from "drizzle-orm";

import type { DbClient } from "../client.js";
import { guildConfigs, guilds } from "../schema/index.js";

export async function getGuildTtsLlmEnabled(
  db: DbClient,
  { guildId }: { guildId: string }
): Promise<boolean> {
  const result = await db
    .select({ ttsLlmEnabled: guildConfigs.ttsLlmEnabled })
    .from(guildConfigs)
    .innerJoin(guilds, eq(guilds.id, guildConfigs.guildRefId))
    .where(eq(guilds.guildId, guildId))
    .limit(1);

  return result[0]?.ttsLlmEnabled ?? false;
}

export async function setGuildTtsLlmEnabled(
  db: DbClient,
  { guildId, enabled }: { guildId: string; enabled: boolean }
): Promise<void> {
  const guild = await db
    .select({ id: guilds.id })
    .from(guilds)
    .where(eq(guilds.guildId, guildId))
    .limit(1);

  if (!guild[0]) return;

  await db
    .update(guildConfigs)
    .set({ ttsLlmEnabled: enabled })
    .where(eq(guildConfigs.guildRefId, guild[0].id));
}
