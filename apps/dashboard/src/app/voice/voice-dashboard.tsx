"use client";

import { useEffect, useMemo, useState } from "react";
import type { GuildLanguage } from "@discord-bot/shared";
import { Crown, Mic2, Timer, Users } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";
import { formatRelativeTime } from "../../lib/event-display";
import { ErrorAlert } from "../../components/error-alert";
import { useDashboardData } from "../../hooks/use-dashboard-data";

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

async function fetchVoiceData(guildId: string): Promise<VoiceResponse> {
  const query = new URLSearchParams({ guildId });
  const r = await fetch(`/api/voice?${query.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed to load voice state (${r.status})`);
  return (await r.json()) as VoiceResponse;
}

export function VoiceDashboard({ guildId }: { guildId: string }) {
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");
  const loc = getDashboardLocale(uiLang);
  const { data, loading, error } = useDashboardData(
    () => fetchVoiceData(guildId),
    [guildId],
    "Voice request failed"
  );

  useEffect(() => {
    setUiLang(detectBrowserLanguage());
  }, []);


  const peakData = useMemo(() => {
    const bins = Array.from({ length: 24 }, (_, h) => ({
      hour: `${h}時`,
      count: 0,
    }));
    (data?.recentSessions ?? []).forEach((s) => {
      const h = new Date(s.startedAt).getHours();
      if (bins[h]) bins[h].count++;
    });
    return bins;
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-zinc-600">
        読み込み中...
      </div>
    );
  }

  if (!data) {
    return <ErrorAlert message={error ?? loc.voiceFailedToLoad} />;
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
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-500">{kpi.label}</p>
              <span className="text-zinc-500">{kpi.icon}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-zinc-100">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* アクティブセッション */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400">
          {loc.voiceActiveCalls}
        </h2>
        {data.activeSessions.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 py-10 text-center text-sm text-zinc-600">
            {loc.voiceNoActiveCalls}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.activeSessions.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-[50%] bg-purple-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-[50%] bg-purple-500" />
                  </span>
                  <span className="truncate text-sm font-medium text-zinc-200">
                    #{s.channelId}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {s.memberCount}人
                  </span>
                  <span className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {formatDuration(s.durationSeconds)}
                  </span>
                </div>
                {s.tempVoice && (
                  <p className="mt-1.5 text-xs text-purple-400">Temp VC</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 一時 VC */}
      {data.tempVoiceChannels.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-400">
            {loc.voiceTempVcChannels}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.tempVoiceChannels.map((vc) => (
              <div
                key={vc.channelId}
                className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
              >
                <p className="truncate text-sm font-medium text-zinc-200">
                  #{vc.channelId}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
                  <Crown className="h-3 w-3 text-yellow-500" />
                  <span className="font-mono">{vc.ownerId}</span>
                </div>
                {vc.deleteScheduledAt && (
                  <p className="mt-1 text-xs text-zinc-600">
                    削除予定:{" "}
                    {formatRelativeTime(new Date(vc.deleteScheduledAt))}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ピーク時間チャート */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400">
          ピーク時間帯
        </h2>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={peakData}>
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "#71717A" }}
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#71717A" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#18181B",
                  border: "1px solid #3F3F46",
                  fontSize: 12,
                }}
                labelStyle={{ color: "#A1A1AA" }}
              />
              <Bar dataKey="count" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}
