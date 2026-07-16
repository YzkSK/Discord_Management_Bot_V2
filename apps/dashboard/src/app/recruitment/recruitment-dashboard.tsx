"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { isGuildLanguage } from "@discord-bot/shared";
import type { GuildLanguage } from "@discord-bot/shared";
import { Plus } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";

const UI_LANG_KEY = "dashboard-ui-lang";
import { formatRelativeTime } from "../../lib/event-display";
import { useDeadlineCountdown } from "../../hooks/use-deadline-countdown";
import {
  COUNTDOWN_THRESHOLD_24H_MS,
  COUNTDOWN_THRESHOLD_1H_MS
} from "@discord-bot/shared";
import { ErrorAlert } from "../../components/error-alert";
import { useDashboardData } from "../../hooks/use-dashboard-data";
import { LoadingSpinner } from "../../components/loading-spinner";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { SettingsModal } from "../../components/settings-modal";

type Loc = ReturnType<typeof getDashboardLocale>;
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

const TITLE_EMOJI: Record<string, string> = {
  FPS: "🎯",
  RPG: "⚔️",
  MOBA: "🏆",
  アクション: "🎮",
  シミュレーション: "🏗️",
  スポーツ: "⚽",
  レーシング: "🏎️",
};

const STATUS_BADGE: Record<RecruitmentStatus, "info" | "outline" | "success"> = {
  open: "info",
  full: "outline",
  closed: "outline",
};

function titleEmoji(title: string): string {
  return TITLE_EMOJI[title] ?? "🎮";
}

function DeadlineText({ deadlineAt, loc }: { deadlineAt: string | null; loc: Loc }) {
  const countdown = useDeadlineCountdown(deadlineAt);

  if (!countdown || !deadlineAt) return null;

  const { msLeft } = countdown;

  if (msLeft <= 0) {
    return <span className="text-xs text-red-400">{loc.recruitmentDeadlinePast}</span>;
  }

  if (msLeft > COUNTDOWN_THRESHOLD_24H_MS) {
    const date = new Date(deadlineAt).toLocaleString(loc.dateLocale, {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    return <span className="text-xs text-[#b5bac1]">{loc.recruitmentDeadlineDate({ date })}</span>;
  }

  if (msLeft > COUNTDOWN_THRESHOLD_1H_MS) {
    const hours = Math.floor(msLeft / COUNTDOWN_THRESHOLD_1H_MS);
    const minutes = Math.floor((msLeft % COUNTDOWN_THRESHOLD_1H_MS) / 60_000);
    return (
      <span className="text-xs text-amber-400">
        {loc.recruitmentDeadlineHoursMinutes({ hours, minutes })}
      </span>
    );
  }

  const minutes = Math.max(1, Math.floor(msLeft / 60_000));
  return (
    <span className="text-xs text-red-400">{loc.recruitmentDeadlineMinutes({ minutes })}</span>
  );
}

function RecruitmentCard({
  r,
  closingId,
  onAction,
  loc,
}: {
  r: RecruitmentItem;
  closingId: string | null;
  onAction: (id: string, action: "close" | "reopen") => void;
  loc: Loc;
}) {
  const borderClass = STATUS_BORDER[r.status];
  const isClosing = closingId === r.id;
  return (
    <div className={`rounded-xl border border-[#1e1f22] border-l-2 ${borderClass} bg-[#2b2d31] shadow-sm p-3`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-lg leading-none">{titleEmoji(r.genre)}</span>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-[#dbdee1]">{r.genre}</p>
          {r.content && (
            <p className="mt-0.5 line-clamp-2 text-xs text-[#b5bac1]">{r.content}</p>
          )}
          <p className="mt-0.5 text-xs text-[#80848e]">
            {loc.recruitmentCreatedAt({ time: formatRelativeTime(new Date(r.createdAt)) })}
          </p>
          {r.status !== "closed" && (
            <div className="mt-0.5">
              <DeadlineText deadlineAt={r.deadlineAt} loc={loc} />
            </div>
          )}
        </div>
      </div>
      <CapacityBar current={r.activeParticipantCount} max={r.capacity} loc={loc} />
      <div className="mt-2 flex justify-end">
        {r.status === "closed" ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={isClosing}
            onClick={() => onAction(r.id, "reopen")}
          >
            {isClosing ? loc.recruitmentProcessing : loc.recruitmentReopen}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            disabled={isClosing}
            className="text-red-400 hover:text-red-300"
            onClick={() => onAction(r.id, "close")}
          >
            {isClosing ? loc.recruitmentProcessing : loc.recruitmentClose}
          </Button>
        )}
      </div>
    </div>
  );
}

function MyRecruitmentRow({
  r,
  closingId,
  onAction,
  statusLabels,
  loc,
}: {
  r: RecruitmentItem;
  closingId: string | null;
  onAction: (id: string, action: "close" | "reopen") => void;
  statusLabels: Record<RecruitmentStatus, string>;
  loc: Loc;
}) {
  const isClosing = closingId === r.id;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#1e1f22] bg-[#2b2d31] px-4 py-3">
      <span className="text-base leading-none">{titleEmoji(r.genre)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[#dbdee1]">{r.genre}</p>
          <Badge variant={STATUS_BADGE[r.status]}>{statusLabels[r.status]}</Badge>
        </div>
        {r.content && (
          <p className="mt-0.5 truncate text-xs text-[#b5bac1]">{r.content}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-[#dbdee1]">
          {r.activeParticipantCount}/{r.capacity}{loc.personUnit}
        </p>
        {r.status !== "closed" && <DeadlineText deadlineAt={r.deadlineAt} loc={loc} />}
      </div>
      {r.status === "closed" ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={isClosing}
          onClick={() => onAction(r.id, "reopen")}
        >
          {isClosing ? loc.recruitmentProcessing : loc.recruitmentReopen}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          disabled={isClosing}
          className="text-red-400 hover:text-red-300"
          onClick={() => onAction(r.id, "close")}
        >
          {isClosing ? loc.recruitmentProcessing : loc.recruitmentClose}
        </Button>
      )}
    </div>
  );
}

function CapacityBar({
  current,
  max,
  loc,
}: {
  current: number;
  max: number;
  loc: Loc;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  return (
    <div className="mt-2">
      <div className="mb-1 flex justify-between text-xs text-[#b5bac1]">
        <span>{loc.capacity}</span>
        <span>
          {current}/{max}{loc.personUnit}
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

function CreateRecruitmentForm({
  guildId,
  onSuccess,
  loc,
}: {
  guildId: string;
  onSuccess: () => void;
  loc: Loc;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [deadlineDays, setDeadlineDays] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/panel/recruitment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guildId, genre: title, content, capacity, deadlineDays }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: string }));
        setFormError(body.error ?? loc.panelCreationFailed);
        return;
      }
      setOpen(false);
      setTitle("");
      setContent("");
      setCapacity(4);
      setDeadlineDays(3);
      onSuccess();
    } catch (e: unknown) {
      console.error("recruitment-dashboard: create failed", e);
      setFormError(loc.panelCreationFailed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button size="sm" type="button" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        {loc.panelCreateButton}
      </Button>

      {open && (
        <SettingsModal onClose={() => setOpen(false)}>
          <p className="mb-4 text-sm font-semibold text-[#f2f3f5]">{loc.recruitmentNew}</p>
          <form className="grid gap-3" onSubmit={(e) => void handleSubmit(e)}>
            <label className="grid gap-1">
              <span className="text-xs text-[#b5bac1]">{loc.panelTitle}</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={50}
                placeholder={loc.recruitmentExampleTitle}
                className="rounded-md border border-[#3f4147] bg-[#1e1f22] px-3 py-1.5 text-sm text-[#dbdee1] placeholder:text-[#80848e] focus:outline-none focus:ring-1 focus:ring-[#5865f2]/50"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs text-[#b5bac1]">{loc.capacity}</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="rounded-md border border-[#3f4147] bg-[#1e1f22] px-3 py-1.5 text-sm text-[#dbdee1] focus:outline-none focus:ring-1 focus:ring-[#5865f2]/50"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-[#b5bac1]">{loc.recruitmentDeadlineSimple}</span>
                <select
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(Number(e.target.value))}
                  className="rounded-md border border-[#3f4147] bg-[#1e1f22] px-3 py-1.5 text-sm text-[#dbdee1] focus:outline-none focus:ring-1 focus:ring-[#5865f2]/50"
                >
                  <option value={1}>{loc.recruitmentDayAfter({ days: 1 })}</option>
                  <option value={3}>{loc.recruitmentDayAfter({ days: 3 })}</option>
                  <option value={7}>{loc.recruitmentDayAfter({ days: 7 })}</option>
                </select>
              </label>
            </div>
            <label className="grid gap-1">
              <span className="text-xs text-[#b5bac1]">{loc.recruitmentContentLabel}</span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                maxLength={200}
                rows={3}
                placeholder={loc.recruitmentDetailPlaceholder}
                className="rounded-md border border-[#3f4147] bg-[#1e1f22] px-3 py-2 text-sm text-[#dbdee1] placeholder:text-[#80848e] focus:outline-none focus:ring-1 focus:ring-[#5865f2]/50 resize-none"
              />
              <span className="text-right text-xs text-[#80848e]">{content.length}/200</span>
            </label>
            {formError && (
              <p className="text-xs text-[#f23f42]">{formError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button size="sm" type="button" variant="ghost" onClick={() => setOpen(false)}>
                {loc.cancel}
              </Button>
              <Button size="sm" type="submit" disabled={submitting || !title.trim() || !content.trim()}>
                {submitting ? loc.panelCreating : loc.create}
              </Button>
            </div>
          </form>
        </SettingsModal>
      )}
    </>
  );
}

async function fetchRecruitmentData(guildId: string): Promise<RecruitmentResponse> {
  const query = new URLSearchParams({ guildId });
  const r = await fetch(`/api/recruitments?${query.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed to load recruitments (${r.status})`);
  return (await r.json()) as RecruitmentResponse;
}

export function RecruitmentDashboard({
  guildId,
  userId,
  role,
}: {
  guildId: string;
  userId: string;
  role?: "viewer" | "admin" | "owner" | null;
}) {
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");
  const loc = getDashboardLocale(uiLang);
  const { data, loading, error, reload } = useDashboardData(
    () => fetchRecruitmentData(guildId),
    [guildId],
    "Recruitment request failed"
  );

  useEffect(() => {
    const stored = localStorage.getItem(UI_LANG_KEY);
    if (stored !== null && isGuildLanguage(stored)) setUiLang(stored);
    else setUiLang(detectBrowserLanguage());
  }, []);

  const isViewer = role === "viewer";

  const [closingId, setClosingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const statusLabels: Record<RecruitmentStatus, string> = useMemo(() => ({
    open: loc.recruitmentOpen,
    full: loc.recruitmentFull,
    closed: loc.recruitmentClosed,
  }), [loc]);

  async function handleAction(id: string, action: "close" | "reopen") {
    setClosingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/recruitments/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, guildId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: string }));
        setActionError(body.error ?? loc.recruitmentActionFailed);
        return;
      }
      reload();
    } catch (e: unknown) {
      console.error("recruitment-dashboard: action failed", e);
      setActionError(loc.recruitmentActionFailed);
    } finally {
      setClosingId(null);
    }
  }

  const myRecruitments = useMemo(
    () => data?.recruitments.filter((r) => r.creatorId === userId) ?? [],
    [data, userId]
  );

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
        name: statusLabels[s],
        value: grouped[s].length,
        color: STATUS_COLORS[s],
      }))
      .filter((d) => d.value > 0);
  }, [data, grouped, statusLabels]);

  if (loading) return <LoadingSpinner />;

  if (!data) {
    return <ErrorAlert message={error ?? loc.recruitmentFailedToLoad} onRetry={reload} retryLabel={loc.retry} />;
  }

  if (isViewer) {
    return (
      <div className="flex max-w-3xl flex-col gap-4">
        {actionError && (
          <ErrorAlert message={actionError} onRetry={() => setActionError(null)} />
        )}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#dbdee1]">{loc.recruitmentMyPosts}</p>
          <CreateRecruitmentForm guildId={guildId} onSuccess={reload} loc={loc} />
        </div>
        {myRecruitments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#3f4147] py-12 text-center">
            <p className="text-sm text-[#80848e]">{loc.recruitmentNoPosts}</p>
            <p className="mt-1 text-xs text-[#80848e]">{loc.recruitmentCreateHint}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {myRecruitments.map((r) => (
              <MyRecruitmentRow
                key={r.id}
                r={r}
                closingId={closingId}
                onAction={(id, action) => void handleAction(id, action)}
                statusLabels={statusLabels}
                loc={loc}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      {actionError && (
        <ErrorAlert message={actionError} onRetry={() => setActionError(null)} />
      )}
      <div className="flex items-center justify-between">
        <span />
        <CreateRecruitmentForm guildId={guildId} onSuccess={reload} loc={loc} />
      </div>

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
                <p className="text-xs text-[#b5bac1]">{d.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {(["open", "full", "closed"] as const).map((status) => (
          <div key={status}>
            <div className="mb-2 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
              <h3 className="text-sm font-medium text-[#b5bac1]">
                {statusLabels[status]}
              </h3>
              <span className="ml-auto rounded-md bg-[#383a40] px-2 py-0.5 text-xs text-[#b5bac1]">
                {grouped[status].length}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {grouped[status].length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#1e1f22]/60 py-6 text-center text-xs text-slate-700">
                  {loc.recruitmentNone}
                </div>
              ) : (
                grouped[status].map((r) => (
                  <RecruitmentCard
                    key={r.id}
                    r={r}
                    closingId={closingId}
                    onAction={(id, action) => void handleAction(id, action)}
                    loc={loc}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
