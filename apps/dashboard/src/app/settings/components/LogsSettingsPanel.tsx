"use client";

import { useEffect, useState } from "react";
import type { GuildLanguage } from "@discord-bot/shared";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { fetchSettings, updateSettings, toSettingsError } from "../../../lib/settings-api";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { LogsSettingsTab } from "./LogsSettingsTab";
import type { DashboardLoc } from "./shared";

interface LogsSettingsPanelProps {
  guildId: string;
  loc: DashboardLoc;
  onUiLangChange: (lang: GuildLanguage) => void;
}

export function LogsSettingsPanel({ guildId, loc, onUiLangChange }: LogsSettingsPanelProps) {
  const [logMode, setLogMode] = useState("full");
  const [language, setLanguage] = useState("en");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const logModeOptions = [
    { label: loc.logModeFull, value: "full" },
    { label: loc.logModeMetadataOnly, value: "metadata_only" },
    { label: loc.logModeDisabled, value: "disabled" },
  ];
  const languageOptions = [
    { label: loc.languageEn, value: "en" },
    { label: loc.languageJa, value: "ja" },
  ];

  useEffect(() => {
    fetchSettings(guildId)
      .then((s) => {
        setLogMode(s.logMode);
        setLanguage(s.language);
        setLoaded(true);
      })
      .catch((e: unknown) => toast.error(toSettingsError(e)));
  }, [guildId]);

  async function save() {
    setSaving(true);
    try {
      const updated = await updateSettings(guildId, logMode, language);
      setLogMode(updated.logMode);
      setLanguage(updated.language);
      toast.success(loc.settingsSaved);
    } catch (e) {
      toast.error(toSettingsError(e));
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <LogsSettingsTab
        logMode={logMode}
        language={language}
        logModeOptions={logModeOptions}
        languageOptions={languageOptions}
        loc={loc}
        onLogModeChange={setLogMode}
        onLanguageChange={setLanguage}
        onUiLangChange={(val) => {
          onUiLangChange(val as GuildLanguage);
        }}
      />
      <div className="flex justify-end">
        <Button disabled={saving} onClick={() => void save()} size="sm" type="button">
          <Save className="h-3.5 w-3.5" />
          {saving ? loc.saving : loc.saveChanges}
        </Button>
      </div>
    </div>
  );
}
