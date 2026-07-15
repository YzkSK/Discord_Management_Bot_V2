"use client";

import { useEffect, useState } from "react";
import type { GuildLanguage } from "@discord-bot/shared";
import { isGuildLanguage } from "@discord-bot/shared";
import { toast } from "sonner";
import { Save, Settings } from "lucide-react";
import { fetchSettings, toSettingsError } from "../../lib/settings-api";
import { getDashboardLocale, detectBrowserLanguage } from "../../lib/locale";
import { Skeleton } from "../../components/ui/skeleton";
import { useBeforeUnload } from "../../hooks/use-before-unload";
import { LogsSettingsTab } from "../settings/components/LogsSettingsTab";
import { SettingsModal } from "../../components/settings-modal";

const UI_LANG_KEY = "dashboard-ui-lang";

function LogSettingsCard({ guildId }: { guildId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logMode, setLogMode] = useState("full");
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");
  const [savedLogMode, setSavedLogMode] = useState("full");

  const loc = getDashboardLocale(uiLang);
  useBeforeUnload(!loading && logMode !== savedLogMode);
  const logModeOptions = [
    { label: loc.logModeFull, value: "full" },
    { label: loc.logModeMetadataOnly, value: "metadata_only" },
    { label: loc.logModeDisabled, value: "disabled" },
  ];

  useEffect(() => {
    const stored = localStorage.getItem(UI_LANG_KEY);
    if (stored !== null && isGuildLanguage(stored)) setUiLang(stored);
    else setUiLang(detectBrowserLanguage());
  }, []);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    fetchSettings(guildId)
      .then((s) => {
        setLogMode(s.logMode);
        setSavedLogMode(s.logMode);
      })
      .catch((e: unknown) => toast.error(toSettingsError(e)))
      .finally(() => setLoading(false));
  }, [guildId]);

  if (!guildId || loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  async function save() {
    if (!guildId) return;
    setSaving(true);
    try {
      const r = await fetch("/api/settings", {
        body: JSON.stringify({ guildId, section: "logs", values: { logMode } }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      if (!r.ok) throw new Error(`Failed to save settings (${r.status})`);
      setSavedLogMode(logMode);
      toast.success(loc.settingsSaved);
    } catch (e) {
      toast.error(toSettingsError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-[#dbdee1]">{loc.logsSettings}</p>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="flex items-center gap-1.5 rounded-md bg-[#383a40] px-3 py-1.5 text-xs text-[#dbdee1] hover:bg-[#404249] disabled:opacity-40"
        >
          <Save className="h-3 w-3" />
          {saving ? loc.saving : loc.saveChanges}
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <LogsSettingsTab
          logMode={logMode}
          logModeOptions={logModeOptions}
          loc={loc}
          onLogModeChange={setLogMode}
        />
      </div>
    </div>
  );
}

export function LogSettingsAction({ guildId }: { guildId: string }) {
  const [open, setOpen] = useState(false);
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");

  useEffect(() => {
    const stored = localStorage.getItem(UI_LANG_KEY);
    if (stored !== null && isGuildLanguage(stored)) setUiLang(stored);
    else setUiLang(detectBrowserLanguage());
  }, []);

  const loc = getDashboardLocale(uiLang);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-[#3f4147] px-2.5 py-1.5 text-xs text-[#b5bac1] hover:border-[#3f4147] hover:text-[#dbdee1]"
        aria-label={loc.serverSettings}
      >
        <Settings className="h-3.5 w-3.5" />
        {loc.serverSettings}
      </button>
      {open && (
        <SettingsModal onClose={() => setOpen(false)}>
          <LogSettingsCard guildId={guildId} />
        </SettingsModal>
      )}
    </>
  );
}
