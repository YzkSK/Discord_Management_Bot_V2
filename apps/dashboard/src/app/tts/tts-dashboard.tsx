"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { isGuildLanguage } from "@discord-bot/shared";
import type { GuildLanguage } from "@discord-bot/shared";
import {
  BookOpen,
  Mic2,
  Settings,
  Volume2
} from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";
import { ErrorAlert } from "../../components/error-alert";

const UI_LANG_KEY = "dashboard-ui-lang";
import { LoadingSpinner } from "../../components/loading-spinner";
import { useDashboardData } from "../../hooks/use-dashboard-data";
import { DictionaryTable, type TtsDictionaryEntry } from "./components/DictionaryTable";
import { UserSpeakerTable, type TtsUserSpeaker } from "./components/UserSpeakerTable";
import { usePreviewAudio } from "./components/usePreviewAudio";
import { TtsUserPersonalCard } from "./components/TtsUserPersonalCard";

interface TtsResponse {
  accessRole: string;
  dictionaryEntries: TtsDictionaryEntry[];
  dictionaryStats: {
    disabledCount: number;
    enabledCount: number;
    guildCount: number;
    totalCount: number;
    userCount: number;
  };
  guildDefaultSpeaker: {
    speakerId: number;
    updatedAt: string;
  } | null;
  guildId: string;
  isConfigured: boolean;
  ttsTextChannelId: string | null;
  userSpeakerCount: number;
  userSpeakers: TtsUserSpeaker[];
}

export function TtsDashboard({ guildId, role }: { guildId: string; role?: "viewer" | "admin" | "owner" | null }) {
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");
  const loc = getDashboardLocale(uiLang);
  const { data, loading, error, reload: refresh } = useDashboardData(
    () => fetchTtsSummary(guildId),
    [guildId],
    "TTS request failed"
  );
  const [speakerMap, setSpeakerMap] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    const stored = localStorage.getItem(UI_LANG_KEY);
    if (stored !== null && isGuildLanguage(stored)) setUiLang(stored);
    else setUiLang(detectBrowserLanguage());
    void fetch(`/api/panel/speakers?guildId=${encodeURIComponent(guildId)}`)
      .then((r) => r.ok ? r.json() as Promise<{ speakers: { id: number; label: string }[] }> : Promise.resolve({ speakers: [] }))
      .then(({ speakers }) => setSpeakerMap(new Map(speakers.map((s) => [s.id, s.label]))));
  }, [guildId]);

  if (loading) return <LoadingSpinner />;

  if (!data) {
    return <ErrorAlert message={error ?? loc.failedToLoadSettings} onRetry={refresh} />;
  }

  const isAdmin = role === "admin" || role === "owner";

  return (
    <section className="grid max-w-6xl gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <TtsMetric
          icon={<Mic2 className="h-4 w-4 text-[#c9cdfb]" />}
          label={loc.ttsSpeakerDefault}
          value={data.guildDefaultSpeaker
            ? (speakerMap.get(data.guildDefaultSpeaker.speakerId) ?? `#${data.guildDefaultSpeaker.speakerId}`)
            : "-"}
        />
        <TtsMetric
          icon={<Volume2 className="h-4 w-4 text-[#c9cdfb]" />}
          label={loc.ttsUserSpeakers}
          value={data.userSpeakerCount.toString()}
        />
        <TtsMetric
          icon={<BookOpen className="h-4 w-4 text-[#c9cdfb]" />}
          label={loc.ttsDictionaryEntries}
          value={data.dictionaryStats.totalCount.toString()}
        />
      </div>

      {/* 個人設定セクション */}
      <div>
        {isAdmin && (
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#80848e]">個人設定</p>
        )}
        <TtsUserPersonalCard guildId={guildId} guildDefaultSpeakerId={data.guildDefaultSpeaker?.speakerId ?? null} />
      </div>

      {/* サーバー設定セクション（admin/owner のみ） */}
      {isAdmin && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#80848e]">サーバー設定</p>
          <div className="grid gap-4 xl:grid-cols-[.85fr_1.15fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-[#c9cdfb]" />
                  {loc.ttsSettings}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <KeyValue
                  label={loc.ttsSourceChannel}
                  value={data.ttsTextChannelId ?? "-"}
                />
                <KeyValue
                  label={loc.ttsSpeakerDefault}
                  value={data.guildDefaultSpeaker
                    ? (speakerMap.get(data.guildDefaultSpeaker.speakerId) ?? `#${data.guildDefaultSpeaker.speakerId}`)
                    : "-"}
                />
                {data.guildDefaultSpeaker && (
                  <GuildDefaultSpeakerPreview speakerId={data.guildDefaultSpeaker.speakerId} />
                )}
                <KeyValue
                  label={loc.ttsEnabledDictionaryEntries}
                  value={data.dictionaryStats.enabledCount.toString()}
                />
                <KeyValue
                  label={loc.ttsDisabledDictionaryEntries}
                  value={data.dictionaryStats.disabledCount.toString()}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#c9cdfb]" />
                  {loc.ttsDictionaryEntries}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <DictionaryTable entries={data.dictionaryEntries} loc={loc} />
                <div className="border-t border-[#1e1f22] pt-4">
                  <p className="mb-2 text-xs font-medium text-[#b5bac1]">新しい単語を登録（サーバー辞書）</p>
                  <DictionaryAddForm guildId={guildId} onSuccess={refresh} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* viewer 向け: サーバー辞書（読み取り専用） */}
      {!isAdmin && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#c9cdfb]" />
                {loc.ttsDictionaryEntries}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DictionaryTable entries={data.dictionaryEntries} loc={loc} />
            </CardContent>
          </Card>
        </div>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-[#c9cdfb]" />
              {loc.ttsUserSpeakers}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UserSpeakerTable loc={loc} userSpeakers={data.userSpeakers} speakerMap={speakerMap} />
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>{loc.voiceSetupShortcuts}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3">
            <TtsShortcut
              body="/setup tts channel:<text channel>"
              href="/settings"
              label={loc.ttsSetupCommand}
            />
            <TtsShortcut
              body="/join /leave /force-join"
              href="/logs?eventName=tts"
              label={loc.ttsVoiceCommands}
            />
            <TtsShortcut
              body="/speaker user speaker_id:<id>"
              href="/settings"
              label={loc.ttsSpeakerDefault}
            />
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function TtsMetric({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-[#1e1f22] bg-[#2b2d31] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-[#b5bac1]">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold text-[#f2f3f5]">{value}</p>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#1e1f22] pb-2 last:border-b-0 last:pb-0">
      <p className="text-sm text-[#b5bac1]">{label}</p>
      <p className="break-all text-right font-mono text-xs text-[#dbdee1]">
        {value}
      </p>
    </div>
  );
}

function GuildDefaultSpeakerPreview({ speakerId }: { speakerId: number }) {
  const { playingId, playPreview } = usePreviewAudio();
  const playing = playingId === speakerId;

  return (
    <Button
      className="w-full"
      disabled={playingId !== null}
      onClick={() => void playPreview(speakerId)}
      size="sm"
      type="button"
      variant="outline"
    >
      {playing ? "再生中..." : "サーバーデフォルト話者を試聴"}
    </Button>
  );
}


function DictionaryAddForm({
  guildId,
  onSuccess
}: {
  guildId: string;
  onSuccess: () => void;
}) {
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fromText.trim() || !toText.trim()) return;
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/tts-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "dictionary",
          guildId,
          scope: "guild",
          fromText: fromText.trim(),
          toText: toText.trim(),
          priority: 0,
          isEnabled: true,
          userId: null
        })
      });

      if (!res.ok) {
        const body = await res.json().catch((e: unknown) => {
          console.error("Failed to parse error response", e);
          return {} as { error?: string };
        });
        setFormError(body.error ?? "登録に失敗しました");
        return;
      }

      setFromText("");
      setToText("");
      onSuccess();
    } catch (e: unknown) {
      console.error("Dictionary add failed", e);
      setFormError("登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={(e) => void handleSubmit(e)}>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1">
          <label className="text-xs text-[#b5bac1]" htmlFor="fromText">
            変換前
          </label>
          <input
            className="rounded-md border border-[#3f4147] bg-[#2b2d31] px-3 py-1.5 text-sm text-[#f2f3f5] placeholder:text-[#80848e] focus:outline-none focus:ring-1 focus:ring-[#3f4147]"
            id="fromText"
            onChange={(e) => setFromText(e.target.value)}
            placeholder="例: Discord"
            required
            type="text"
            value={fromText}
          />
        </div>
        <div className="grid gap-1">
          <label className="text-xs text-[#b5bac1]" htmlFor="toText">
            変換後
          </label>
          <input
            className="rounded-md border border-[#3f4147] bg-[#2b2d31] px-3 py-1.5 text-sm text-[#f2f3f5] placeholder:text-[#80848e] focus:outline-none focus:ring-1 focus:ring-[#3f4147]"
            id="toText"
            onChange={(e) => setToText(e.target.value)}
            placeholder="例: ディスコード"
            required
            type="text"
            value={toText}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          disabled={submitting || !fromText.trim() || !toText.trim()}
          size="sm"
          type="submit"
        >
          {submitting ? "登録中..." : "登録"}
        </Button>
      </div>
      {formError && (
        <p className="text-xs text-red-400">{formError}</p>
      )}
    </form>
  );
}


function TtsShortcut({
  body,
  href,
  label
}: {
  body: string;
  href: string;
  label: string;
}) {
  return (
    <a
      className="flex items-start justify-between gap-3 rounded-md border border-[#1e1f22] bg-[#1e1f22] p-3 transition-colors hover:border-[#3f4147] hover:bg-[#2b2d31]"
      href={href}
    >
      <div>
        <p className="text-sm font-medium text-[#dbdee1]">{label}</p>
        <p className="mt-1 break-all font-mono text-xs text-[#b5bac1]">{body}</p>
      </div>
      <Button aria-label={label} size="icon" type="button" variant="ghost">
        <Settings className="h-3.5 w-3.5" />
      </Button>
    </a>
  );
}

async function fetchTtsSummary(guildId: string): Promise<TtsResponse> {
  const query = new URLSearchParams({ guildId });
  const response = await fetch(`/api/tts?${query.toString()}`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Failed to load TTS state (${response.status})`);
  }
  return (await response.json()) as TtsResponse;
}


