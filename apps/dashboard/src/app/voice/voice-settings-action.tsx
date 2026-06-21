"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Settings } from "lucide-react";
import { fetchSettings, updateTempVcSettings, toSettingsError, type SettingsResponse } from "../../lib/settings-api";
import { Skeleton } from "../../components/ui/skeleton";
import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";
import { VoiceSettingsTab } from "../settings/components/VoiceSettingsTab";
import { SettingsModal } from "../../components/settings-modal";

function VoiceSettingsCard({ guildId }: { guildId: string }) {
  const [settingsData, setSettingsData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createChannelId, setCreateChannelId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const loc = getDashboardLocale(detectBrowserLanguage());

  useEffect(() => {
    setLoading(true);
    fetchSettings(guildId)
      .then((s) => {
        setSettingsData(s);
        setCreateChannelId(s.features.tempVc.createChannelId ?? "");
        setCategoryId(s.features.tempVc.categoryId ?? "");
      })
      .catch((e: unknown) => toast.error(toSettingsError(e)))
      .finally(() => setLoading(false));
  }, [guildId]);

  if (loading || !settingsData) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  async function save() {
    setSaving(true);
    try {
      await updateTempVcSettings(guildId, createChannelId, categoryId);
      toast.success("Voice設定を保存しました。");
    } catch (e) {
      toast.error(toSettingsError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-zinc-300">{loc.tempVcSettings}</p>
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
      <VoiceSettingsTab
        tempVcCreateChannelId={createChannelId}
        tempVcCategoryId={categoryId}
        settings={settingsData}
        loc={loc}
        onTempVcCreateChannelIdChange={setCreateChannelId}
        onTempVcCategoryIdChange={setCategoryId}
      />
    </div>
  );
}

export function VoiceSettingsAction({ guildId }: { guildId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
        aria-label="Voice設定"
      >
        <Settings className="h-3.5 w-3.5" />
      </button>
      {open && (
        <SettingsModal onClose={() => setOpen(false)}>
          <VoiceSettingsCard guildId={guildId} />
        </SettingsModal>
      )}
    </>
  );
}
