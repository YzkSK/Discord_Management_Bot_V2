"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, Save, Trash2, User } from "lucide-react";
import { isGuildLanguage } from "@discord-bot/shared";
import type { GuildLanguage } from "@discord-bot/shared";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { SettingsModal } from "../../../components/settings-modal";
import { usePreviewAudio } from "./usePreviewAudio";
import { detectBrowserLanguage, getDashboardLocale } from "../../../lib/locale";

const UI_LANG_KEY = "dashboard-ui-lang";
type Loc = ReturnType<typeof getDashboardLocale>;

interface PersonalSpeakerSetting {
  speakerId: number;
  updatedAt: string;
}

interface PersonalDictEntry {
  fromText: string;
  isEnabled: boolean;
  priority: number;
  toText: string;
}

interface VoicevoxSpeakerOption {
  id: number;
  label: string;
}

export function PersonalSpeakerSection({ guildId, loc }: { guildId: string; loc: Loc }) {
  const [loading, setLoading] = useState(true);
  const [setting, setSetting] = useState<PersonalSpeakerSetting | null>(null);
  const [speakers, setSpeakers] = useState<VoicevoxSpeakerOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { playingId, playPreview } = usePreviewAudio();

  const load = useCallback(async () => {
    setLoading(true);
    const [speakerRes, listRes] = await Promise.all([
      fetch(`/api/panel/speaker?guildId=${encodeURIComponent(guildId)}`),
      fetch(`/api/panel/speakers?guildId=${encodeURIComponent(guildId)}`),
    ]);
    if (speakerRes.ok) {
      const data = await speakerRes.json() as { setting: PersonalSpeakerSetting | null };
      setSetting(data.setting ?? null);
      setSelectedId(data.setting?.speakerId ?? null);
    }
    if (listRes.ok) {
      const data = await listRes.json() as { speakers: VoicevoxSpeakerOption[] };
      setSpeakers(data.speakers);
    }
    setLoading(false);
  }, [guildId]);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (selectedId === null) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/speaker", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guildId, speakerId: selectedId }),
      });
      if (!res.ok) { setError(loc.panelSaveFailed); return; }
      const data = await res.json() as { setting: PersonalSpeakerSetting };
      setSetting(data.setting);
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    setSaving(true);
    try {
      await fetch("/api/panel/speaker", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guildId }),
      });
      setSetting(null);
      setSelectedId(null);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  const currentLabel = setting
    ? (speakers.find((s) => s.id === setting.speakerId)?.label ?? `ID ${setting.speakerId}`)
    : loc.ttsNotSet;

  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold text-[#dbdee1]">{loc.ttsPersonalSpeakerTitle}</p>
      <p className="text-xs text-[#b5bac1]">{loc.panelCurrentSetting} {currentLabel}</p>
      <div className="flex flex-wrap gap-2">
        {speakers.length > 0 ? (
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
            className="flex-1 rounded-md border border-[#3f4147] bg-[#1e1f22] px-3 py-1.5 text-sm text-[#dbdee1] focus:outline-none focus:ring-1 focus:ring-[#5865f2]/50"
          >
            <option value="">{loc.ttsSelectPlaceholder}</option>
            {speakers.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-[#80848e]">{loc.ttsSpeakerListUnavailable}</p>
        )}
        <Button size="sm" type="button" onClick={() => void save()} disabled={saving || selectedId === null}>
          <Save className="h-3.5 w-3.5" />
          {loc.save}
        </Button>
        {setting && (
          <>
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={saving || playingId !== null}
              onClick={() => void playPreview(setting.speakerId)}
            >
              {playingId === setting.speakerId ? loc.ttsPlayingPreview : loc.panelPreview}
            </Button>
            <Button
              size="icon"
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={() => void clear()}
              aria-label={loc.panelReset}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
      {error && <p className="text-xs text-[#f23f42]">{error}</p>}
    </div>
  );
}

export function PersonalDictionarySection({ guildId, loc }: { guildId: string; loc: Loc }) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<PersonalDictEntry[]>([]);
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/panel/dictionary?guildId=${encodeURIComponent(guildId)}`);
    if (res.ok) {
      const data = await res.json() as { entries: PersonalDictEntry[] };
      setEntries(data.entries);
    }
    setLoading(false);
  }, [guildId]);

  useEffect(() => { void load(); }, [load]);

  async function addEntry(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/dictionary", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guildId, fromText, toText, priority: 0, isEnabled: true }),
      });
      if (!res.ok) { setError(loc.ttsRegisterFailed); return; }
      setFromText("");
      setToText("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteEntry(from: string) {
    await fetch("/api/panel/dictionary", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ guildId, fromText: from }),
    });
    await load();
  }

  if (loading) {
    return (
      <div className="grid gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold text-[#dbdee1]">{loc.ttsPersonalDictTitle}</p>

      {entries.length > 0 ? (
        <div className="divide-y divide-[#1e1f22] overflow-hidden rounded-md border border-[#1e1f22]">
          {entries.map((e) => (
            <div key={e.fromText} className="flex items-center gap-3 px-3 py-2">
              <span className="flex-1 truncate font-mono text-xs text-[#dbdee1]">{e.fromText}</span>
              <span className="shrink-0 text-xs text-[#80848e]">→</span>
              <span className="flex-1 truncate font-mono text-xs text-[#dbdee1]">{e.toText}</span>
              <button
                type="button"
                onClick={() => void deleteEntry(e.fromText)}
                className="shrink-0 rounded p-1 text-[#b5bac1] hover:text-[#f23f42] transition-colors"
                aria-label={`${e.fromText} → ${e.toText}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#80848e]">{loc.ttsNoDictEntries}</p>
      )}

      <form className="grid gap-2 pt-1" onSubmit={(e) => void addEntry(e)}>
        <div className="flex flex-wrap gap-2">
          <input
            value={fromText}
            onChange={(e) => setFromText(e.target.value)}
            placeholder={loc.panelBeforeConversion}
            required
            className="min-w-0 flex-1 rounded-md border border-[#3f4147] bg-[#1e1f22] px-3 py-1.5 text-sm text-[#dbdee1] placeholder:text-[#80848e] focus:outline-none focus:ring-1 focus:ring-[#5865f2]/50"
          />
          <input
            value={toText}
            onChange={(e) => setToText(e.target.value)}
            placeholder={loc.panelAfterConversion}
            required
            className="min-w-0 flex-1 rounded-md border border-[#3f4147] bg-[#1e1f22] px-3 py-1.5 text-sm text-[#dbdee1] placeholder:text-[#80848e] focus:outline-none focus:ring-1 focus:ring-[#5865f2]/50"
          />
          <Button size="sm" type="submit" disabled={submitting || !fromText || !toText}>
            <Plus className="h-3.5 w-3.5" />
            {loc.ttsRegister}
          </Button>
        </div>
        {error && <p className="text-xs text-[#f23f42]">{error}</p>}
      </form>
    </div>
  );
}

export function TtsUserSettingsAction({ guildId }: { guildId: string }) {
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
        className="flex items-center gap-1.5 rounded-md bg-[#383a40] px-3 py-1.5 text-xs font-medium text-[#dbdee1] hover:bg-[#404349] hover:text-[#f2f3f5] transition-colors"
        aria-label={loc.ttsPersonalSettingsTitle}
      >
        <User className="h-3.5 w-3.5" />
        {loc.ttsPersonalSettingsButton}
      </button>
      {open && (
        <SettingsModal onClose={() => setOpen(false)}>
          <div className="grid gap-5">
            <p className="text-sm font-semibold text-[#f2f3f5]">{loc.ttsPersonalSettingsTitle}</p>
            <PersonalSpeakerSection guildId={guildId} loc={loc} />
            <div className="border-t border-[#1e1f22]" />
            <PersonalDictionarySection guildId={guildId} loc={loc} />
          </div>
        </SettingsModal>
      )}
    </>
  );
}
