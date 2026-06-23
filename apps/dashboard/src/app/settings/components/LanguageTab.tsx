"use client";

import type { GuildLanguage } from "@discord-bot/shared";
import { isGuildLanguage } from "@discord-bot/shared";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Select } from "../../../components/ui/select";

const UI_LANG_KEY = "dashboard-ui-lang";

export function LanguageTab({
  uiLang,
  onUiLangChange,
}: {
  uiLang: GuildLanguage;
  onUiLangChange: (lang: GuildLanguage) => void;
}) {
  function handleChange(value: string) {
    if (!isGuildLanguage(value)) return;
    localStorage.setItem(UI_LANG_KEY, value);
    onUiLangChange(value);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>表示言語</CardTitle>
      </CardHeader>
      <CardContent>
        <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#b5bac1]">
          UI Language
          <Select value={uiLang} onChange={(e) => handleChange(e.target.value)}>
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </Select>
        </label>
      </CardContent>
    </Card>
  );
}
