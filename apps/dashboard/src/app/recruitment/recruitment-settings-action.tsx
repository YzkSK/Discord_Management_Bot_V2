"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Settings } from "lucide-react";
import { fetchSettings, updateRecruitmentSettings, toSettingsError, type SettingsResponse } from "../../lib/settings-api";
import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";
import { Skeleton } from "../../components/ui/skeleton";
import { useBeforeUnload } from "../../hooks/use-before-unload";
import { RecruitmentSettingsTab } from "../settings/components/RecruitmentSettingsTab";
import { SettingsModal } from "../../components/settings-modal";
import type { GuildLanguage } from "@discord-bot/shared";
import { isGuildLanguage } from "@discord-bot/shared";

const UI_LANG_KEY = "dashboard-ui-lang";

function RecruitmentSettingsCard({ guildId }: { guildId: string }) {
  const [settingsData, setSettingsData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channelId, setChannelId] = useState("");
  const [savedChannelId, setSavedChannelId] = useState("");
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");

  useEffect(() => {
    const stored = localStorage.getItem(UI_LANG_KEY);
    if (stored !== null && isGuildLanguage(stored)) setUiLang(stored);
    else setUiLang(detectBrowserLanguage());
  }, []);

  const loc = getDashboardLocale(uiLang);
  useBeforeUnload(!loading && channelId !== savedChannelId);

  useEffect(() => {
    setLoading(true);
    fetchSettings(guildId)
      .then((s) => {
        setSettingsData(s);
        const id = s.features.recruitment.channelId ?? "";
        setChannelId(id);
        setSavedChannelId(id);
      })
      .catch((e: unknown) => toast.error(toSettingsError(e)))
      .finally(() => setLoading(false));
  }, [guildId]);

  if (loading || !settingsData) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  async function save() {
    setSaving(true);
    try {
      await updateRecruitmentSettings(guildId, { channelId: channelId || null });
      setSavedChannelId(channelId);
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
        <p className="text-sm font-medium text-[#dbdee1]">{loc.recruitmentSettings}</p>
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
      <RecruitmentSettingsTab
        recruitmentChannelId={channelId}
        settings={settingsData}
        loc={loc}
        onRecruitmentChannelIdChange={setChannelId}
      />
    </div>
  );
}

export function RecruitmentSettingsAction({ guildId }: { guildId: string }) {
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
          <RecruitmentSettingsCard guildId={guildId} />
        </SettingsModal>
      )}
    </>
  );
}
