"use client";

import { useEffect, useMemo, useState } from "react";
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
  formatRelativeTime,
  getEventColor,
} from "../lib/event-display";
import { formatEventDescriptionJSX } from "../lib/format-event-jsx";

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function extractActorName(payload: unknown): string | null {
  if (!isObj(payload)) return null;
  const member = payload["member"];
  if (isObj(member) && typeof member["displayName"] === "string") return member["displayName"];
  const after = payload["after"];
  if (isObj(after) && typeof after["displayName"] === "string") return after["displayName"];
  const user = payload["user"];
  if (isObj(user) && typeof user["username"] === "string")
    return (typeof user["globalName"] === "string" ? user["globalName"] : null) ?? user["username"];
  return null;
}
function extractChannelName(payload: unknown): string | null {
  if (!isObj(payload)) return null;
  const channel = payload["channel"];
  if (isObj(channel) && typeof channel["name"] === "string") return channel["name"];
  return null;
}

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
}

export function OverviewClient({ guildId }: OverviewClientProps) {
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [recentLogs, setRecentLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useMemo(
    () => async () => {
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
    },
    [guildId]
  );

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

  // 7日間チャートデータ
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-zinc-600">
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <p className="text-sm text-zinc-500">データの取得に失敗しました</p>
        <button
          onClick={() => void load()}
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
        >
          再試行
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* KPI カード */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "アクティブ VC",
            value: activeVcCount,
            icon: <Mic2 className="h-4 w-4" />,
          },
          {
            label: "今日のイベント",
            value: todayCount,
            icon: <Activity className="h-4 w-4" />,
          },
          {
            label: "進行中の募集",
            value: openRecruitCount,
            icon: <Users className="h-4 w-4" />,
          },
          {
            label: "TTS セッション",
            value: ttsTodayCount,
            icon: <Volume2 className="h-4 w-4" />,
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

      {/* 7日間アクティビティチャート */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <p className="mb-4 text-sm font-medium text-zinc-300">
          7日間のイベント数
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={sevenDayData}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#71717A" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#71717A" }}
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
            <Area
              type="monotone"
              dataKey="count"
              stroke="#22C55E"
              fill="url(#areaGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 最近のアクティビティ */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <p className="text-sm font-medium text-zinc-300">
            最近のアクティビティ
          </p>
          <a
            href="/logs"
            className="text-xs text-zinc-500 hover:text-green-400"
          >
            すべて見る →
          </a>
        </div>
        {recentLogs.length === 0 ? (
          <div className="py-10 text-center text-sm text-zinc-600">
            イベントがありません
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {recentLogs.slice(0, 10).map((log) => {
              const color = getEventColor(log.eventName);
              const cls = eventColorClasses[color];
              return (
                <li
                  key={log.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-[50%] ${cls.dot}`}
                  />
                  <p className="flex-1 truncate text-sm text-zinc-300">
                    {formatEventDescriptionJSX(log.eventName, {
                      actorId: log.actorId,
                      actorName: extractActorName(log.payload),
                      channelId: log.channelId,
                      channelName: extractChannelName(log.payload),
                    }, guildId)}
                  </p>
                  <span className="shrink-0 text-xs text-zinc-600">
                    {formatRelativeTime(new Date(log.receivedAt))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
