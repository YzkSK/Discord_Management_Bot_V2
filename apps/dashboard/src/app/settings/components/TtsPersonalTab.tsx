"use client";

import { useEffect, useState } from "react";
import { isGuildLanguage } from "@discord-bot/shared";
import type { GuildLanguage } from "@discord-bot/shared";
import { detectBrowserLanguage, getDashboardLocale } from "../../../lib/locale";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import {
  PersonalSpeakerSection,
  PersonalDictionarySection,
} from "../../tts/components/TtsUserSettingsModal";

const UI_LANG_KEY = "dashboard-ui-lang";

export function TtsPersonalTab({ guildId }: { guildId: string }) {
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");

  useEffect(() => {
    const stored = localStorage.getItem(UI_LANG_KEY);
    if (stored !== null && isGuildLanguage(stored)) setUiLang(stored);
    else setUiLang(detectBrowserLanguage());
  }, []);

  const loc = getDashboardLocale(uiLang);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{loc.ttsPersonalSpeakerTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <PersonalSpeakerSection guildId={guildId} loc={loc} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{loc.ttsPersonalDictTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <PersonalDictionarySection guildId={guildId} loc={loc} />
        </CardContent>
      </Card>
    </div>
  );
}
