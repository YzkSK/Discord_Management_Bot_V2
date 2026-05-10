"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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
  search: "",
  guildId: "",
  eventName: "",
  actorId: ""
};

export function LogsExplorer() {
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    void loadLogs(appliedFilters);
  }, [appliedFilters]);

  const activeFilterCount = useMemo(
    () => Object.values(appliedFilters).filter(Boolean).length,
    [appliedFilters]
  );

  async function loadLogs(nextFilters: LogFilters) {
    if (!nextFilters.guildId.trim()) {
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
    setAppliedFilters(filters);
  }

  function resetFilters() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }

  return (
    <main className="min-h-screen bg-[#101418] px-5 py-6 text-slate-100">
      <section className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-3 border-b border-slate-700 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-teal-300">
              Phase2 Logs
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              Logs
            </h1>
          </div>
          <div className="text-sm text-slate-300">
            {logs.length} shown
            {activeFilterCount > 0 ? ` / ${activeFilterCount} filters` : ""}
          </div>
        </header>

        <form
          className="grid gap-3 border-b border-slate-800 pb-5 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto_auto]"
          onSubmit={submitFilters}
        >
          <FilterInput
            label="Search"
            onChange={(value) => setFilters({ ...filters, search: value })}
            placeholder="message.update"
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
            placeholder="event name"
            value={filters.eventName}
          />
          <FilterInput
            label="Actor"
            onChange={(value) => setFilters({ ...filters, actorId: value })}
            placeholder="actor id"
            value={filters.actorId}
          />
          <button
            className="h-11 border border-teal-500 bg-teal-500 px-4 text-sm font-semibold text-slate-950 hover:bg-teal-400"
            type="submit"
          >
            Search
          </button>
          <button
            className="h-11 border border-slate-600 px-4 text-sm font-semibold text-slate-100 hover:border-slate-400"
            onClick={resetFilters}
            type="button"
          >
            Reset
          </button>
        </form>

        {error ? (
          <div className="border border-red-500 bg-red-950/40 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto border border-slate-800">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase text-slate-400">
              <tr>
                <th className="w-48 px-3 py-3 font-semibold">Received</th>
                <th className="w-56 px-3 py-3 font-semibold">Event</th>
                <th className="w-44 px-3 py-3 font-semibold">Guild</th>
                <th className="w-44 px-3 py-3 font-semibold">Actor</th>
                <th className="px-3 py-3 font-semibold">Target</th>
                <th className="w-28 px-3 py-3 font-semibold">Realtime</th>
                <th className="w-24 px-3 py-3 font-semibold">Raw</th>
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

        <div className="flex justify-end">
          <button
            className="h-11 border border-slate-600 px-4 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!nextCursor || loadingMore}
            onClick={loadMore}
            type="button"
          >
            {loadingMore ? "Loading" : "Load More"}
          </button>
        </div>
      </section>
    </main>
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
    <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-slate-400">
      {label}
      <input
        className="h-11 border border-slate-700 bg-slate-950 px-3 text-sm normal-case text-slate-100 outline-none placeholder:text-slate-600 focus:border-teal-400"
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
      <tr className="border-t border-slate-800 hover:bg-slate-900/70">
        <td className="px-3 py-3 text-slate-300">{formatDate(log.receivedAt)}</td>
        <td className="px-3 py-3 font-mono text-teal-200">{log.eventName}</td>
        <td className="px-3 py-3 font-mono text-slate-300">
          {log.guildId ?? "-"}
        </td>
        <td className="px-3 py-3 font-mono text-slate-300">
          {log.actorId ?? "-"}
        </td>
        <td className="px-3 py-3 font-mono text-slate-300">
          {log.messageId ?? log.channelId ?? "-"}
        </td>
        <td className="px-3 py-3">
          <span
            className={
              log.realtimeEnabled
                ? "text-teal-300"
                : "text-slate-500"
            }
          >
            {log.realtimeEnabled ? "on" : "off"}
          </span>
        </td>
        <td className="px-3 py-3">
          <button
            className="border border-slate-600 px-3 py-1 text-xs font-semibold hover:border-slate-400"
            onClick={onToggle}
            type="button"
          >
            {expanded ? "Hide" : "View"}
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-t border-slate-800 bg-slate-950">
          <td className="px-3 py-3" colSpan={7}>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-300">
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
    <tr className="border-t border-slate-800" key={index}>
      <td className="px-3 py-4 text-slate-500" colSpan={7}>
        Loading logs
      </td>
    </tr>
  ));
}

function EmptyRow() {
  return (
    <tr className="border-t border-slate-800">
      <td className="px-3 py-8 text-center text-slate-400" colSpan={7}>
        No logs found
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(new Date(value));
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load logs";
}
