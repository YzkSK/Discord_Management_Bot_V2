"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { fetchSettings, updateBotLanguage, toSettingsError } from "../../../lib/settings-api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Select } from "../../../components/ui/select";
import { Skeleton } from "../../../components/ui/skeleton";
import type { DashboardLoc } from "./shared";

interface BotLanguageTabProps {
  guildId: string;
  loc: DashboardLoc;
}

export function BotLanguageTab({ guildId, loc }: BotLanguageTabProps) {
  const [language, setLanguage] = useState("en");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const languageOptions = [
    { label: loc.languageEn, value: "en" },
    { label: loc.languageJa, value: "ja" },
  ];

  useEffect(() => {
    fetchSettings(guildId)
      .then((s) => {
        setLanguage(s.language);
        setLoaded(true);
      })
      .catch((e: unknown) => toast.error(toSettingsError(e)));
  }, [guildId]);

  async function save() {
    setSaving(true);
    try {
      const updated = await updateBotLanguage(guildId, language);
      setLanguage(updated.language);
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
      <Card>
        <CardHeader>
          <CardTitle>{loc.language}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#b5bac1]">
            {loc.languageEn} / {loc.languageJa}
            <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {languageOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </label>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button disabled={saving} onClick={() => void save()} size="sm" type="button">
          <Save className="h-3.5 w-3.5" />
          {saving ? loc.saving : loc.saveChanges}
        </Button>
      </div>
    </div>
  );
}
