"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Settings } from "lucide-react";
import { fetchSettings, updateTempVcSettings, toSettingsError, type SettingsResponse } from "../../lib/settings-api";
import { Skeleton } from "../../components/ui/skeleton";
import { useBeforeUnload } from "../../hooks/use-before-unload";
import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";
import { VoiceSettingsTab } from "../settings/components/VoiceSettingsTab";
import { SettingsModal } from "../../components/settings-modal";

function VoiceSettingsCard({ guildId }: { guildId: string }) {
  const [settingsData, setSettingsData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createChannelId, setCreateChannelId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saved, setSaved] = useState({ createChannelId: "", categoryId: "" });

  const loc = getDashboardLocale(detectBrowserLanguage());
  useBeforeUnload(
    !loading && (createChannelId !== saved.createChannelId || categoryId !== saved.categoryId)
  );

  useEffect(() => {
    setLoading(true);
    fetchSettings(guildId)
      .then((s) => {
        setSettingsData(s);
        const cc = s.features.tempVc.createChannelId ?? "";
        const ca = s.features.tempVc.categoryId ?? "";
        setCreateChannelId(cc);
        setCategoryId(ca);
        setSaved({ createChannelId: cc, categoryId: ca });
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
      setSaved({ createChannelId, categoryId });
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
        <p className="text-sm font-medium text-[#dbdee1]">{loc.tempVcSettings}</p>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="flex items-center gap-1.5 rounded-md bg-[#383a40] px-3 py-1.5 text-xs text-[#dbdee1] hover:bg-[#404249] disabled:opacity-40"
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
        className="flex items-center gap-1.5 rounded-md border border-[#3f4147] px-2.5 py-1.5 text-xs text-[#b5bac1] hover:border-[#3f4147] hover:text-[#dbdee1]"
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
