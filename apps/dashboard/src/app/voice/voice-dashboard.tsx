"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  Clock,
  ExternalLink,
  Headphones,
  Radio,
  UserRound
} from "lucide-react";
import type { GuildLanguage } from "@discord-bot/shared";

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

interface VoiceTempVoice {
  channelId?: string;
  controlChannelId: string | null;
  creationChannelId: string;
  deleteScheduledAt: string | null;
  ownerId: string;
}

interface VoiceSession {
  channelId: string;
  durationSeconds: number;
  endedAt?: string;
  id: string;
  memberCount: number;
  startedAt: string;
  status: "active" | "ended";
  tempVoice: VoiceTempVoice | null;
}

interface VoiceResponse {
  accessRole: string;
  activeSessions: VoiceSession[];
  guildId: string;
  recentSessions: VoiceSession[];
  tempVoiceChannels: Array<VoiceTempVoice & { channelId: string }>;
}

export function VoiceDashboard({ guildId }: { guildId: string }) {
  const [data, setData] = useState<VoiceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uiLang] = useState<GuildLanguage>(detectBrowserLanguage);
  const loc = getDashboardLocale(uiLang);

  useEffect(() => {
    fetchVoiceSummary(guildId)
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
        {error ?? loc.voiceFailedToLoad}
      </div>
    );
  }

  return (
    <section className="grid max-w-6xl gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <VoiceMetric
          icon={<Radio className="h-4 w-4 text-green-400" />}
          label={loc.voiceActiveCalls}
          value={data.activeSessions.length.toString()}
        />
        <VoiceMetric
          icon={<Headphones className="h-4 w-4 text-green-400" />}
          label={loc.voiceTempVcChannels}
          value={data.tempVoiceChannels.length.toString()}
        />
        <VoiceMetric
          icon={<Activity className="h-4 w-4 text-green-400" />}
          label={loc.voiceRecentCalls}
          value={data.recentSessions.length.toString()}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-green-400" />
              {loc.voiceActiveCalls}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SessionTable
              emptyText={loc.voiceNoActiveCalls}
              loc={loc}
              sessions={data.activeSessions}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-green-400" />
              {loc.voiceTempVcChannels}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TempVoiceTable
              emptyText={loc.voiceNoTempVcChannels}
              loc={loc}
              tempVoiceChannels={data.tempVoiceChannels}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-400" />
            {loc.voiceRecentCalls}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SessionTable
            emptyText={loc.voiceNoRecentCalls}
            loc={loc}
            sessions={data.recentSessions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{loc.voiceSetupShortcuts}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <VoiceShortcut
            body="/setup voice-status channel:<text channel>"
            href="/settings"
            label={loc.voiceStatusSetup}
          />
          <VoiceShortcut
            body="/setup temp-vc create-channel:<voice channel>"
            href="/settings"
            label={loc.tempVcSettings}
          />
        </CardContent>
      </Card>
    </section>
  );
}

function VoiceMetric({
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

function SessionTable({
  emptyText,
  loc,
  sessions
}: {
  emptyText: string;
  loc: ReturnType<typeof getDashboardLocale>;
  sessions: VoiceSession[];
}) {
  return (
    <div className="overflow-hidden rounded-md border border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{loc.voiceChannelId}</TableHead>
            <TableHead>{loc.voiceMembers}</TableHead>
            <TableHead>{loc.voiceDuration}</TableHead>
            <TableHead>{loc.voiceTempVc}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.length === 0 ? (
            <TableRow>
              <TableCell className="py-8 text-center text-zinc-600" colSpan={4}>
                {emptyText}
              </TableCell>
            </TableRow>
          ) : sessions.map((session) => (
            <TableRow key={session.id}>
              <TableCell className="break-all font-mono text-xs">
                {session.channelId}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1 text-zinc-300">
                  <UserRound className="h-3.5 w-3.5 text-zinc-500" />
                  {session.memberCount}
                </span>
              </TableCell>
              <TableCell>{formatDuration(session.durationSeconds)}</TableCell>
              <TableCell>
                <Badge variant={session.tempVoice ? "success" : "outline"}>
                  {session.tempVoice ? loc.configured : loc.notConfigured}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TempVoiceTable({
  emptyText,
  loc,
  tempVoiceChannels
}: {
  emptyText: string;
  loc: ReturnType<typeof getDashboardLocale>;
  tempVoiceChannels: Array<VoiceTempVoice & { channelId: string }>;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{loc.voiceChannelId}</TableHead>
            <TableHead>{loc.voiceOwnerId}</TableHead>
            <TableHead>{loc.voiceControlChannelId}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tempVoiceChannels.length === 0 ? (
            <TableRow>
              <TableCell className="py-8 text-center text-zinc-600" colSpan={3}>
                {emptyText}
              </TableCell>
            </TableRow>
          ) : tempVoiceChannels.map((tempVoice) => (
            <TableRow key={tempVoice.channelId}>
              <TableCell className="break-all font-mono text-xs">
                {tempVoice.channelId}
              </TableCell>
              <TableCell className="break-all font-mono text-xs">
                {tempVoice.ownerId}
              </TableCell>
              <TableCell className="break-all font-mono text-xs">
                {tempVoice.controlChannelId ?? "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function VoiceShortcut({
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
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>
    </a>
  );
}

async function fetchVoiceSummary(guildId: string): Promise<VoiceResponse> {
  const query = new URLSearchParams({ guildId });
  const response = await fetch(`/api/voice?${query.toString()}`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Failed to load voice state (${response.status})`);
  }
  return (await response.json()) as VoiceResponse;
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function toErrorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Voice request failed";
}
