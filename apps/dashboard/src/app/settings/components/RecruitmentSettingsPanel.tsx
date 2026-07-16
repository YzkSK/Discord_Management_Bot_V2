"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { fetchSettings, updateRecruitmentSettings, toSettingsError } from "../../../lib/settings-api";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { RecruitmentSettingsTab } from "./RecruitmentSettingsTab";
import type { DashboardLoc, SettingsResponse } from "./shared";

interface RecruitmentSettingsPanelProps {
  guildId: string;
  loc: DashboardLoc;
}

export function RecruitmentSettingsPanel({ guildId, loc }: RecruitmentSettingsPanelProps) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [channelId, setChannelId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings(guildId)
      .then((s) => {
        setSettings(s);
        setChannelId(s.features.recruitment.channelId ?? "");
      })
      .catch((e: unknown) => toast.error(toSettingsError(e)));
  }, [guildId]);

  async function save() {
    setSaving(true);
    try {
      const updated = await updateRecruitmentSettings(guildId, { channelId: channelId || null });
      setSettings(updated);
      toast.success(loc.settingsSaved);
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
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <RecruitmentSettingsTab
        settings={settings}
        recruitmentChannelId={channelId}
        loc={loc}
        onRecruitmentChannelIdChange={setChannelId}
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
