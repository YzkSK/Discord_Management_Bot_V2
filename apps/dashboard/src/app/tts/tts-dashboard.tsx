"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { GuildLanguage } from "@discord-bot/shared";
import {
  BookOpen,
  ExternalLink,
  Mic2,
  Radio,
  Settings,
  Volume2
} from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../../components/ui/table";
import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";

type TtsDictionaryScope = "guild" | "user";

interface TtsDictionaryEntry {
  fromText: string;
  isEnabled: boolean;
  priority: number;
  scope: TtsDictionaryScope;
  toText: string;
  updatedAt: string;
  userId: string | null;
}

interface TtsUserSpeaker {
  speakerId: number;
  updatedAt: string;
  userId: string;
}

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
  const [data, setData] = useState<TtsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uiLang] = useState<GuildLanguage>(detectBrowserLanguage);
  const loc = getDashboardLocale(uiLang);

  useEffect(() => {
    fetchTtsSummary(guildId)
      .then(setData)
      .catch((e: unknown) => setError(toErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [guildId]);

  if (loading) {
    return <p className="text-sm text-zinc-500">{loc.loading}...</p>;
  }

  if (!data) {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {error ?? loc.failedToLoadSettings}
      </div>
    );
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
          <CardContent>
            <DictionaryTable entries={data.dictionaryEntries} loc={loc} />
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

function DictionaryTable({
  entries,
  loc
}: {
  entries: TtsDictionaryEntry[];
  loc: ReturnType<typeof getDashboardLocale>;
}) {
  const visibleEntries = entries.slice(0, 8);

  return (
    <div className="overflow-hidden rounded-md border border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{loc.ttsScope}</TableHead>
            <TableHead>{loc.ttsFromText}</TableHead>
            <TableHead>{loc.ttsToText}</TableHead>
            <TableHead>{loc.ttsPriority}</TableHead>
            <TableHead>{loc.ttsEnabled}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleEntries.length === 0 ? (
            <TableRow>
              <TableCell className="py-8 text-center text-zinc-600" colSpan={5}>
                {loc.ttsDictionaryEntries}: 0
              </TableCell>
            </TableRow>
          ) : visibleEntries.map((entry) => (
            <TableRow key={`${entry.scope}:${entry.userId ?? ""}:${entry.fromText}`}>
              <TableCell>
                <Badge variant="outline">{entry.scope}</Badge>
              </TableCell>
              <TableCell className="break-all font-mono text-xs">
                {entry.fromText}
              </TableCell>
              <TableCell className="break-all font-mono text-xs">
                {entry.toText}
              </TableCell>
              <TableCell>{entry.priority}</TableCell>
              <TableCell>
                <Badge variant={entry.isEnabled ? "success" : "outline"}>
                  {entry.isEnabled ? loc.ttsEnabled : loc.logModeDisabled}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function UserSpeakerTable({
  loc,
  userSpeakers
}: {
  loc: ReturnType<typeof getDashboardLocale>;
  userSpeakers: TtsUserSpeaker[];
}) {
  const visibleSpeakers = userSpeakers.slice(0, 8);

  return (
    <div className="overflow-hidden rounded-md border border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{loc.accessGrantUserId}</TableHead>
            <TableHead>{loc.ttsSpeakerId}</TableHead>
            <TableHead>{loc.updated}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleSpeakers.length === 0 ? (
            <TableRow>
              <TableCell className="py-8 text-center text-zinc-600" colSpan={3}>
                {loc.ttsUserSpeakers}: 0
              </TableCell>
            </TableRow>
          ) : visibleSpeakers.map((speaker) => (
            <TableRow key={speaker.userId}>
              <TableCell className="break-all font-mono text-xs">
                {speaker.userId}
              </TableCell>
              <TableCell>{speaker.speakerId}</TableCell>
              <TableCell className="text-xs text-zinc-500">
                {formatDate(speaker.updatedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function toErrorMessage(e: unknown) {
  return e instanceof Error ? e.message : "TTS request failed";
}
