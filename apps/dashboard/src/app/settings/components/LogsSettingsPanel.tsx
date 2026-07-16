"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { fetchSettings, toSettingsError } from "../../../lib/settings-api";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { LogsSettingsTab } from "./LogsSettingsTab";
import type { DashboardLoc } from "./shared";

interface LogsSettingsPanelProps {
  guildId: string;
  loc: DashboardLoc;
}

export function LogsSettingsPanel({ guildId, loc }: LogsSettingsPanelProps) {
  const [logMode, setLogMode] = useState("full");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const logModeOptions = [
    { label: loc.logModeFull, value: "full" },
    { label: loc.logModeMetadataOnly, value: "metadata_only" },
    { label: loc.logModeDisabled, value: "disabled" },
  ];

  useEffect(() => {
    fetchSettings(guildId)
      .then((s) => {
        setLogMode(s.logMode);
        setLoaded(true);
      })
      .catch((e: unknown) => toast.error(toSettingsError(e)));
  }, [guildId]);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/settings", {
        body: JSON.stringify({ guildId, section: "logs", values: { logMode } }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      if (!r.ok) throw new Error(`Failed to save settings (${r.status})`);
      const updated = await r.json() as { logMode: string };
      setLogMode(updated.logMode);
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
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <LogsSettingsTab
        logMode={logMode}
        logModeOptions={logModeOptions}
        loc={loc}
        onLogModeChange={setLogMode}
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
