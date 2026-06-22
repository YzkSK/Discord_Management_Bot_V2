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
import {
  Activity,
  ArrowRight,
  ClipboardList,
  Headphones,
  KeyRound,
  Mic2,
  ScrollText,
  Users,
  Volume2,
} from "lucide-react";

import {
  eventColorClasses,
  extractActorName,
  extractChannelName,
  extractVoiceStateChanges,
  formatRelativeTime,
  getEventColor,
} from "../lib/event-display";
import { formatEventDescriptionJSX } from "../lib/format-event-jsx";
import { LoadingSpinner } from "../components/loading-spinner";
import { roleRank } from "../lib/roles";

interface VoiceSession {
  channelId: string;
  channelName?: string;
  id: string;
  memberCount: number;
  startedAt: string;
  status: "active" | "ended";
}

interface Recruitment {
  id: string;
  status: string;
  genre?: string;
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
  {
    label: "アクティブ VC",
    key: "activeVcCount",
    icon: Mic2,
    color: "text-[#5865f2]",
    bg: "bg-[#5865f2]/15",
  },
  {
    label: "今日のイベント",
    key: "todayCount",
    icon: Activity,
    color: "text-[#0ea5e9]",
    bg: "bg-[#0ea5e9]/10",
  },
  {
    label: "進行中の募集",
    key: "openRecruitCount",
    icon: Users,
    color: "text-[#23a55a]",
    bg: "bg-[#23a55a]/10",
  },
  {
    label: "TTS セッション",
    key: "ttsTodayCount",
    icon: Volume2,
    color: "text-[#8b5cf6]",
    bg: "bg-[#8b5cf6]/10",
  },
] as const;


const ALL_QUICK_LINKS = [
  { label: "Voice", href: "/voice", icon: Headphones, desc: "通話状況", minRole: "admin" as const },
  { label: "Recruitment", href: "/recruitment", icon: ClipboardList, desc: "募集管理", minRole: undefined },
  { label: "TTS", href: "/tts", icon: Mic2, desc: "音声読み上げ", minRole: undefined },
  { label: "Logs", href: "/logs", icon: ScrollText, desc: "イベントログ", minRole: "admin" as const },
  { label: "Access", href: "/settings", icon: KeyRound, desc: "アクセス管理", minRole: "owner" as const },
];

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
      if (!res.ok) { setError(true); return; }
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

  useEffect(() => { void load(); }, [load]);

  const activeSessions = sessions.filter((s) => s.status === "active");
  const activeVcCount = activeSessions.length;
  const openRecruitCount = recruitments.filter((r) => r.status === "open").length;

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return recentLogs.filter((l) => new Date(l.receivedAt).toDateString() === today).length;
  }, [recentLogs]);

  const ttsTodayCount = useMemo(() => {
    const today = new Date().toDateString();
    return recentLogs.filter(
      (l) => l.eventName === "tts.session.started" && new Date(l.receivedAt).toDateString() === today
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
        <p className="text-sm text-[#b5bac1]">データの取得に失敗しました</p>
        <button
          onClick={() => void load()}
          className="rounded-md bg-[#383a40] px-4 py-2 text-sm text-[#dbdee1] hover:bg-[#404249] transition-colors"
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

  const quickLinks = ALL_QUICK_LINKS.filter((link) => {
    if (!link.minRole) return true;
    if (!role) return false;
    return (roleRank[role] ?? 0) >= (roleRank[link.minRole] ?? 99);
  });

  const isViewer = role === "viewer";

  if (isViewer) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          {[kpiDefs[0], kpiDefs[2]].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="rounded-lg bg-[#383a40] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#b5bac1]">{kpi.label}</p>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-md ${kpi.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold text-[#f2f3f5]">{kpiValues[kpi.key]}</p>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.href}
                href={link.href}
                className="group flex items-center gap-3 rounded-lg bg-[#383a40] px-4 py-3 hover:bg-[#404249] transition-colors"
              >
                <Icon className="h-4 w-4 shrink-0 text-[#5865f2]" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#dbdee1] group-hover:text-[#f2f3f5]">{link.label}</p>
                  <p className="text-[10px] text-[#b5bac1]">{link.desc}</p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpiDefs.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-lg bg-[#383a40] p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[#b5bac1]">{kpi.label}</p>
                <span className={`flex h-7 w-7 items-center justify-center rounded-md ${kpi.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-[#f2f3f5]">{kpiValues[kpi.key]}</p>
            </div>
          );
        })}
      </div>

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Left column */}
        <div className="flex flex-col gap-5 lg:col-span-3">
          {/* Activity chart */}
          <div className="rounded-lg bg-[#383a40] p-4">
            <p className="mb-4 text-sm font-semibold text-[#dbdee1]">7日間のアクティビティ</p>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={sevenDayData}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5865f2" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#5865f2" stopOpacity={0} />
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
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--chart-tooltip-bg)",
                    border: "1px solid var(--chart-tooltip-border)",
                    borderRadius: "6px",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--chart-tooltip-label)" }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="イベント"
                  stroke="#5865f2"
                  fill="url(#areaGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Active VC sessions */}
          {activeSessions.length > 0 && (
            <div className="rounded-lg bg-[#383a40] p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#23a55a] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#23a55a]" />
                </span>
                <p className="text-sm font-semibold text-[#dbdee1]">
                  アクティブ通話 ({activeSessions.length})
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {activeSessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-md bg-[#2b2d31] px-3 py-2"
                  >
                    <Headphones className="h-3.5 w-3.5 shrink-0 text-[#5865f2]" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-[#dbdee1]">
                        {s.channelName ?? `#${s.channelId.slice(0, 8)}…`}
                      </p>
                      <p className="text-[10px] text-[#b5bac1]">{s.memberCount}人</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-3 rounded-lg bg-[#383a40] px-4 py-3 hover:bg-[#404249] transition-colors"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#5865f2]" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#dbdee1] group-hover:text-[#f2f3f5]">{link.label}</p>
                    <p className="text-[10px] text-[#b5bac1]">{link.desc}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* Right column — activity feed */}
        <div className="lg:col-span-2">
          <div className="sticky top-[57px] rounded-lg bg-[#383a40] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#1e1f22] px-4 py-3">
              <p className="text-sm font-semibold text-[#dbdee1]">最近のアクティビティ</p>
              <a
                href="/logs"
                className="flex items-center gap-1 text-xs text-[#b5bac1] hover:text-[#5865f2] transition-colors"
              >
                すべて見る
                <ArrowRight className="h-3 w-3" />
              </a>
            </div>
            {recentLogs.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-sm text-[#80848e]">
                イベントがありません
              </div>
            ) : (
              <ul className="max-h-[300px] divide-y divide-[#1e1f22]/60 overflow-y-auto">
                {recentLogs.slice(0, 30).map((log) => {
                  const color = getEventColor(log.eventName);
                  const cls = eventColorClasses[color];
                  return (
                    <li key={log.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#404249] transition-colors">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cls.dot}`} />
                      <p className="flex-1 text-xs text-[#dbdee1] leading-relaxed">
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
                      <span className="shrink-0 text-[10px] text-[#80848e] mt-0.5 whitespace-nowrap">
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
    </div>
  );
}
