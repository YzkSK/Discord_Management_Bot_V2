"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { fetchSettings, updateTempVcSettings, toSettingsError } from "../../../lib/settings-api";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { VoiceSettingsTab } from "./VoiceSettingsTab";
import type { DashboardLoc, SettingsResponse } from "./shared";

interface VoiceSettingsPanelProps {
  guildId: string;
  loc: DashboardLoc;
}

export function VoiceSettingsPanel({ guildId, loc }: VoiceSettingsPanelProps) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [createChannelId, setCreateChannelId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings(guildId)
      .then((s) => {
        setSettings(s);
        setCreateChannelId(s.features.tempVc.createChannelId ?? "");
        setCategoryId(s.features.tempVc.categoryId ?? "");
      })
      .catch((e: unknown) => toast.error(toSettingsError(e)));
  }, [guildId]);

  async function save() {
    setSaving(true);
    try {
      const updated = await updateTempVcSettings(guildId, createChannelId, categoryId);
      setSettings(updated);
      toast.success("Voice設定を保存しました。");
    } catch (e) {
      toast.error(toSettingsError(e));
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
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
      <VoiceSettingsTab
        settings={settings}
        tempVcCreateChannelId={createChannelId}
        tempVcCategoryId={categoryId}
        loc={loc}
        onTempVcCreateChannelIdChange={setCreateChannelId}
        onTempVcCategoryIdChange={setCategoryId}
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
