"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardAccessRole, GuildLanguage } from "@discord-bot/shared";
import { ChevronDown, ChevronRight } from "lucide-react";
import { io } from "socket.io-client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";
import {
  realtimeErrorEventName,
  realtimeLogsEventName,
  realtimeLogsSubscribeEventName,
} from "../../realtime-events";
import {
  countActiveFilters,
  dashboardGuildStorageKey,
  normalizeGuildId,
} from "../dashboard-ui";
import {
  eventColorClasses,
  formatEventDescription,
  formatRelativeTime,
  getEventColor,
} from "../../lib/event-display";
import {
  canViewRawLogPayload,
  getLogCategoryTabs,
  getRealtimeStatusMeta,
  type RealtimeLogsStatus,
} from "./logs-ui";

interface LogItem {
  actorId: string | null;
  channelId: string | null;
  eventName: string;
  eventTimestamp: string;
  guildId: string | null;
  id: string;
  messageId: string | null;
  payload: unknown;
  realtimeEnabled: boolean;
  receivedAt: string;
}

interface LogsResponse {
  accessRole: DashboardAccessRole;
  items: LogItem[];
  nextCursor: string | null;
}

interface LogFilters {
  actorId: string;
  eventName: string;
  guildId: string;
  search: string;
}

const initialFilters: LogFilters = {
  actorId: "",
  eventName: "",
  guildId: "",
  search: "",
};

const CHART_COLORS: Record<string, string> = {
  blue: "#3B82F6",
  purple: "#8B5CF6",
  teal: "#14B8A6",
  green: "#10B981",
  red: "#EF4444",
  orange: "#F59E0B",
  sky: "#0EA5E9",
  gray: "#71717A",
};

const categoryTabs = getLogCategoryTabs();

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function extractActorName(payload: unknown): string | null {
  if (!isObj(payload)) return null;
  // member events: payload.member.displayName
  const member = payload["member"];
  if (isObj(member) && typeof member["displayName"] === "string") return member["displayName"];
  // member.update / member.timeout: payload.after.displayName
  const after = payload["after"];
  if (isObj(after) && typeof after["displayName"] === "string") return after["displayName"];
  // partial user (member.leave): payload.user.username
  const user = payload["user"];
  if (isObj(user) && typeof user["username"] === "string") return user["username"];
  return null;
}

function extractChannelName(payload: unknown): string | null {
  if (!isObj(payload)) return null;
  const channel = payload["channel"];
  if (isObj(channel) && typeof channel["name"] === "string") return channel["name"];
  return null;
}

export function LogsExplorer() {
  const [uiLang] = useState<GuildLanguage>(detectBrowserLanguage);
  const loc = getDashboardLocale(uiLang);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeLogsStatus>("idle");
  const [accessRole, setAccessRole] = useState<DashboardAccessRole | null>(
    null
  );

  useEffect(() => {
    const storedGuildId = window.localStorage.getItem(dashboardGuildStorageKey);
    if (storedGuildId) {
      const next = { ...initialFilters, guildId: storedGuildId };
      setFilters(next);
      setAppliedFilters(next);
    }
  }, []);

  useEffect(() => {
    if (normalizeGuildId(appliedFilters.guildId)) {
      void loadLogs(appliedFilters);
    }
  }, [appliedFilters]);

  useEffect(() => {
    const guildId = normalizeGuildId(appliedFilters.guildId);
    if (!guildId) {
      setRealtimeStatus("idle");
      return;
    }

    const socket = io({ path: "/socket.io" });
    setRealtimeStatus("connecting");

    socket.on("connect", () => {
      setRealtimeStatus("live");
      socket.emit(realtimeLogsSubscribeEventName, { guildId });
    });
    socket.on(realtimeLogsEventName, (event: LogItem) => {
      setLogs((cur) => {
        if (cur.some((l) => l.id === event.id)) return cur;
        return [event, ...cur].slice(0, 200);
      });
    });
    socket.on(realtimeErrorEventName, (payload: { error?: string }) => {
      setRealtimeStatus("error");
      setError(payload.error ?? "Realtime logs failed.");
    });
    socket.on("disconnect", () => setRealtimeStatus("offline"));

    return () => {
      socket.disconnect();
    };
  }, [appliedFilters.guildId]);

  const realtimeMeta = getRealtimeStatusMeta(realtimeStatus);
  const canViewRaw = canViewRawLogPayload(accessRole);

  // 24時間頻度チャートデータ
  const chartData = useMemo(() => {
    const now = Date.now();
    const bins: Record<string, Record<string, number>> = {};
    for (let h = 23; h >= 0; h--) {
      const label = `${new Date(now - h * 3600_000).getHours()}時`;
      bins[label] = {};
    }
    logs.forEach((log) => {
      const d = new Date(log.receivedAt);
      if (now - d.getTime() > 24 * 3600_000) return;
      const label = `${d.getHours()}時`;
      const colorKey = getEventColor(log.eventName);
      bins[label] = bins[label] ?? {};
      bins[label][colorKey] = (bins[label][colorKey] ?? 0) + 1;
    });
    return Object.entries(bins).map(([hour, counts]) => ({
      hour,
      ...counts,
    }));
  }, [logs]);

  // フィルタリング（カテゴリ pill + テキスト検索）
  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (
        appliedFilters.eventName &&
        !log.eventName.startsWith(appliedFilters.eventName)
      )
        return false;
      if (appliedFilters.search) {
        const q = appliedFilters.search.toLowerCase();
        const desc = formatEventDescription(log.eventName, {
          actorId: log.actorId,
          actorName: extractActorName(log.payload),
          channelId: log.channelId,
          channelName: extractChannelName(log.payload),
        }).toLowerCase();
        if (!desc.includes(q) && !log.eventName.includes(q)) return false;
      }
      return true;
    });
  }, [logs, appliedFilters.eventName, appliedFilters.search]);

  async function loadLogs(next: LogFilters) {
    if (!normalizeGuildId(next.guildId)) {
      setLogs([]);
      setNextCursor(null);
      setError(loc.enterGuildIdToLoadLogs);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setExpandedId(null);
    window.localStorage.setItem(
      dashboardGuildStorageKey,
      normalizeGuildId(next.guildId)
    );
    try {
      const data = await fetchLogs(next);
      setAccessRole(data.accessRole);
      setLogs(data.items);
      setNextCursor(data.nextCursor);
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    setError(null);
    try {
      const data = await fetchLogs(appliedFilters, nextCursor);
      setAccessRole(data.accessRole);
      setLogs((cur) => [...cur, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  }

  function applyCategory(eventName: string) {
    const next = {
      ...appliedFilters,
      eventName,
      guildId: normalizeGuildId(appliedFilters.guildId),
    };
    setAppliedFilters(next);
    setFilters(next);
  }

  return (
    <div className="flex max-w-7xl flex-col gap-4">
      {/* 24時間頻度チャート */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <p className="mb-3 text-xs font-medium text-zinc-500">
          直近24時間のイベント頻度
        </p>
        <ResponsiveContainer width="100%" height={80}>
          <BarChart
            data={chartData}
            margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
          >
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 10, fill: "#71717A" }}
              tickLine={false}
              axisLine={false}
              interval={3}
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
            {Object.entries(CHART_COLORS).map(([key, color]) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="a"
                fill={color}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* フィルター + リアルタイムインジケーター */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {categoryTabs.map((tab) => (
            <button
              key={tab.eventName}
              onClick={() => applyCategory(tab.eventName)}
              type="button"
              className={
                appliedFilters.eventName === tab.eventName
                  ? "rounded-md border border-green-500/40 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400"
                  : "rounded-md border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="イベントを検索..."
            value={filters.search}
            onChange={(e) => {
              const v = e.target.value;
              setFilters((f) => ({ ...f, search: v }));
              setAppliedFilters((f) => ({ ...f, search: v }));
            }}
            className="w-48 rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
          />

          {/* リアルタイムインジケーター */}
          <div className="flex items-center gap-1.5">
            {realtimeStatus === "live" ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-[50%] bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-[50%] bg-green-500" />
                </span>
                <span className="text-xs text-green-400">ライブ</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-[50%] bg-zinc-600" />
                <span className="text-xs text-zinc-500">
                  {realtimeMeta.label}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* アクティビティ feed */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-zinc-600">
            読み込み中...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-zinc-600">
            表示するイベントがありません
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {filtered.map((log) => {
              const color = getEventColor(log.eventName);
              const cls = eventColorClasses[color];
              const isExpanded = expandedId === log.id;
              const description = formatEventDescription(log.eventName, {
                actorId: log.actorId,
                actorName: extractActorName(log.payload),
                channelId: log.channelId,
                channelName: extractChannelName(log.payload),
              });
              const payload = isRecord(log.payload) ? log.payload : {};

              return (
                <li key={log.id}>
                  <button
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-zinc-800/40"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : log.id)
                    }
                    type="button"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-[50%] ${cls.dot}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200">{description}</p>
                      <p className="mt-0.5 text-xs text-zinc-600">
                        {log.eventName}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-zinc-600">
                        {formatRelativeTime(new Date(log.receivedAt))}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-zinc-600" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-zinc-600" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-zinc-800/60 bg-zinc-950/50 px-4 py-3">
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
                        <div>
                          <dt className="text-zinc-600">イベント時刻</dt>
                          <dd className="text-zinc-300">
                            {new Date(log.eventTimestamp).toLocaleString(
                              "ja-JP"
                            )}
                          </dd>
                        </div>
                        {log.actorId && (
                          <div>
                            <dt className="text-zinc-600">アクター ID</dt>
                            <dd className="font-mono text-zinc-300">
                              {log.actorId}
                            </dd>
                          </div>
                        )}
                        {log.channelId && (
                          <div>
                            <dt className="text-zinc-600">チャンネル ID</dt>
                            <dd className="font-mono text-zinc-300">
                              {log.channelId}
                            </dd>
                          </div>
                        )}
                        {Object.entries(payload)
                          .filter(
                            ([, v]) =>
                              v !== null &&
                              v !== undefined &&
                              v !== "" &&
                              typeof v !== "object"
                          )
                          .slice(0, 6)
                          .map(([k, v]) => (
                            <div key={k}>
                              <dt className="text-zinc-600">{k}</dt>
                              <dd className="truncate text-zinc-300">
                                {String(v)}
                              </dd>
                            </div>
                          ))}
                      </dl>

                      {canViewRaw && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs text-zinc-600 hover:text-zinc-400">
                            RAW JSON
                          </summary>
                          <pre className="mt-1 max-h-64 overflow-auto rounded bg-zinc-900 p-2 text-xs text-zinc-400">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {nextCursor && (
        <div className="flex justify-center">
          <button
            className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-40"
            disabled={loadingMore}
            onClick={loadMore}
            type="button"
          >
            {loadingMore ? "読み込み中..." : loc.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}

async function fetchLogs(filters: LogFilters, before?: string) {
  const query = new URLSearchParams();
  query.set("limit", "50");
  if (filters.search.trim()) query.set("search", filters.search.trim());
  if (filters.guildId.trim()) query.set("guildId", filters.guildId.trim());
  if (filters.eventName.trim())
    query.set("eventName", filters.eventName.trim());
  if (filters.actorId.trim()) query.set("actorId", filters.actorId.trim());
  if (before) query.set("before", before);

  const r = await fetch(`/api/logs?${query.toString()}`, {
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Failed to load logs (${r.status})`);
  return (await r.json()) as LogsResponse;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toErrorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Failed to load logs";
}
