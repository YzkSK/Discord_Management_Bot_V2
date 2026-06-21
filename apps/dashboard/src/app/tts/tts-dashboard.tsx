"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { GuildLanguage } from "@discord-bot/shared";
import {
  BookOpen,
  Mic2,
  Radio,
  Settings,
  Volume2
} from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";
import { ErrorAlert } from "../../components/error-alert";
import { LoadingSpinner } from "../../components/loading-spinner";
import { useDashboardData } from "../../hooks/use-dashboard-data";
import { DictionaryTable, type TtsDictionaryEntry } from "./components/DictionaryTable";
import { UserSpeakerTable, type TtsUserSpeaker } from "./components/UserSpeakerTable";
import { usePreviewAudio } from "./components/usePreviewAudio";

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

export function TtsDashboard({ guildId }: { guildId: string }) {
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");
  const loc = getDashboardLocale(uiLang);
  const { data, loading, error, reload: refresh } = useDashboardData(
    () => fetchTtsSummary(guildId),
    [guildId],
    "TTS request failed"
  );

  useEffect(() => {
    setUiLang(detectBrowserLanguage());
  }, []);

  if (loading) return <LoadingSpinner />;

  if (!data) {
    return <ErrorAlert message={error ?? loc.failedToLoadSettings} onRetry={refresh} />;
  }

  return (
    <section className="grid max-w-6xl gap-4">
      <div className="grid gap-3 md:grid-cols-4">
        <TtsMetric
          icon={<Radio className="h-4 w-4 text-green-400" />}
          label={loc.ttsStatus}
          value={
            data.isConfigured
              ? loc.ttsConfiguredStatus
              : loc.ttsNotConfiguredStatus
          }
        />
        <TtsMetric
          icon={<Mic2 className="h-4 w-4 text-green-400" />}
          label={loc.ttsSpeakerDefault}
          value={data.guildDefaultSpeaker?.speakerId.toString() ?? "-"}
        />
        <TtsMetric
          icon={<Volume2 className="h-4 w-4 text-green-400" />}
          label={loc.ttsUserSpeakers}
          value={data.userSpeakerCount.toString()}
        />
        <TtsMetric
          icon={<BookOpen className="h-4 w-4 text-green-400" />}
          label={loc.ttsDictionaryEntries}
          value={data.dictionaryStats.totalCount.toString()}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-green-400" />
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
              value={data.guildDefaultSpeaker?.speakerId.toString() ?? "-"}
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
              <BookOpen className="h-4 w-4 text-green-400" />
              {loc.ttsDictionaryEntries}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <DictionaryTable entries={data.dictionaryEntries} loc={loc} />
            {data.accessRole === "admin" && (
              <div className="border-t border-zinc-800 pt-4">
                <p className="mb-2 text-xs font-medium text-zinc-400">新しい単語を登録（サーバー辞書）</p>
                <DictionaryAddForm guildId={guildId} onSuccess={refresh} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-green-400" />
            {loc.ttsUserSpeakers}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UserSpeakerTable loc={loc} userSpeakers={data.userSpeakers} />
        </CardContent>
      </Card>

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
    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-2 last:border-b-0 last:pb-0">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="break-all text-right font-mono text-xs text-zinc-200">
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
  const [priority, setPriority] = useState(0);
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
          priority,
          isEnabled: true,
          userId: null
        })
      });

      if (!res.ok) {
        const body = await res.json().catch((e: unknown) => {
          console.error("Failed to parse error response", e);
          return {} as { error?: string };
        }) as { error?: string };
        setFormError(body.error ?? "登録に失敗しました");
        return;
      }

      setFromText("");
      setToText("");
      setPriority(0);
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
          <label className="text-xs text-zinc-400" htmlFor="fromText">
            変換前
          </label>
          <input
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            id="fromText"
            onChange={(e) => setFromText(e.target.value)}
            placeholder="例: Discord"
            required
            type="text"
            value={fromText}
          />
        </div>
        <div className="grid gap-1">
          <label className="text-xs text-zinc-400" htmlFor="toText">
            変換後
          </label>
          <input
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            id="toText"
            onChange={(e) => setToText(e.target.value)}
            placeholder="例: ディスコード"
            required
            type="text"
            value={toText}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="grid gap-1">
          <label className="text-xs text-zinc-400" htmlFor="priority">
            優先度
          </label>
          <input
            className="w-20 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            id="priority"
            min={0}
            onChange={(e) => setPriority(Number(e.target.value))}
            type="number"
            value={priority}
          />
        </div>
        <Button
          className="mt-4 self-end"
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
      className="flex items-start justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-3 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
      href={href}
    >
      <div>
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        <p className="mt-1 break-all font-mono text-xs text-zinc-500">{body}</p>
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


