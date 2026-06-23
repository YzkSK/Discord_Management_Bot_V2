"use client";

import type { GuildLanguage } from "@discord-bot/shared";
import { isGuildLanguage } from "@discord-bot/shared";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Select } from "../../../components/ui/select";
import { TtsUserPersonalCard } from "../../tts/components/TtsUserPersonalCard";
import { TtsUserSettingsAction } from "../../tts/components/TtsUserSettingsModal";
import { getDashboardLocale } from "../../../lib/locale";

const UI_LANG_KEY = "dashboard-ui-lang";

interface PersonalSettingsTabProps {
  guildId: string;
  uiLang: GuildLanguage;
  onUiLangChange: (lang: GuildLanguage) => void;
}

export function PersonalSettingsTab({ guildId, uiLang, onUiLangChange }: PersonalSettingsTabProps) {
  const loc = getDashboardLocale(uiLang);

  function handleLangChange(value: string) {
    if (!isGuildLanguage(value)) return;
    localStorage.setItem(UI_LANG_KEY, value);
    onUiLangChange(value);
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>表示言語</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#b5bac1]">
            UI Language
            <Select value={uiLang} onChange={(e) => handleLangChange(e.target.value)}>
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </Select>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{loc.ttsPageTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <TtsUserPersonalCard guildId={guildId} guildDefaultSpeakerId={null} />
          <div className="flex justify-end">
            <TtsUserSettingsAction guildId={guildId} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
