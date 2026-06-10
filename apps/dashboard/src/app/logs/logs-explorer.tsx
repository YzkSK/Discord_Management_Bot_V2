"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { DashboardAccessRole, GuildLanguage } from "@discord-bot/shared";
import { Radio, Search, X } from "lucide-react";
import { io } from "socket.io-client";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../../components/ui/table";
import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";
import {
  realtimeErrorEventName,
  realtimeLogsEventName,
  realtimeLogsSubscribeEventName
} from "../../realtime-events";
import {
  countActiveFilters,
  dashboardGuildStorageKey,
  normalizeGuildId
} from "../dashboard-ui";
import {
  canViewRawLogPayload,
  getLogCategoryTabs,
  getRealtimeStatusMeta,
  type RealtimeLogsStatus,
  type RealtimeStatusTone
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
  search: ""
};
const categoryTabs = getLogCategoryTabs();

function eventBadgeClass(name: string) {
  if (name.startsWith("message")) {
    return "border border-blue-500/20 bg-blue-500/10 text-blue-400";
  }
  if (name.startsWith("voice")) {
    return "border border-purple-500/20 bg-purple-500/10 text-purple-400";
  }
  if (name.startsWith("temp_vc")) {
    return "border border-teal-500/20 bg-teal-500/10 text-teal-400";
  }
  if (name.startsWith("recruitment")) {
    return "border border-green-500/20 bg-green-500/10 text-green-400";
  }
  if (name.startsWith("audit")) {
    return "border border-orange-500/20 bg-orange-500/10 text-orange-400";
  }
  if (name.startsWith("tts")) {
    return "border border-sky-500/20 bg-sky-500/10 text-sky-400";
  }
  if (name.startsWith("system")) {
    return "border border-red-500/20 bg-red-500/10 text-red-400";
  }
  return "border border-zinc-700 bg-zinc-800 text-zinc-400";
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
  const [accessRole, setAccessRole] = useState<DashboardAccessRole | null>(null);

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
        return [event, ...cur].slice(0, 100);
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

  const activeFilterCount = useMemo(
    () => countActiveFilters(appliedFilters),
    [appliedFilters]
  );
  const realtimeMeta = getRealtimeStatusMeta(realtimeStatus);
  const canViewRaw = canViewRawLogPayload(accessRole);

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

  function submitFilters(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAppliedFilters({ ...filters, guildId: normalizeGuildId(filters.guildId) });
  }

  function resetFilters() {
    const next = { ...initialFilters, guildId: filters.guildId };
    setFilters(next);
    setAppliedFilters(next);
  }

  function applyPreset(eventName: string) {
    const next = { ...filters, eventName };
    setFilters(next);
    setAppliedFilters({ ...next, guildId: normalizeGuildId(next.guildId) });
  }

  return (
    <section className="flex max-w-7xl flex-col gap-3">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <form onSubmit={submitFilters}>
          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_auto_auto]">
            <FilterInput
              label={loc.search}
              onChange={(v) => setFilters({ ...filters, search: v })}
              placeholder="content, channel, payload text"
              value={filters.search}
            />
            <FilterInput
              label={loc.event}
              onChange={(v) => setFilters({ ...filters, eventName: v })}
              placeholder="event prefix"
              value={filters.eventName}
            />
            <FilterInput
              label={loc.actor}
              onChange={(v) => setFilters({ ...filters, actorId: v })}
              placeholder="actor id"
              value={filters.actorId}
            />
            <Button className="h-9 self-end" type="submit">
              <Search className="h-3.5 w-3.5" />
              {loc.search}
            </Button>
            <Button
              className="h-9 self-end"
              onClick={resetFilters}
              type="button"
              variant="outline"
            >
              <X className="h-3.5 w-3.5" />
              {loc.reset}
            </Button>
          </div>
        </form>

        <div className="mt-3 border-t border-zinc-800 pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            {loc.logCategoryTabs}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {categoryTabs.map((tab) => (
              <button
                className={
                  filters.eventName === tab.eventName
                    ? "rounded border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400"
                    : "rounded border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                }
                key={tab.label}
                onClick={() => applyPreset(tab.eventName)}
                title={tab.description}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
            <span className="text-xs text-zinc-500">
              {loc.shown({ count: logs.length })}
            </span>
            {activeFilterCount > 0 && (
              <span className="text-xs text-zinc-500">
                {loc.filters({ count: activeFilterCount })}
              </span>
            )}
            <div
              className={`flex items-center gap-1.5 text-xs ${realtimeStatusClass(
                realtimeMeta.tone
              )}`}
            >
              <Radio className="h-3.5 w-3.5" />
              <span
                className={`inline-block h-1.5 w-1.5 rounded ${
                  realtimeStatus === "live"
                    ? "animate-pulse bg-green-400"
                    : "bg-zinc-600"
                }`}
              />
              {realtimeMeta.label}
            </div>
            {!canViewRaw && accessRole && (
              <span className="text-xs text-zinc-600">
                {loc.rawJsonRestricted}
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">{loc.received}</TableHead>
                <TableHead className="w-52">{loc.event}</TableHead>
                <TableHead className="w-40">{loc.actor}</TableHead>
                <TableHead>{loc.humanView}</TableHead>
                {canViewRaw && <TableHead className="w-24">{loc.raw}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <LoadingRows canViewRaw={canViewRaw} label={loc.loadingLogs} />
              )}
              {!loading && logs.length === 0 && (
                <EmptyRow canViewRaw={canViewRaw} label={loc.noLogsFound} />
              )}
              {!loading &&
                logs.map((log) => (
                  <LogRow
                    canViewRaw={canViewRaw}
                    expanded={expandedId === log.id}
                    hideLabel={loc.hide}
                    key={log.id}
                    log={log}
                    onToggle={() =>
                      setExpandedId(expandedId === log.id ? null : log.id)
                    }
                    viewLabel={loc.view}
                  />
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {nextCursor && (
        <div className="flex justify-end">
          <Button
            disabled={loadingMore}
            onClick={loadMore}
            type="button"
            variant="outline"
          >
            {loadingMore ? loc.loading : loc.loadMore}
          </Button>
        </div>
      )}
    </section>
  );
}

function FilterInput({
  label,
  onChange,
  placeholder,
  value
}: {
  label: string;
  onChange: (v: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
      {label}
      <Input
        className="normal-case"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function LogRow({
  canViewRaw,
  expanded,
  hideLabel,
  log,
  onToggle,
  viewLabel
}: {
  canViewRaw: boolean;
  expanded: boolean;
  hideLabel: string;
  log: LogItem;
  onToggle: () => void;
  viewLabel: string;
}) {
  return (
    <>
      <TableRow>
        <TableCell className="text-xs text-zinc-500">
          {formatDate(log.receivedAt)}
        </TableCell>
        <TableCell>
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-xs ${eventBadgeClass(
              log.eventName
            )}`}
          >
            {log.eventName}
          </span>
        </TableCell>
        <TableCell className="font-mono text-xs text-zinc-500">
          {log.actorId ?? "-"}
        </TableCell>
        <TableCell className="text-xs text-zinc-400">
          {formatPayloadSummary(log)}
        </TableCell>
        {canViewRaw && (
          <TableCell>
            <button
              className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              onClick={onToggle}
              type="button"
            >
              {expanded ? hideLabel : viewLabel}
            </button>
          </TableCell>
        )}
      </TableRow>
      {canViewRaw && expanded && (
        <TableRow className="bg-zinc-950">
          <TableCell colSpan={5}>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border border-zinc-800 bg-zinc-900 p-3 text-xs leading-5 text-zinc-300">
              {JSON.stringify(log.payload, null, 2)}
            </pre>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function LoadingRows({
  canViewRaw,
  label
}: {
  canViewRaw: boolean;
  label: string;
}) {
  return Array.from({ length: 5 }, (_, i) => (
    <TableRow key={i}>
      <TableCell className="text-zinc-600" colSpan={canViewRaw ? 5 : 4}>
        {label}
      </TableCell>
    </TableRow>
  ));
}

function EmptyRow({
  canViewRaw,
  label
}: {
  canViewRaw: boolean;
  label: string;
}) {
  return (
    <TableRow>
      <TableCell
        className="py-10 text-center text-zinc-600"
        colSpan={canViewRaw ? 5 : 4}
      >
        {label}
      </TableCell>
    </TableRow>
  );
}

async function fetchLogs(filters: LogFilters, before?: string) {
  const query = new URLSearchParams();
  query.set("limit", "50");
  if (filters.search.trim()) query.set("search", filters.search.trim());
  if (filters.guildId.trim()) query.set("guildId", filters.guildId.trim());
  if (filters.eventName.trim()) query.set("eventName", filters.eventName.trim());
  if (filters.actorId.trim()) query.set("actorId", filters.actorId.trim());
  if (before) query.set("before", before);

  const r = await fetch(`/api/logs?${query.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed to load logs (${r.status})`);
  return (await r.json()) as LogsResponse;
}

function formatPayloadSummary(log: LogItem) {
  const payload = isRecord(log.payload) ? log.payload : {};
  const parts = [
    pickString(payload, "summary"),
    pickString(payload, "content"),
    pickString(payload, "channelName"),
    pickString(payload, "tempVoiceChannelName"),
    pickString(payload, "stableChannelKey"),
    pickString(payload, "sessionKey"),
    log.messageId ? `message ${log.messageId}` : null,
    log.channelId ? `channel ${log.channelId}` : null
  ].filter(Boolean);
  return parts.slice(0, 3).join(" / ") || "-";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pickString(src: Record<string, unknown>, key: string) {
  const v = src[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(new Date(value));
}

function toErrorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Failed to load logs";
}

function realtimeStatusClass(tone: RealtimeStatusTone) {
  if (tone === "success") return "text-green-400";
  if (tone === "danger") return "text-red-400";
  if (tone === "pending") return "text-yellow-400";
  return "text-zinc-500";
}
