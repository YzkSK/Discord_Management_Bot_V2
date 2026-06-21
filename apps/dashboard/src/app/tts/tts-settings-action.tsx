"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Settings } from "lucide-react";
import { fetchSettings, updateTtsSettings, toSettingsError } from "../../lib/settings-api";
import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";
import { useBeforeUnload } from "../../hooks/use-before-unload";
import { SettingsModal } from "../../components/settings-modal";
import { Skeleton } from "../../components/ui/skeleton";

function TtsChannelSettingsCard({ guildId }: { guildId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [textChannelId, setTextChannelId] = useState("");
  const [savedChannelId, setSavedChannelId] = useState("");

  const loc = getDashboardLocale(detectBrowserLanguage());
  useBeforeUnload(textChannelId !== savedChannelId && !loading);

  useEffect(() => {
    setLoading(true);
    fetchSettings(guildId)
      .then((s) => {
        const id = s.features.tts.textChannelId ?? "";
        setTextChannelId(id);
        setSavedChannelId(id);
      })
      .catch((e: unknown) => toast.error(toSettingsError(e)))
      .finally(() => setLoading(false));
  }, [guildId]);

  if (loading) {
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
      await updateTtsSettings(guildId, textChannelId);
      setSavedChannelId(textChannelId);
      toast.success("TTS設定を保存しました。");
    } catch (e) {
      toast.error(toSettingsError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-300">{loc.ttsSettings}</p>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-40"
        >
          <Save className="h-3 w-3" />
          {saving ? loc.saving : "保存"}
        </button>
      </div>
      <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {loc.ttsTextChannelId}
        <input
          type="text"
          value={textChannelId}
          onChange={(e) => setTextChannelId(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-slate-500 focus:outline-none"
        />
      </label>
    </div>
  );
}

export function TtsSettingsAction({ guildId }: { guildId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-400 hover:border-slate-600 hover:text-slate-200"
        aria-label="TTS設定"
      >
        <Settings className="h-3.5 w-3.5" />
      </button>
      {open && (
        <SettingsModal onClose={() => setOpen(false)}>
          <TtsChannelSettingsCard guildId={guildId} />
        </SettingsModal>
      )}
    </>
  );
}
