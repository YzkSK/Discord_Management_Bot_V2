"use client";

import { isGuildLanguage } from "@discord-bot/shared";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Select } from "../../../components/ui/select";
import type { DashboardLoc } from "./shared";

interface LogsSettingsTabProps {
  logMode: string;
  language: string;
  logModeOptions: { label: string; value: string }[];
  languageOptions: { label: string; value: string }[];
  loc: DashboardLoc;
  onLogModeChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onUiLangChange: (value: string) => void;
}

export function LogsSettingsTab({
  logMode,
  language,
  logModeOptions,
  languageOptions,
  loc,
  onLogModeChange,
  onLanguageChange,
  onUiLangChange
}: LogsSettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{loc.logsSettings}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#b5bac1]">
          {loc.logMode}
          <Select onChange={(e) => onLogModeChange(e.target.value)} value={logMode}>
            {logModeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </label>

        <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#b5bac1]">
          {loc.language}
          <Select
            onChange={(e) => {
              const val = e.target.value;
              onLanguageChange(val);
              if (isGuildLanguage(val)) onUiLangChange(val);
            }}
            value={language}
          >
            {languageOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </label>
      </CardContent>
    </Card>
  );
}
