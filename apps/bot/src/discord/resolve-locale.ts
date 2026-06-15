import type { DbClient } from "@discord-bot/db";
import { getGuildConfigByGuildId } from "@discord-bot/db";
import { getLocale, isGuildLanguage } from "@discord-bot/shared";

export async function resolveGuildLocale(db: DbClient, guildId: string | null) {
  if (!guildId) return getLocale("en");
  const config = await getGuildConfigByGuildId(db, guildId).catch((error: unknown) => {
    console.warn("failed to fetch guild config for locale", error);
    return null;
  });
  const lang = config?.language && isGuildLanguage(config.language) ? config.language : "en";
  return getLocale(lang);
}
