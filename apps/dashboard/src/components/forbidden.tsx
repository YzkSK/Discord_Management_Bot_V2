"use client";

import { useEffect, useState } from "react";
import { ShieldOff } from "lucide-react";
import { isGuildLanguage } from "@discord-bot/shared";
import type { GuildLanguage } from "@discord-bot/shared";
import { detectBrowserLanguage, getDashboardLocale } from "../lib/locale";

const UI_LANG_KEY = "dashboard-ui-lang";

export function Forbidden() {
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");

  useEffect(() => {
    const stored = localStorage.getItem(UI_LANG_KEY);
    if (stored !== null && isGuildLanguage(stored)) setUiLang(stored);
    else setUiLang(detectBrowserLanguage());
  }, []);

  const loc = getDashboardLocale(uiLang);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#3f4147] bg-[#383a40]">
        <ShieldOff className="h-6 w-6 text-[#b5bac1]" />
      </div>
      <div>
        <p className="text-base font-semibold text-[#f2f3f5]">{loc.forbidden}</p>
        <p className="mt-1 text-sm text-[#b5bac1]">
          {loc.forbiddenDetail}
        </p>
      </div>
    </div>
  );
}
