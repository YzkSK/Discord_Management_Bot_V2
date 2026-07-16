"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { BookOpen, Mic2, Users } from "lucide-react";
import type { GuildLanguage } from "@discord-bot/shared";
import { isGuildLanguage } from "@discord-bot/shared";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Skeleton } from "../../components/ui/skeleton";
import { getDashboardLocale, detectBrowserLanguage } from "../../lib/locale";
import type { DashboardLoc } from "../settings/components/shared";

const UI_LANG_KEY = "dashboard-ui-lang";

interface VoicevoxSpeaker {
  id: number;
  label: string;
}

interface SpeakerSetting {
  speakerId: number;
}

interface DictionaryEntry {
  fromText: string;
  toText: string;
}

interface DiscordChannel {
  id: string;
  name: string;
}

const input =
  "w-full rounded-md border border-[#3f4147] bg-[#383a40] px-3 py-1.5 text-sm text-[#f2f3f5] placeholder-[#4e5058] focus:border-[#5865f2] focus:outline-none";

const labelCls = "text-xs font-medium text-[#b5bac1]";

function Field({ labelText, children }: { labelText: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className={labelCls}>{labelText}</p>
      {children}
    </div>
  );
}

export function PanelDashboard({ guildId }: { guildId: string }) {
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");

  useEffect(() => {
    const stored = localStorage.getItem(UI_LANG_KEY);
    if (stored !== null && isGuildLanguage(stored)) setUiLang(stored);
    else setUiLang(detectBrowserLanguage());
  }, []);

  const loc = getDashboardLocale(uiLang);

  return (
    <div className="flex flex-col gap-4">
      <SpeakerPanel guildId={guildId} loc={loc} />
      <DictionaryPanel guildId={guildId} loc={loc} />
      <RecruitmentPanel guildId={guildId} loc={loc} />
    </div>
  );
}

function SpeakerPanel({ guildId, loc }: { guildId: string; loc: DashboardLoc }) {
  const [setting, setSetting] = useState<SpeakerSetting | null>(null);
  const [speakers, setSpeakers] = useState<VoicevoxSpeaker[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/panel/speaker?guildId=${guildId}`).then(
        (r) => r.json() as Promise<{ setting: SpeakerSetting | null }>
      ),
      fetch(`/api/panel/speakers?guildId=${guildId}`).then(
        (r) => r.json() as Promise<{ speakers: VoicevoxSpeaker[] }>
      )
    ])
      .then(([settingData, speakersData]) => {
        const list = speakersData.speakers ?? [];
        setSpeakers(list);
        setSetting(settingData.setting);
        if (settingData.setting) {
          setSelectedId(String(settingData.setting.speakerId));
        } else {
          const first = list[0];
          if (first) setSelectedId(String(first.id));
        }
      })
      .catch((e: unknown) => { console.error("panel-dashboard: load failed", e); toast.error(loc.panelDataLoadFailed); })
      .finally(() => setLoading(false));
  }, [guildId]); // eslint-disable-line react-hooks/exhaustive-deps

  function currentLabel() {
    if (!setting) return loc.panelServerDefault;
    const found = speakers.find((s) => s.id === setting.speakerId);
    return found ? found.label : `ID ${setting.speakerId}`;
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const speakerId = parseInt(selectedId, 10);
    if (!Number.isFinite(speakerId) || speakerId < 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/panel/speaker", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guildId, speakerId })
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? loc.panelSaveFailed);
        return;
      }
      const data = (await res.json()) as { setting: SpeakerSetting };
      setSetting(data.setting);
      toast.success(loc.panelSpeakerChanged);
    } catch {
      toast.error(loc.panelCommunicationError);
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      await fetch("/api/panel/speaker", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guildId })
      });
      setSetting(null);
      const first = speakers[0];
      if (first) setSelectedId(String(first.id));
      toast.success(loc.panelSpeakerReset);
    } catch {
      toast.error(loc.panelCommunicationError);
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    if (!selectedId) return;
    const res = await fetch(`/api/tts/preview?speakerId=${selectedId}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    new Audio(url).play();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#f2f3f5]">
          <Mic2 className="h-4 w-4 text-[#c9cdfb]" />
          {loc.panelTtsSpeakerSettings}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-8 w-24" />
          </div>
        ) : (
          <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-3">
            <p className={labelCls}>
              {loc.panelCurrentSetting}{" "}
              <span className="text-[#dbdee1]">{currentLabel()}</span>
            </p>
            <Field labelText={loc.panelSelectSpeaker}>
              {speakers.length > 0 ? (
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className={input}
                >
                  {speakers.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  min={0}
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  placeholder={loc.panelSpeakerIdPlaceholder}
                  className={input}
                />
              )}
            </Field>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handlePreview()}
                disabled={!selectedId}
              >
                {loc.panelPreview}
              </Button>
              <Button type="submit" size="sm" disabled={saving || !selectedId}>
                {saving ? loc.panelSavingEllipsis : loc.panelChange}
              </Button>
              {setting && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleClear()}
                  disabled={saving}
                >
                  {loc.panelReset}
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function DictionaryPanel({ guildId, loc }: { guildId: string; loc: DashboardLoc }) {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDeleteFrom, setPendingDeleteFrom] = useState<string | null>(null);

  const loadEntries = useCallback(() => {
    setLoading(true);
    fetch(`/api/panel/dictionary?guildId=${guildId}`)
      .then((r) => r.json() as Promise<{ entries: DictionaryEntry[] }>)
      .then((data) => setEntries(data.entries ?? []))
      .catch((e: unknown) => { console.error("panel-dashboard: load failed", e); toast.error(loc.panelDataLoadFailed); })
      .finally(() => setLoading(false));
  }, [guildId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!fromText.trim() || !toText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/panel/dictionary", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guildId, fromText: fromText.trim(), toText: toText.trim() })
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? loc.panelRegistrationFailed);
        return;
      }
      setFromText("");
      setToText("");
      toast.success(loc.panelRegistered);
      loadEntries();
    } catch {
      toast.error(loc.panelCommunicationError);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(from: string) {
    try {
      await fetch("/api/panel/dictionary", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guildId, fromText: from })
      });
      loadEntries();
    } catch {
      toast.error(loc.panelDeleteFailed);
    }
  }

  return (
    <>
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#f2f3f5]">
          <BookOpen className="h-4 w-4 text-[#c9cdfb]" />
          {loc.panelPersonalDictionary}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={(e) => void handleAdd(e)} className="flex flex-col gap-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <Field labelText={loc.panelBeforeConversion}>
              <input
                type="text"
                value={fromText}
                onChange={(e) => setFromText(e.target.value)}
                placeholder={loc.panelExampleBefore}
                className={input}
              />
            </Field>
            <span className="pb-1.5 text-[#b5bac1]">→</span>
            <Field labelText={loc.panelAfterConversion}>
              <input
                type="text"
                value={toText}
                onChange={(e) => setToText(e.target.value)}
                placeholder={loc.panelExampleAfter}
                className={input}
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={saving || !fromText.trim() || !toText.trim()}
            >
              {saving ? loc.panelRegistering : loc.panelAdd}
            </Button>
          </div>
        </form>

        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-[#b5bac1]">{loc.panelNoDictionaryEntries}</p>
        ) : (
          <div className="rounded-md border border-[#1e1f22]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e1f22] text-left">
                  <th className="px-3 py-2 text-xs font-medium text-[#b5bac1]">{loc.panelBeforeConversion}</th>
                  <th className="px-3 py-2 text-xs font-medium text-[#b5bac1]">{loc.panelAfterConversion}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.fromText}
                    className="border-b border-[#1e1f22]/50 last:border-0"
                  >
                    <td className="px-3 py-2 font-mono text-sm text-[#dbdee1]">
                      {entry.fromText}
                    </td>
                    <td className="px-3 py-2 font-mono text-sm text-[#dbdee1]">
                      {entry.toText}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setPendingDeleteFrom(entry.fromText)}
                        className="text-xs text-[#b5bac1] hover:text-red-400"
                      >
                        {loc.panelDelete}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>

    {pendingDeleteFrom && (
      <ConfirmDialog
        title={loc.panelConfirmDeleteTitle}
        description={loc.panelConfirmDeleteDesc({ from: pendingDeleteFrom })}
        onConfirm={() => {
          void handleDelete(pendingDeleteFrom);
          setPendingDeleteFrom(null);
        }}
        onCancel={() => setPendingDeleteFrom(null)}
      />
    )}
    </>
  );
}

function RecruitmentPanel({ guildId, loc }: { guildId: string; loc: DashboardLoc }) {
  const [configChannelId, setConfigChannelId] = useState<string | null>(null);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [configLoading, setConfigLoading] = useState(true);

  const [genre, setGenre] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [content, setContent] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setConfigLoading(true);
    fetch(`/api/panel/recruitment?guildId=${guildId}`)
      .then(
        (r) =>
          r.json() as Promise<{
            channelId: string | null;
            channels: DiscordChannel[] | null;
          }>
      )
      .then((data) => {
        setConfigChannelId(data.channelId);
        const list = data.channels ?? [];
        setChannels(list);
        const firstCh = list[0];
        if (firstCh) setSelectedChannelId(firstCh.id);
      })
      .catch((e: unknown) => { console.error("panel-dashboard: load failed", e); toast.error(loc.panelDataLoadFailed); })
      .finally(() => setConfigLoading(false));
  }, [guildId]); // eslint-disable-line react-hooks/exhaustive-deps

  const needsChannelPicker = !configChannelId;
  const capacityNum = parseInt(capacity, 10);
  const capacityInvalid = capacity !== "" && (isNaN(capacityNum) || capacityNum < 1 || capacityNum > 99);
  const deadlineDaysNum = parseInt(deadlineDays, 10);
  const deadlineDaysInvalid = deadlineDays.trim() !== "" && (isNaN(deadlineDaysNum) || deadlineDaysNum < 1 || deadlineDaysNum > 30);

  const canSubmit =
    genre.trim() &&
    content.trim() &&
    !capacityInvalid &&
    !deadlineDaysInvalid &&
    (!needsChannelPicker || selectedChannelId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cap = parseInt(capacity, 10);
    if (!genre.trim() || !content.trim() || !Number.isFinite(cap) || cap < 1 || cap > 99) {
      toast.error(loc.panelFillAllFieldsCapacity);
      return;
    }
    if (needsChannelPicker && !selectedChannelId) {
      toast.error(loc.panelSelectChannelPrompt);
      return;
    }
    setSubmitting(true);
    try {
      const deadlineDaysParsed = deadlineDays.trim() === ""
        ? undefined
        : parseInt(deadlineDays.trim(), 10);
      if (deadlineDaysParsed !== undefined && (isNaN(deadlineDaysParsed) || deadlineDaysParsed < 1 || deadlineDaysParsed > 30)) {
        toast.error(loc.panelDeadlineRangeError);
        return;
      }

      const body: Record<string, unknown> = {
        guildId,
        genre: genre.trim(),
        capacity: cap,
        content: content.trim()
      };
      if (deadlineDaysParsed !== undefined) body.deadlineDays = deadlineDaysParsed;
      if (needsChannelPicker) body.channelId = selectedChannelId;

      const res = await fetch("/api/panel/recruitment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? loc.panelCreationFailed);
        return;
      }
      setGenre("");
      setCapacity("4");
      setContent("");
      setDeadlineDays("");
      toast.success(loc.panelRecruitmentCreated);
    } catch {
      toast.error(loc.panelCommunicationError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#f2f3f5]">
          <Users className="h-4 w-4 text-[#c9cdfb]" />
          {loc.panelCreateRecruitment}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {configLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-8 w-28" />
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
            {needsChannelPicker && (
              <Field labelText={loc.panelPostChannel}>
                {channels.length > 0 ? (
                  <select
                    value={selectedChannelId}
                    onChange={(e) => setSelectedChannelId(e.target.value)}
                    className={input}
                  >
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>
                        # {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-red-400">
                    {loc.panelChannelListError}
                  </p>
                )}
              </Field>
            )}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className={labelCls}>{loc.panelTitle}</p>
                <span className={`text-xs tabular-nums ${genre.length >= 80 ? "text-red-400" : "text-[#b5bac1]"}`}>
                  {genre.length}/80
                </span>
              </div>
              <input
                type="text"
                maxLength={80}
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder={loc.panelExampleTitle}
                className={input}
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className={labelCls}>{loc.panelCapacity}</p>
              <input
                type="number"
                min={1}
                max={99}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className={`${input} w-24 ${capacityInvalid ? "border-red-500" : ""}`}
              />
              {capacityInvalid && <p className="text-xs text-red-400">{loc.panelCapacityError}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className={labelCls}>{loc.panelContent}</p>
                <span className={`text-xs tabular-nums ${content.length >= 1000 ? "text-red-400" : "text-[#b5bac1]"}`}>
                  {content.length}/1000
                </span>
              </div>
              <textarea
                maxLength={1000}
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={loc.panelContentPlaceholder}
                className={input}
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className={labelCls}>{loc.panelDeadline}</p>
              <input
                type="number"
                min={1}
                max={30}
                value={deadlineDays}
                onChange={(e) => setDeadlineDays(e.target.value)}
                placeholder={loc.panelDeadlinePlaceholder}
                className={`${input} w-24 ${deadlineDaysInvalid ? "border-red-500" : ""}`}
              />
              {deadlineDaysInvalid && <p className="text-xs text-red-400">{loc.panelDeadlineError}</p>}
            </div>
            <div>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || !canSubmit}
                title={!canSubmit ? loc.panelFillAllFields : undefined}
              >
                {submitting ? loc.panelCreating : loc.panelCreateButton}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
