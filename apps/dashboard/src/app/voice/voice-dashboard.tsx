"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GuildLanguage } from "@discord-bot/shared";
import { Crown, Mic2, Save, Timer, Users } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";
import { LoadingSpinner } from "../../components/loading-spinner";
import { fetchSettings, updateTempVcSettings, toSettingsError, type SettingsResponse } from "../../lib/settings-api";
import { VoiceSettingsTab } from "../settings/components/VoiceSettingsTab";

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

export function VoiceDashboard({ guildId, role }: { guildId: string; role: "admin" | "owner" }) {
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
    setUiLang(detectBrowserLanguage());
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
      hour: `${h}時`,
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
    return <ErrorAlert message={error ?? loc.voiceFailedToLoad} />;
  }

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <VoiceSettingsCard guildId={guildId} />
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
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-400">
            {loc.voiceActiveCalls}
          </h2>
          <span className="relative flex h-2 w-2" title="リアルタイム更新">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-[50%] bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-[50%] bg-green-500" />
          </span>
        </div>
        {data.activeSessions.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 py-10 text-center text-sm text-zinc-600">
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
                  className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-[50%] bg-purple-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-[50%] bg-purple-500" />
                    </span>
                    <span className="truncate text-sm font-medium text-zinc-200">
                      {s.channelName ?? `#${s.channelId}`}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {s.memberCount}人
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
                  {vc.channelName ?? `#${vc.channelId}`}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
                  <Crown className="h-3 w-3 text-yellow-500" />
                  <span className="font-mono">{vc.ownerId}</span>
                </div>
                {vc.deleteScheduledAt && (
                  <p className="mt-1 text-xs text-amber-500/70">
                    {renderDeleteScheduled(new Date(vc.deleteScheduledAt), now)}
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

function VoiceSettingsCard({ guildId }: { guildId: string }) {
  const [settingsData, setSettingsData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createChannelId, setCreateChannelId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const loc = getDashboardLocale(detectBrowserLanguage());

  useEffect(() => {
    setLoading(true);
    fetchSettings(guildId)
      .then((s) => {
        setSettingsData(s);
        setCreateChannelId(s.features.tempVc.createChannelId ?? "");
        setCategoryId(s.features.tempVc.categoryId ?? "");
      })
      .catch((e: unknown) => setError(toSettingsError(e)))
      .finally(() => setLoading(false));
  }, [guildId]);

  if (loading) return null;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateTempVcSettings(guildId, createChannelId, categoryId);
    } catch (e) {
      setError(toSettingsError(e));
    } finally {
      setSaving(false);
    }
  }

  if (!settingsData) return null;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-zinc-300">{loc.tempVcSettings}</p>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"
        >
          <Save className="h-3 w-3" />
          {saving ? loc.saving : "保存"}
        </button>
      </div>
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
      <VoiceSettingsTab
        tempVcCreateChannelId={createChannelId}
        tempVcCategoryId={categoryId}
        settings={settingsData}
        loc={loc}
        onTempVcCreateChannelIdChange={setCreateChannelId}
        onTempVcCategoryIdChange={setCategoryId}
      />
    </div>
  );
}

function renderDeleteScheduled(deleteAt: Date, now: Date): string {
  const diffSeconds = Math.floor((deleteAt.getTime() - now.getTime()) / 1000);
  if (diffSeconds > 0) {
    return `あと${diffSeconds}秒で削除`;
  }
  return "削除保留中";
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
