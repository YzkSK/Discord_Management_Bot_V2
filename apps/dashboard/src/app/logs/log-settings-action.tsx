"use client";

import { useEffect, useState } from "react";
import type { GuildLanguage } from "@discord-bot/shared";
import { toast } from "sonner";
import { Save, Settings } from "lucide-react";
import { fetchSettings, updateSettings, toSettingsError } from "../../lib/settings-api";
import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";
import { Skeleton } from "../../components/ui/skeleton";
import { LogsSettingsTab } from "../settings/components/LogsSettingsTab";
import { SettingsModal } from "../../components/settings-modal";

function LogSettingsCard({ guildId }: { guildId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logMode, setLogMode] = useState("full");
  const [language, setLanguage] = useState("en");
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");

  const loc = getDashboardLocale(uiLang);
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
    if (!guildId) return;
    setLoading(true);
    fetchSettings(guildId)
      .then((s) => {
        setLogMode(s.logMode);
        setLanguage(s.language);
        if (s.language === "ja" || s.language === "en") setUiLang(s.language);
      })
      .catch((e: unknown) => toast.error(toSettingsError(e)))
      .finally(() => setLoading(false));
  }, [guildId]);

  if (!guildId || loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  async function save() {
    if (!guildId) return;
    setSaving(true);
    try {
      await updateSettings(guildId, logMode, language);
      toast.success("ログ設定を保存しました。");
    } catch (e) {
      toast.error(toSettingsError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-zinc-300">{loc.logsSettings}</p>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"
        >
          <Save className="h-3 w-3" />
          {saving ? loc.saving : "保存"}
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <LogsSettingsTab
          logMode={logMode}
          language={language}
          logModeOptions={logModeOptions}
          languageOptions={languageOptions}
          loc={loc}
          onLogModeChange={setLogMode}
          onLanguageChange={setLanguage}
          onUiLangChange={(val) => {
            if (val === "ja" || val === "en") setUiLang(val);
          }}
        />
      </div>
    </div>
  );
}

export function LogSettingsAction({ guildId }: { guildId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
        aria-label="ログ設定"
      >
        <Settings className="h-3.5 w-3.5" />
      </button>
      {open && (
        <SettingsModal onClose={() => setOpen(false)}>
          <LogSettingsCard guildId={guildId} />
        </SettingsModal>
      )}
    </>
  );
}
