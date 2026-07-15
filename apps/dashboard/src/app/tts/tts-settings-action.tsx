"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Settings, Trash2 } from "lucide-react";
import { fetchSettings, updateTtsSettings, toSettingsError } from "../../lib/settings-api";
import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";
import { useBeforeUnload } from "../../hooks/use-before-unload";
import { SettingsModal } from "../../components/settings-modal";
import { Skeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";
import { usePreviewAudio } from "./components/usePreviewAudio";
import type { GuildLanguage } from "@discord-bot/shared";
import { isGuildLanguage } from "@discord-bot/shared";

const UI_LANG_KEY = "dashboard-ui-lang";

interface VoicevoxSpeakerOption {
  id: number;
  label: string;
}

interface GuildDefaultSpeaker {
  speakerId: number;
  updatedAt: string;
}

function TtsChannelSettingsCard({ guildId }: { guildId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [textChannelId, setTextChannelId] = useState("");
  const [savedChannelId, setSavedChannelId] = useState("");
  const [availableTextChannels, setAvailableTextChannels] = useState<{ id: string; name: string }[]>([]);
  const [speakers, setSpeakers] = useState<VoicevoxSpeakerOption[]>([]);
  const [guildDefaultSpeaker, setGuildDefaultSpeaker] = useState<GuildDefaultSpeaker | null>(null);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<number | null>(null);
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");

  useEffect(() => {
    const stored = localStorage.getItem(UI_LANG_KEY);
    if (stored !== null && isGuildLanguage(stored)) setUiLang(stored);
    else setUiLang(detectBrowserLanguage());
  }, []);

  const loc = getDashboardLocale(uiLang);
  const { playingId, playPreview } = usePreviewAudio();
  useBeforeUnload(textChannelId !== savedChannelId && !loading);

  const load = useCallback(async () => {
    setLoading(true);
    const [settingsResult, ttsResult, speakerListResult] = await Promise.allSettled([
      fetchSettings(guildId),
      fetch(`/api/tts-settings?guildId=${encodeURIComponent(guildId)}`).then((r) => r.ok ? r.json() as Promise<{ guildDefaultSpeaker: GuildDefaultSpeaker | null }> : null),
      fetch(`/api/panel/speakers?guildId=${encodeURIComponent(guildId)}`).then((r) => r.ok ? r.json() as Promise<{ speakers: VoicevoxSpeakerOption[] }> : null),
    ]);

    if (settingsResult.status === "fulfilled") {
      const id = settingsResult.value.features.tts.textChannelId ?? "";
      setTextChannelId(id);
      setSavedChannelId(id);
      setAvailableTextChannels(settingsResult.value.availableTextChannels ?? []);
    } else {
      toast.error(toSettingsError(settingsResult.reason));
    }
    if (ttsResult.status === "fulfilled" && ttsResult.value) {
      const spk = ttsResult.value.guildDefaultSpeaker ?? null;
      setGuildDefaultSpeaker(spk);
      setSelectedSpeakerId(spk?.speakerId ?? null);
    }
    if (speakerListResult.status === "fulfilled" && speakerListResult.value) {
      setSpeakers(speakerListResult.value.speakers);
    }
    setLoading(false);
  }, [guildId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-full" />
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
      if (selectedSpeakerId !== null) {
        const res = await fetch("/api/tts-settings", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind: "speaker", target: "guild-default", guildId, speakerId: selectedSpeakerId }),
        });
        if (res.ok) {
          const data = await res.json() as { setting: GuildDefaultSpeaker };
          setGuildDefaultSpeaker(data.setting);
        }
      }
      toast.success(loc.settingsSaved);
    } catch (e) {
      toast.error(toSettingsError(e));
    } finally {
      setSaving(false);
    }
  }

  async function clearDefaultSpeaker() {
    setSaving(true);
    try {
      await fetch("/api/tts-settings", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "speaker", target: "guild-default", guildId }),
      });
      setGuildDefaultSpeaker(null);
      setSelectedSpeakerId(null);
      toast.success(loc.ttsDefaultSpeakerReset);
    } catch {
      toast.error(loc.ttsResetFailed);
    } finally {
      setSaving(false);
    }
  }

  const currentSpeakerLabel = guildDefaultSpeaker
    ? (speakers.find((s) => s.id === guildDefaultSpeaker.speakerId)?.label ?? `ID ${guildDefaultSpeaker.speakerId}`)
    : null;

  return (
    <div className="grid gap-4">
      <p className="text-sm font-medium text-[#dbdee1]">{loc.ttsSettings}</p>

      <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#b5bac1]">
        {loc.ttsTextChannelId}
        <select
          value={textChannelId}
          onChange={(e) => setTextChannelId(e.target.value)}
          className="rounded-md border border-[#3f4147] bg-[#383a40] px-3 py-2 text-sm text-[#dbdee1] focus:border-slate-500 focus:outline-none"
        >
          <option value="">-- {loc.ttsTextChannelPlaceholder} --</option>
          {availableTextChannels.map((ch) => (
            <option key={ch.id} value={ch.id}>#{ch.name}</option>
          ))}
        </select>
      </label>

      <div className="border-t border-[#1e1f22] pt-3 grid gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#b5bac1]">{loc.ttsSpeakerDefault}</p>
        {currentSpeakerLabel && (
          <p className="text-xs text-[#b5bac1]">{loc.panelCurrentSetting} {currentSpeakerLabel}</p>
        )}
        {speakers.length > 0 ? (
          <div className="flex gap-2">
            <select
              value={selectedSpeakerId ?? ""}
              onChange={(e) => setSelectedSpeakerId(e.target.value ? Number(e.target.value) : null)}
              className="flex-1 rounded-md border border-[#3f4147] bg-[#383a40] px-3 py-2 text-sm text-[#dbdee1] focus:outline-none focus:ring-1 focus:ring-[#5865f2]/50"
            >
              <option value="">{loc.ttsSelectPlaceholder}</option>
              {speakers.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            {guildDefaultSpeaker && (
              <>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  disabled={saving || playingId !== null}
                  onClick={() => void playPreview(guildDefaultSpeaker.speakerId)}
                >
                  {playingId === guildDefaultSpeaker.speakerId ? loc.ttsPlayingPreview : loc.panelPreview}
                </Button>
                <Button
                  size="icon"
                  type="button"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => void clearDefaultSpeaker()}
                  aria-label={loc.panelReset}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        ) : (
          <p className="text-xs text-[#80848e]">{loc.ttsSpeakerListUnavailable}</p>
        )}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="flex items-center justify-center gap-1.5 rounded-md bg-[#5865f2] px-3 py-2 text-xs font-medium text-white hover:bg-[#4752c4] disabled:opacity-40"
      >
        <Save className="h-3 w-3" />
        {saving ? loc.saving : loc.saveChanges}
      </button>
    </div>
  );
}

export function TtsSettingsAction({ guildId }: { guildId: string }) {
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
          <TtsChannelSettingsCard guildId={guildId} />
        </SettingsModal>
      )}
    </>
  );
}
