"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { fetchSettings, updateTtsSettings, toSettingsError } from "../../../lib/settings-api";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { TtsSettingsTab } from "./TtsSettingsTab";
import { useTtsSettings } from "../hooks/useTtsSettings";
import type { DashboardLoc, SettingsResponse } from "./shared";

interface TtsSettingsPanelProps {
  guildId: string;
  loc: DashboardLoc;
}

export function TtsSettingsPanel({ guildId, loc }: TtsSettingsPanelProps) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [ttsTextChannelId, setTtsTextChannelId] = useState("");
  const [savingChannel, setSavingChannel] = useState(false);

  const tts = useTtsSettings(guildId, loc);

  useEffect(() => {
    fetchSettings(guildId)
      .then((s) => {
        setSettings(s);
        setTtsTextChannelId(s.features.tts.textChannelId ?? "");
      })
      .catch((e: unknown) => toast.error(toSettingsError(e)));
  }, [guildId]);

  async function saveTextChannel() {
    setSavingChannel(true);
    try {
      const updated = await updateTtsSettings(guildId, ttsTextChannelId);
      setSettings(updated);
      toast.success(loc.ttsSettingsSaved);
    } catch (e) {
      toast.error(toSettingsError(e));
    } finally {
      setSavingChannel(false);
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

  const canEditTts = settings.accessRole !== "viewer";

  return (
    <div className="grid gap-4">
      <TtsSettingsTab
        settings={settings}
        ttsSettings={tts.ttsSettings}
        ttsTextChannelId={ttsTextChannelId}
        ttsDefaultSpeakerId={tts.ttsDefaultSpeakerId}
        ttsUserSpeakerUserId={tts.ttsUserSpeakerUserId}
        ttsUserSpeakerId={tts.ttsUserSpeakerId}
        ttsDictionaryScope={tts.ttsDictionaryScope}
        ttsDictionaryUserId={tts.ttsDictionaryUserId}
        ttsDictionaryFromText={tts.ttsDictionaryFromText}
        ttsDictionaryToText={tts.ttsDictionaryToText}
        ttsDictionaryPriority={tts.ttsDictionaryPriority}
        ttsDictionaryEnabled={tts.ttsDictionaryEnabled}
        canEditTts={canEditTts}
        savingTtsDictionary={tts.savingTtsDictionary}
        savingTtsSpeaker={tts.savingTtsSpeaker}
        loc={loc}
        onTtsTextChannelIdChange={setTtsTextChannelId}
        onTtsDefaultSpeakerIdChange={tts.setTtsDefaultSpeakerId}
        onTtsUserSpeakerUserIdChange={tts.setTtsUserSpeakerUserId}
        onTtsUserSpeakerIdChange={tts.setTtsUserSpeakerId}
        onTtsDictionaryScopeChange={tts.setTtsDictionaryScope}
        onTtsDictionaryUserIdChange={tts.setTtsDictionaryUserId}
        onTtsDictionaryFromTextChange={tts.setTtsDictionaryFromText}
        onTtsDictionaryToTextChange={tts.setTtsDictionaryToText}
        onTtsDictionaryPriorityChange={tts.setTtsDictionaryPriority}
        onTtsDictionaryEnabledChange={tts.setTtsDictionaryEnabled}
        onSaveTtsDefaultSpeaker={() => void tts.saveTtsDefaultSpeaker()}
        onSaveTtsUserSpeaker={() => void tts.saveTtsUserSpeaker()}
        onDeleteTtsSpeaker={(input) => void tts.deleteTtsSpeaker(input)}
        onSaveTtsDictionaryEntry={() => void tts.saveTtsDictionaryEntry()}
        onDeleteTtsDictionary={(entry) => void tts.deleteTtsDictionary(entry)}
      />
      <div className="flex justify-end">
        <Button disabled={savingChannel || !canEditTts} onClick={() => void saveTextChannel()} size="sm" type="button">
          <Save className="h-3.5 w-3.5" />
          {savingChannel ? loc.saving : loc.saveTtsSettings}
        </Button>
      </div>
    </div>
  );
}
