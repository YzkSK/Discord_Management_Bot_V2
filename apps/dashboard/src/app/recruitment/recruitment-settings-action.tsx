"use client";

import { useEffect, useState } from "react";
import { Save, Settings } from "lucide-react";
import { fetchSettings, updateRecruitmentSettings, toSettingsError, type SettingsResponse } from "../../lib/settings-api";
import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";
import { RecruitmentSettingsTab } from "../settings/components/RecruitmentSettingsTab";
import { SettingsModal } from "../../components/settings-modal";

function RecruitmentSettingsCard({ guildId }: { guildId: string }) {
  const [settingsData, setSettingsData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channelId, setChannelId] = useState("");

  const loc = getDashboardLocale(detectBrowserLanguage());

  useEffect(() => {
    setLoading(true);
    fetchSettings(guildId)
      .then((s) => {
        setSettingsData(s);
        setChannelId(s.features.recruitment.channelId ?? "");
      })
      .catch((e: unknown) => setError(toSettingsError(e)))
      .finally(() => setLoading(false));
  }, [guildId]);

  if (loading || !settingsData) return null;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateRecruitmentSettings(guildId, { channelId: channelId || null });
    } catch (e) {
      setError(toSettingsError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-zinc-300">{loc.recruitmentSettings}</p>
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
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
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
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
        aria-label="Recruitment設定"
      >
        <Settings className="h-3.5 w-3.5" />
      </button>
      {open && (
        <SettingsModal onClose={() => setOpen(false)}>
          <RecruitmentSettingsCard guildId={guildId} />
        </SettingsModal>
      )}
    </>
  );
}
