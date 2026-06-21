"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity, Mic2, Users, Volume2 } from "lucide-react";

import {
  eventColorClasses,
  extractActorName,
  extractChannelName,
  extractVoiceStateChanges,
  formatRelativeTime,
  getEventColor,
} from "../lib/event-display";
import { formatEventDescriptionJSX } from "../lib/format-event-jsx";
import { PanelDashboard } from "./panel/panel-dashboard";
import { LoadingSpinner } from "../components/loading-spinner";

interface VoiceSession {
  channelId: string;
  id: string;
  memberCount: number;
  startedAt: string;
  status: "active" | "ended";
}

interface Recruitment {
  id: string;
  status: string;
}

interface LogItem {
  actorId: string | null;
  channelId: string | null;
  eventName: string;
  id: string;
  payload: unknown;
  receivedAt: string;
}

interface OverviewClientProps {
  guildId: string;
  role?: "viewer" | "admin" | "owner" | null;
}

const kpiDefs = [
  { label: "アクティブ VC", key: "activeVcCount", icon: Mic2, color: "text-indigo-400" },
  { label: "今日のイベント", key: "todayCount", icon: Activity, color: "text-sky-400" },
  { label: "進行中の募集", key: "openRecruitCount", icon: Users, color: "text-emerald-400" },
  { label: "TTS セッション", key: "ttsTodayCount", icon: Volume2, color: "text-violet-400" },
] as const;

export function OverviewClient({ guildId, role }: OverviewClientProps) {
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [recentLogs, setRecentLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        `/api/overview?guildId=${encodeURIComponent(guildId)}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        setError(true);
        return;
      }

      const data = await res.json();
      setSessions(data.sessions ?? []);
      setRecruitments(data.recruitments ?? []);
      setRecentLogs(data.logItems ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeVcCount = sessions.filter((s) => s.status === "active").length;
  const openRecruitCount = recruitments.filter(
    (r) => r.status === "open"
  ).length;

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return recentLogs.filter(
      (l) => new Date(l.receivedAt).toDateString() === today
    ).length;
  }, [recentLogs]);

  const ttsTodayCount = useMemo(() => {
    const today = new Date().toDateString();
    return recentLogs.filter(
      (l) =>
        l.eventName === "tts.session.started" &&
        new Date(l.receivedAt).toDateString() === today
    ).length;
  }, [recentLogs]);

  const sevenDayData = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[`${d.getMonth() + 1}/${d.getDate()}`] = 0;
    }
    recentLogs.forEach((log) => {
      const d = new Date(log.receivedAt);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (key in days) days[key] = (days[key] ?? 0) + 1;
    });
    return Object.entries(days).map(([date, count]) => ({ date, count }));
  }, [recentLogs]);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <p className="text-sm text-slate-500">データの取得に失敗しました</p>
        <button
          onClick={() => void load()}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
        >
          再試行
        </button>
      </div>
    );
  }

  const kpiValues: Record<string, number> = {
    activeVcCount,
    todayCount,
    openRecruitCount,
    ttsTodayCount,
  };

  const isViewer = role === "viewer";

  if (isViewer) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4">
          {[kpiDefs[0], kpiDefs[2]].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm overflow-hidden">
                <div className="h-0.5 bg-indigo-500/30" />
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{kpi.label}</p>
                    <Icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-100">{kpiValues[kpi.key]}</p>
                </div>
              </div>
            );
          })}
        </div>
        <PanelDashboard guildId={guildId} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* 左カラム: KPI + チャート + PanelDashboard */}
      <div className="flex flex-col gap-4 lg:col-span-3">
        {/* KPI カード */}
        <div className="grid grid-cols-2 gap-4">
          {kpiDefs.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm overflow-hidden"
              >
                <div className="h-0.5 bg-indigo-500/30" />
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{kpi.label}</p>
                    <Icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-100">{kpiValues[kpi.key]}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 7日間アクティビティチャート */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm p-4">
          <p className="mb-4 text-sm font-medium text-slate-300">7日間のイベント数</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={sevenDayData}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-indigo)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--chart-indigo)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--chart-axis-tick)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--chart-axis-tick)" }}
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
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--chart-indigo)"
                fill="url(#areaGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <PanelDashboard guildId={guildId} />
      </div>

      {/* 右カラム: Recent Activity */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-sm min-h-[400px] lg:h-[calc(100vh-10rem)] flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 shrink-0">
            <p className="text-sm font-medium text-slate-300">最近のアクティビティ</p>
            <a href="/logs" className="text-xs text-slate-500 hover:text-indigo-400">
              すべて見る →
            </a>
          </div>
          {recentLogs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-600">
              イベントがありません
            </div>
          ) : (
            <ul className="divide-y divide-slate-800/60 overflow-y-auto flex-1">
              {recentLogs.slice(0, 20).map((log) => {
                const color = getEventColor(log.eventName);
                const cls = eventColorClasses[color];
                return (
                  <li key={log.id} className="flex items-start gap-3 px-4 py-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cls.dot}`} />
                    <p className="flex-1 text-sm text-slate-300 leading-snug">
                      {formatEventDescriptionJSX(
                        log.eventName,
                        {
                          actorId: log.actorId,
                          actorName: extractActorName(log.payload),
                          channelId: log.channelId,
                          channelName: extractChannelName(log.payload),
                          voiceStateChanges: extractVoiceStateChanges(log.payload),
                        },
                        guildId
                      )}
                    </p>
                    <span className="shrink-0 text-xs text-slate-600 mt-0.5">
                      {formatRelativeTime(new Date(log.receivedAt))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
