"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isGuildLanguage } from "@discord-bot/shared";
import type { GuildLanguage } from "@discord-bot/shared";
import { Crown, Mic2, Timer, Users } from "lucide-react";
import { UserMention } from "../../components/user-mention";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";

const UI_LANG_KEY = "dashboard-ui-lang";
import { LoadingSpinner } from "../../components/loading-spinner";

const CLOCK_REFRESH_MS = 1_000;
const DATA_REFRESH_MS = 5 * 60 * 1_000;
import { ErrorAlert } from "../../components/error-alert";
import { useDashboardData } from "../../hooks/use-dashboard-data";
import { useVoiceRealtime } from "./hooks/use-voice-realtime";

interface VoiceTempVoice {
  channelId?: string;
  controlChannelId: string | null;
  creationChannelId: string;
  deleteScheduledAt: string | null;
  ownerId: string;
}

interface VoiceSession {
  channelId: string;
  channelName?: string;
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
  tempVoiceChannels: Array<VoiceTempVoice & { channelId: string; channelName?: string }>;
}

async function fetchVoiceData(guildId: string): Promise<VoiceResponse> {
  const query = new URLSearchParams({ guildId });
  const r = await fetch(`/api/voice?${query.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed to load voice state (${r.status})`);
  return (await r.json()) as VoiceResponse;
}

export function VoiceDashboard({ guildId }: { guildId: string }) {
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");
  const [now, setNow] = useState(() => new Date());
  const loc = getDashboardLocale(uiLang);
  const { data, loading, error, reload } = useDashboardData(
    () => fetchVoiceData(guildId),
    [guildId],
    "Voice request failed"
  );
  const stableReload = useCallback(() => reload(), [reload]);
  useVoiceRealtime(guildId, stableReload);

  useEffect(() => {
    const stored = localStorage.getItem(UI_LANG_KEY);
    if (stored !== null && isGuildLanguage(stored)) setUiLang(stored);
    else setUiLang(detectBrowserLanguage());
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), CLOCK_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => stableReload(), DATA_REFRESH_MS);
    return () => clearInterval(id);
  }, [stableReload]);

  const peakData = useMemo(() => {
    const bins = Array.from({ length: 24 }, (_, h) => ({
      hour: loc.voiceHourLabel({ h }),
      count: 0,
    }));
    (data?.recentSessions ?? []).forEach((s) => {
      const h = new Date(s.startedAt).getHours();
      if (bins[h]) bins[h].count++;
    });
    return bins;
  }, [data]);

  if (loading) return <LoadingSpinner />;

  if (!data) {
    return <ErrorAlert message={error ?? loc.voiceFailedToLoad} onRetry={reload} retryLabel={loc.retry} />;
  }

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      {/* サマリー */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: loc.voiceActiveCalls,
            value: data.activeSessions.length,
            icon: <Mic2 className="h-4 w-4" />,
          },
          {
            label: loc.voiceTempVcChannels,
            value: data.tempVoiceChannels.length,
            icon: <Users className="h-4 w-4" />,
          },
          {
            label: loc.voiceRecentCalls,
            value: data.recentSessions.length,
            icon: <Timer className="h-4 w-4" />,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-[#1e1f22] bg-[#2b2d31] shadow-sm p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#b5bac1]">{kpi.label}</p>
              <span className="text-[#b5bac1]">{kpi.icon}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-[#f2f3f5]">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* アクティブセッション */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[#b5bac1]">
            {loc.voiceActiveCalls}
          </h2>
          <span className="relative flex h-2 w-2" title={loc.voiceRealtimeUpdate}>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-[50%] bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-[50%] bg-[#5865f2]" />
          </span>
        </div>
        {data.activeSessions.length === 0 ? (
          <div className="rounded-xl border border-[#1e1f22] bg-[#2b2d31] shadow-sm py-10 text-center text-sm text-[#80848e]">
            {loc.voiceNoActiveCalls}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.activeSessions.map((s) => {
              const elapsedSeconds = Math.max(
                0,
                Math.floor((now.getTime() - new Date(s.startedAt).getTime()) / 1000)
              );
              return (
                <div
                  key={s.id}
                  className="rounded-xl border border-[#1e1f22] bg-[#2b2d31] shadow-sm p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-[50%] bg-purple-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-[50%] bg-purple-500" />
                    </span>
                    <span className="truncate text-sm font-medium text-[#dbdee1]">
                      {s.channelName ?? `#${s.channelId}`}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-[#b5bac1]">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {s.memberCount}{loc.personUnit}
                    </span>
                    <span className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {formatDuration(elapsedSeconds)}
                    </span>
                  </div>
                  {s.tempVoice && (
                    <p className="mt-1.5 text-xs text-purple-400">Temp VC</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 一時 VC */}
      {data.tempVoiceChannels.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[#b5bac1]">
            {loc.voiceTempVcChannels}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.tempVoiceChannels.map((vc) => (
              <div
                key={vc.channelId}
                className="rounded-xl border border-[#1e1f22] bg-[#2b2d31] shadow-sm p-4"
              >
                <p className="truncate text-sm font-medium text-[#dbdee1]">
                  {vc.channelName ?? `#${vc.channelId}`}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-[#b5bac1]">
                  <Crown className="h-3 w-3 text-yellow-500" />
                  <UserMention userId={vc.ownerId} actorName={null} />
                </div>
                {vc.deleteScheduledAt && (
                  <p className="mt-1 text-xs text-amber-500/70">
                    {renderDeleteScheduled(new Date(vc.deleteScheduledAt), now, loc)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Peak hours chart */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-[#b5bac1]">
          {loc.voicePeakHours}
        </h2>
        <div className="rounded-xl border border-[#1e1f22] bg-[#2b2d31] shadow-sm p-4">
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={peakData}>
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "var(--chart-axis-tick)" }}
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--chart-axis-tick)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--chart-tooltip-bg)",
                  border: "1px solid var(--chart-tooltip-border)",
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--chart-tooltip-label)" }}
              />
              <Bar dataKey="count" fill="var(--chart-purple)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function renderDeleteScheduled(deleteAt: Date, now: Date, loc: ReturnType<typeof getDashboardLocale>): string {
  const diffSeconds = Math.floor((deleteAt.getTime() - now.getTime()) / 1000);
  if (diffSeconds > 0) {
    return loc.voiceDeletionIn({ seconds: diffSeconds });
  }
  return loc.voiceDeletionPending;
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  return hours > 0
    ? `${hours}:${mm}:${ss}`
    : `${mm}:${ss}`;
}
