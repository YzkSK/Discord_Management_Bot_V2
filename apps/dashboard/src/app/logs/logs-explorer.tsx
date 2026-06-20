"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GuildLanguage } from "@discord-bot/shared";
import { ChevronDown, ChevronRight } from "lucide-react";

import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";

const MAX_PAYLOAD_FIELDS_DISPLAYED = 6;
import {
  dashboardGuildStorageKey,
  normalizeGuildId,
} from "../dashboard-ui";
import {
  eventColorClasses,
  extractActorName,
  extractAuditAction,
  extractChannelName,
  extractTargetId,
  extractVoiceStateChanges,
  formatEventDescription,
  formatRelativeTime,
  getEventColor,
  isObj,
  isRecord,
} from "../../lib/event-display";
import { formatEventDescriptionJSX } from "../../lib/format-event-jsx";
import {
  canViewRawLogPayload,
  getLogCategoryTabs,
  getRealtimeStatusMeta,
} from "./logs-ui";
import { ErrorAlert } from "../../components/error-alert";
import { useLogsData, type LogFilters, type LogItem } from "./hooks/use-logs-data";
import { useLogsRealtime } from "./hooks/use-logs-realtime";
import { LogsChart } from "./components/logs-chart";

const initialFilters: LogFilters = {
  actorId: "",
  eventName: "",
  guildId: "",
  search: "",
};

const categoryTabs = getLogCategoryTabs();


const knownPayloadLabels: Record<string, string> = {
  recruitmentId:    "募集ID",
  creatorId:        "作成者",
  genre:            "ジャンル",
  capacity:         "定員",
  participantCount: "参加者数",
  status:           "ステータス",
  voiceChannelId:   "VCチャンネルID",
  reason:           "理由",
};

function payloadFieldLabel(key: string): string {
  return knownPayloadLabels[key] ?? key;
}

function formatPayloadFieldValue(key: string, value: unknown): string {
  const str = String(value);
  if (key === "creatorId") return `@${str}`;
  return str;
}

function extractGenre(payload: unknown): string | null {
  if (!isObj(payload)) return null;
  return typeof payload["genre"] === "string" ? payload["genre"] : null;
}


export function LogsExplorer({ role }: { role: "admin" | "owner" }) {
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");
  const loc = getDashboardLocale(uiLang);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const {
    logs,
    nextCursor,
    loading,
    loadingMore,
    error,
    accessRole,
    loadLogs,
    loadMore,
    appendRealtimeLog,
  } = useLogsData();

  const onRealtimeError = useCallback((message: string) => {
    // error is shown via realtimeStatus — no separate error state needed
    console.error("Realtime logs error:", message);
  }, []);

  const realtimeStatus = useLogsRealtime(
    normalizeGuildId(appliedFilters.guildId),
    appendRealtimeLog,
    onRealtimeError
  );

  const realtimeMeta = getRealtimeStatusMeta(realtimeStatus);
  const canViewRaw = canViewRawLogPayload(accessRole);

  useEffect(() => {
    setUiLang(detectBrowserLanguage());
  }, []);

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
      window.localStorage.setItem(dashboardGuildStorageKey, normalizeGuildId(appliedFilters.guildId));
      setExpandedId(null);
      void loadLogs(appliedFilters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  const filtered = useMemo(() => logs.filter((log) => {
    if (appliedFilters.eventName && !log.eventName.startsWith(appliedFilters.eventName))
      return false;
    if (appliedFilters.search) {
      const q = appliedFilters.search.toLowerCase();
      const desc = formatEventDescription(log.eventName, {
        actorId: log.actorId,
        actorName: extractActorName(log.payload),
        channelId: log.channelId,
        channelName: log.channelName ?? extractChannelName(log.payload),
        action: extractAuditAction(log.payload),
        targetId: extractTargetId(log.payload),
        voiceStateChanges: extractVoiceStateChanges(log.payload),
      }).toLowerCase();
      if (!desc.includes(q) && !log.eventName.includes(q)) return false;
    }
    return true;
  }), [logs, appliedFilters.eventName, appliedFilters.search]);

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
      <LogsChart logs={logs} />

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
                <span className="text-xs text-zinc-500">{realtimeMeta.label}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

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
            {filtered.map((log) => (
              <LogEntry
                key={log.id}
                log={log}
                isExpanded={expandedId === log.id}
                guildId={normalizeGuildId(appliedFilters.guildId) ?? undefined}
                canViewRaw={canViewRaw}
                onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {nextCursor && (
        <div className="flex justify-center">
          <button
            className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-40"
            disabled={loadingMore}
            onClick={() => void loadMore(appliedFilters, nextCursor)}
            type="button"
          >
            {loadingMore ? "読み込み中..." : loc.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}

function LogEntry({
  log,
  isExpanded,
  guildId,
  canViewRaw,
  onToggle,
}: {
  log: LogItem;
  isExpanded: boolean;
  guildId: string | undefined;
  canViewRaw: boolean;
  onToggle: () => void;
}) {
  const color = getEventColor(log.eventName);
  const cls = eventColorClasses[color];
  const description = formatEventDescriptionJSX(log.eventName, {
    actorId: log.actorId,
    actorName: extractActorName(log.payload),
    channelId: log.channelId,
    channelName: log.channelName ?? extractChannelName(log.payload),
    action: extractAuditAction(log.payload),
    targetId: extractTargetId(log.payload),
    voiceStateChanges: extractVoiceStateChanges(log.payload),
    genre: extractGenre(log.payload),
  }, guildId);
  const payload = isRecord(log.payload) ? log.payload : {};

  return (
    <li>
      <button
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-zinc-800/40"
        onClick={onToggle}
        type="button"
      >
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-[50%] ${cls.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-200">{description}</p>
          <p className="mt-0.5 text-xs text-zinc-600">{log.eventName}</p>
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
                {new Date(log.eventTimestamp).toLocaleString("ja-JP")}
              </dd>
            </div>
            {log.actorId && (() => {
              const name = extractActorName(log.payload);
              return (
                <div>
                  <dt className="text-zinc-600">アクター</dt>
                  <dd className="text-zinc-300">
                    {name ? (
                      <>
                        <span>{name}</span>
                        <span className="ml-1 font-mono text-xs text-zinc-500">({log.actorId})</span>
                      </>
                    ) : (
                      <span className="font-mono">{log.actorId}</span>
                    )}
                  </dd>
                </div>
              );
            })()}
            {log.channelId && (() => {
              const name = log.channelName ?? extractChannelName(log.payload);
              return (
                <div>
                  <dt className="text-zinc-600">チャンネル</dt>
                  <dd className="text-zinc-300">
                    {name ? (
                      <>
                        <span>#{name}</span>
                        <span className="ml-1 font-mono text-xs text-zinc-500">({log.channelId})</span>
                      </>
                    ) : (
                      <span className="font-mono">{log.channelId}</span>
                    )}
                  </dd>
                </div>
              );
            })()}
            {Object.entries(payload)
              .filter(([, v]) => v !== null && v !== undefined && v !== "" && typeof v !== "object")
              .slice(0, MAX_PAYLOAD_FIELDS_DISPLAYED)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-zinc-600">{payloadFieldLabel(k)}</dt>
                  <dd className="truncate text-zinc-300">{formatPayloadFieldValue(k, v)}</dd>
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
}
