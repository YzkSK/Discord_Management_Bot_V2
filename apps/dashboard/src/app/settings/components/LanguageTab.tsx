"use client";

import type { GuildLanguage } from "@discord-bot/shared";
import { isGuildLanguage } from "@discord-bot/shared";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Select } from "../../../components/ui/select";
import { getDashboardLocale } from "../../../lib/locale";

const UI_LANG_KEY = "dashboard-ui-lang";

export function LanguageTab({
  uiLang,
  onUiLangChange,
}: {
  uiLang: GuildLanguage;
  onUiLangChange: (lang: GuildLanguage) => void;
}) {
  const loc = getDashboardLocale(uiLang);

  function handleChange(value: string) {
    if (!isGuildLanguage(value)) return;
    localStorage.setItem(UI_LANG_KEY, value);
    onUiLangChange(value);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{loc.language}</CardTitle>
      </CardHeader>
      <CardContent>
        <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#b5bac1]">
          {loc.languageEn} / {loc.languageJa}
          <Select value={uiLang} onChange={(e) => handleChange(e.target.value)}>
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </Select>
        </label>
        <p className="mt-3 text-xs text-[#80848e]">
          {uiLang === "ja"
            ? "ダッシュボードの表示言語を変更します。"
            : "Changes the display language of the dashboard."}
        </p>
      </CardContent>
    </Card>
  );
}
