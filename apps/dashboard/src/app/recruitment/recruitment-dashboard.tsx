"use client";

import { useEffect, useMemo, useState } from "react";
import type { GuildLanguage } from "@discord-bot/shared";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";
import { formatRelativeTime } from "../../lib/event-display";
import { useDeadlineCountdown } from "../../hooks/use-deadline-countdown";
import {
  COUNTDOWN_THRESHOLD_24H_MS,
  COUNTDOWN_THRESHOLD_1H_MS
} from "@discord-bot/shared";
import { ErrorAlert } from "../../components/error-alert";
import { useDashboardData } from "../../hooks/use-dashboard-data";
import { LoadingSpinner } from "../../components/loading-spinner";

type RecruitmentStatus = "open" | "full" | "closed";

interface RecruitmentItem {
  activeParticipantCount: number;
  availableSlots: number;
  capacity: number;
  channelId: string;
  closedAt: string | null;
  deadlineAt: string | null;
  content: string;
  createdAt: string;
  creatorId: string;
  genre: string;
  id: string;
  messageId: string | null;
  postUrl: string | null;
  status: RecruitmentStatus;
  updatedAt: string;
  voiceChannelId: string | null;
}

interface RecruitmentResponse {
  accessRole: string;
  closedCount: number;
  fullCount: number;
  guildId: string;
  openCount: number;
  recruitments: RecruitmentItem[];
  totalCount: number;
}

const STATUS_LABELS: Record<RecruitmentStatus, string> = {
  open: "募集中",
  full: "満員",
  closed: "締切済み",
};

const STATUS_COLORS: Record<RecruitmentStatus, string> = {
  open: "var(--chart-indigo)",
  full: "var(--chart-amber)",
  closed: "var(--chart-muted)",
};

const STATUS_DOT: Record<RecruitmentStatus, string> = {
  open: "bg-[#5865f2]",
  full: "bg-amber-500",
  closed: "bg-[#80848e]",
};

const STATUS_BORDER: Record<RecruitmentStatus, string> = {
  open: "border-l-indigo-500",
  full: "border-l-amber-500",
  closed: "border-l-slate-600",
};

const GENRE_EMOJI: Record<string, string> = {
  FPS: "🎯",
  RPG: "⚔️",
  MOBA: "🏆",
  アクション: "🎮",
  シミュレーション: "🏗️",
  スポーツ: "⚽",
  レーシング: "🏎️",
};

function genreEmoji(genre: string): string {
  return GENRE_EMOJI[genre] ?? "🎮";
}

function DeadlineText({ deadlineAt }: { deadlineAt: string | null }) {
  const countdown = useDeadlineCountdown(deadlineAt);

  if (!countdown || !deadlineAt) return null;

  const { msLeft } = countdown;

  if (msLeft <= 0) {
    return <span className="text-xs text-red-400">締め切り済み</span>;
  }

  if (msLeft > COUNTDOWN_THRESHOLD_24H_MS) {
    const date = new Date(deadlineAt).toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    return <span className="text-xs text-[#80848e]">締め切り：{date}</span>;
  }

  if (msLeft > COUNTDOWN_THRESHOLD_1H_MS) {
    const hours = Math.floor(msLeft / COUNTDOWN_THRESHOLD_1H_MS);
    const minutes = Math.floor((msLeft % COUNTDOWN_THRESHOLD_1H_MS) / 60_000);
    return (
      <span className="text-xs text-amber-400">
        締め切りまで {hours}時間{minutes}分
      </span>
    );
  }

  const minutes = Math.max(1, Math.floor(msLeft / 60_000));
  return (
    <span className="text-xs text-red-400">締め切りまで {minutes}分</span>
  );
}

function RecruitmentCard({ r }: { r: RecruitmentItem }) {
  const borderClass = STATUS_BORDER[r.status];
  return (
    <div className={`rounded-xl border border-[#1e1f22] border-l-2 ${borderClass} bg-[#2b2d31] shadow-sm p-3`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-lg leading-none">{genreEmoji(r.genre)}</span>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-[#dbdee1]">{r.genre}</p>
          {r.content && (
            <p className="mt-0.5 line-clamp-2 text-xs text-[#80848e]">{r.content}</p>
          )}
          <p className="mt-0.5 text-xs text-[#4e5058]">
            {formatRelativeTime(new Date(r.createdAt))} 作成
          </p>
          {r.status !== "closed" && (
            <div className="mt-0.5">
              <DeadlineText deadlineAt={r.deadlineAt} />
            </div>
          )}
        </div>
      </div>
      <CapacityBar current={r.activeParticipantCount} max={r.capacity} />
    </div>
  );
}

function CapacityBar({
  current,
  max,
}: {
  current: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  return (
    <div className="mt-2">
      <div className="mb-1 flex justify-between text-xs text-[#80848e]">
        <span>定員</span>
        <span>
          {current}/{max}人
        </span>
      </div>
      <div className="h-1.5 w-full rounded-md bg-[#383a40]">
        <div
          className="h-full rounded-md bg-[#5865f2] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

async function fetchRecruitmentData(guildId: string): Promise<RecruitmentResponse> {
  const query = new URLSearchParams({ guildId });
  const r = await fetch(`/api/recruitments?${query.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed to load recruitments (${r.status})`);
  return (await r.json()) as RecruitmentResponse;
}

export function RecruitmentDashboard({ guildId }: { guildId: string }) {
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");
  const loc = getDashboardLocale(uiLang);
  const { data, loading, error, reload } = useDashboardData(
    () => fetchRecruitmentData(guildId),
    [guildId],
    "Recruitment request failed"
  );

  useEffect(() => {
    setUiLang(detectBrowserLanguage());
  }, []);

  const grouped = useMemo(() => {
    const empty: Record<RecruitmentStatus, RecruitmentItem[]> = {
      open: [],
      full: [],
      closed: [],
    };
    if (!data) return empty;
    return data.recruitments.reduce((acc, r) => {
      acc[r.status] = [...(acc[r.status] ?? []), r];
      return acc;
    }, empty);
  }, [data]);

  const pieData = useMemo(() => {
    if (!data) return [];
    return (["open", "full", "closed"] as const)
      .map((s) => ({
        name: STATUS_LABELS[s],
        value: grouped[s].length,
        color: STATUS_COLORS[s],
      }))
      .filter((d) => d.value > 0);
  }, [data, grouped]);

  if (loading) return <LoadingSpinner />;

  if (!data) {
    return <ErrorAlert message={error ?? loc.recruitmentFailedToLoad} onRetry={reload} />;
  }

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      {/* ドーナツチャート + 統計 */}
      {data.totalCount > 0 && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-[#1e1f22] bg-[#2b2d31] shadow-sm p-4 sm:flex-row">
          <div style={{ width: 160, height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={35}
                  outerRadius={55}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--chart-tooltip-bg)",
                    border: "1px solid var(--chart-tooltip-border)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 text-center">
            {pieData.map((d) => (
              <div key={d.name}>
                <p className="text-xl font-bold text-[#f2f3f5]">{d.value}</p>
                <p className="text-xs text-[#80848e]">{d.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kanban カラム */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {(["open", "full", "closed"] as const).map((status) => (
          <div key={status}>
            <div className="mb-2 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
              <h3 className="text-sm font-medium text-[#80848e]">
                {STATUS_LABELS[status]}
              </h3>
              <span className="ml-auto rounded-md bg-[#383a40] px-2 py-0.5 text-xs text-[#80848e]">
                {grouped[status].length}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {grouped[status].length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#1e1f22]/60 py-6 text-center text-xs text-slate-700">
                  なし
                </div>
              ) : (
                grouped[status].map((r) => (
                  <RecruitmentCard key={r.id} r={r} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
