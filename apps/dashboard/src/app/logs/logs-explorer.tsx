"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

import {
  realtimeErrorEventName,
  realtimeLogsEventName,
  realtimeLogsSubscribeEventName
} from "../../realtime-events";
import {
  countActiveFilters,
  dashboardGuildStorageKey,
  getDashboardEventPresets,
  normalizeGuildId
} from "../dashboard-ui";

interface LogItem {
  id: string;
  eventName: string;
  guildId: string | null;
  actorId: string | null;
  channelId: string | null;
  messageId: string | null;
  eventTimestamp: string;
  receivedAt: string;
  realtimeEnabled: boolean;
  payload: unknown;
}

interface LogsResponse {
  items: LogItem[];
  nextCursor: string | null;
}

interface LogFilters {
  search: string;
  guildId: string;
  eventName: string;
  actorId: string;
}

const initialFilters: LogFilters = {
  actorId: "",
  eventName: "",
  guildId: "",
  search: ""
};

const eventPresets = getDashboardEventPresets();

export function LogsExplorer() {
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState("idle");

  useEffect(() => {
    const storedGuildId = window.localStorage.getItem(dashboardGuildStorageKey);

    if (storedGuildId) {
      const nextFilters = {
        ...initialFilters,
        guildId: storedGuildId
      };
      setFilters(nextFilters);
      setAppliedFilters(nextFilters);
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

    const socket = io({
      path: "/socket.io"
    });

    setRealtimeStatus("connecting");

    socket.on("connect", () => {
      setRealtimeStatus("live");
      socket.emit(realtimeLogsSubscribeEventName, { guildId });
    });

    socket.on(realtimeLogsEventName, (event: LogItem) => {
      setLogs((currentLogs) => {
        if (currentLogs.some((log) => log.id === event.id)) {
          return currentLogs;
        }

        return [event, ...currentLogs].slice(0, 100);
      });
    });

    socket.on(realtimeErrorEventName, (payload: { error?: string }) => {
      setRealtimeStatus("error");
      setError(payload.error ?? "Realtime logs failed.");
    });

    socket.on("disconnect", () => {
      setRealtimeStatus("offline");
    });

    return () => {
      socket.disconnect();
    };
  }, [appliedFilters.guildId]);

  const activeFilterCount = useMemo(
    () => countActiveFilters(appliedFilters),
    [appliedFilters]
  );

  async function loadLogs(nextFilters: LogFilters) {
    if (!normalizeGuildId(nextFilters.guildId)) {
      setLogs([]);
      setNextCursor(null);
      setError("Enter a guild ID to load logs.");
      setExpandedId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setExpandedId(null);
    window.localStorage.setItem(
      dashboardGuildStorageKey,
      normalizeGuildId(nextFilters.guildId)
    );

    try {
      const data = await fetchLogs(nextFilters);
      setLogs(data.items);
      setNextCursor(data.nextCursor);
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextCursor) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const data = await fetchLogs(appliedFilters, nextCursor);
      setLogs((currentLogs) => [...currentLogs, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
    } finally {
      setLoadingMore(false);
    }
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters({
      ...filters,
      guildId: normalizeGuildId(filters.guildId)
    });
  }

  function resetFilters() {
    const nextFilters = {
      ...initialFilters,
      guildId: filters.guildId
    };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
  }

  function applyPreset(eventName: string) {
    const nextFilters = {
      ...filters,
      eventName
    };
    setFilters(nextFilters);
    setAppliedFilters({
      ...nextFilters,
      guildId: normalizeGuildId(nextFilters.guildId)
    });
  }

  return (
    <section className="flex max-w-7xl flex-col gap-4">
      <form
        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={submitFilters}
      >
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto_auto]">
          <FilterInput
            label="Search"
            onChange={(value) => setFilters({ ...filters, search: value })}
            placeholder="channel name, session key, payload text"
            value={filters.search}
          />
          <FilterInput
            label="Guild"
            onChange={(value) => setFilters({ ...filters, guildId: value })}
            placeholder="required guild id"
            value={filters.guildId}
          />
          <FilterInput
            label="Event"
            onChange={(value) => setFilters({ ...filters, eventName: value })}
            placeholder="event prefix"
            value={filters.eventName}
          />
          <FilterInput
            label="Actor"
            onChange={(value) => setFilters({ ...filters, actorId: value })}
            placeholder="actor id"
            value={filters.actorId}
          />
          <button className="h-11 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800">
            Search
          </button>
          <button
            className="h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={resetFilters}
            type="button"
          >
            Reset
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {eventPresets.map((preset) => {
            const active = filters.eventName === preset.eventName;

            return (
              <button
                className={
                  active
                    ? "rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white"
                    : "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-800"
                }
                key={preset.label}
                onClick={() => applyPreset(preset.eventName)}
                title={preset.description}
                type="button"
              >
                {preset.label}
              </button>
            );
          })}
          <span className="ml-auto text-xs text-slate-500">
            {logs.length} shown / {activeFilterCount} filters / realtime{" "}
            {realtimeStatus}
          </span>
        </div>
      </form>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="w-44 px-4 py-3 font-semibold">Received</th>
                <th className="w-56 px-4 py-3 font-semibold">Event</th>
                <th className="w-44 px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Summary</th>
                <th className="w-24 px-4 py-3 font-semibold">Raw</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <LoadingRows /> : null}
              {!loading && logs.length === 0 ? <EmptyRow /> : null}
              {!loading
                ? logs.map((log) => (
                    <LogRow
                      expanded={expandedId === log.id}
                      key={log.id}
                      log={log}
                      onToggle={() =>
                        setExpandedId(expandedId === log.id ? null : log.id)
                      }
                    />
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          className="h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!nextCursor || loadingMore}
          onClick={loadMore}
          type="button"
        >
          {loadingMore ? "Loading" : "Load More"}
        </button>
      </div>
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
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-slate-500">
      {label}
      <input
        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm normal-case text-slate-950 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function LogRow({
  expanded,
  log,
  onToggle
}: {
  expanded: boolean;
  log: LogItem;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-slate-50">
        <td className="px-4 py-3 text-slate-600">{formatDate(log.receivedAt)}</td>
        <td className="px-4 py-3 font-mono text-sm font-semibold text-teal-800">
          {log.eventName}
        </td>
        <td className="px-4 py-3 font-mono text-slate-600">
          {log.actorId ?? "-"}
        </td>
        <td className="px-4 py-3 text-slate-700">
          {formatPayloadSummary(log)}
        </td>
        <td className="px-4 py-3">
          <button
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onToggle}
            type="button"
          >
            {expanded ? "Hide" : "View"}
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b border-slate-100 bg-slate-50">
          <td className="px-4 py-3" colSpan={5}>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-700">
              {JSON.stringify(log.payload, null, 2)}
            </pre>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function LoadingRows() {
  return Array.from({ length: 5 }, (_, index) => (
    <tr className="border-b border-slate-100" key={index}>
      <td className="px-4 py-4 text-slate-500" colSpan={5}>
        Loading logs
      </td>
    </tr>
  ));
}

function EmptyRow() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-10 text-center text-slate-500" colSpan={5}>
        Enter a guild ID and search logs.
      </td>
    </tr>
  );
}

async function fetchLogs(filters: LogFilters, before?: string) {
  const query = new URLSearchParams();
  query.set("limit", "50");
  setQueryParam(query, "search", filters.search);
  setQueryParam(query, "guildId", filters.guildId);
  setQueryParam(query, "eventName", filters.eventName);
  setQueryParam(query, "actorId", filters.actorId);
  setQueryParam(query, "before", before ?? "");

  const response = await fetch(`/api/logs?${query.toString()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to load logs (${response.status})`);
  }

  return (await response.json()) as LogsResponse;
}

function setQueryParam(query: URLSearchParams, key: string, value: string) {
  const normalizedValue = value.trim();

  if (normalizedValue) {
    query.set(key, normalizedValue);
  }
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickString(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(new Date(value));
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load logs";
}
