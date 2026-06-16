export type { GuildLanguage, Locale } from "./locale-types.js";
export { guildLanguages, isGuildLanguage } from "./locale-types.js";

import type { GuildLanguage, Locale } from "./locale-types.js";
import { en } from "./locale.en.js";
import { ja } from "./locale.ja.js";

const locales: Record<GuildLanguage, Locale> = { en, ja };

export function getLocale(lang: GuildLanguage) {
  return locales[lang];
}
