"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { GuildLanguage } from "@discord-bot/shared";
import { getDashboardLocale, detectBrowserLanguage } from "../../lib/locale";
import { io } from "socket.io-client";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../../components/ui/table";
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
      setError(loc.enterGuildIdToLoadLogs);
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
      <Card>
        <CardContent className="p-4">
          <form onSubmit={submitFilters}>
            <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto_auto]">
              <FilterInput
                label={loc.search}
                onChange={(value) => setFilters({ ...filters, search: value })}
                placeholder="channel name, session key, payload text"
                value={filters.search}
              />
              <FilterInput
                label={loc.guild}
                onChange={(value) => setFilters({ ...filters, guildId: value })}
                placeholder="required guild id"
                value={filters.guildId}
              />
              <FilterInput
                label={loc.event}
                onChange={(value) => setFilters({ ...filters, eventName: value })}
                placeholder="event prefix"
                value={filters.eventName}
              />
              <FilterInput
                label={loc.actor}
                onChange={(value) => setFilters({ ...filters, actorId: value })}
                placeholder="actor id"
                value={filters.actorId}
              />
              <Button className="h-10 self-end" type="submit">
                <Search className="h-4 w-4" />
                {loc.search}
              </Button>
              <Button
                className="h-10 self-end"
                onClick={resetFilters}
                type="button"
                variant="outline"
              >
                {loc.reset}
              </Button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {eventPresets.map((preset) => {
              const active = filters.eventName === preset.eventName;

              return (
                <Button
                  key={preset.label}
                  onClick={() => applyPreset(preset.eventName)}
                  size="sm"
                  title={preset.description}
                  type="button"
                  variant={active ? "secondary" : "outline"}
                >
                  {preset.label}
                </Button>
              );
            })}
            <div className="ml-auto flex flex-wrap gap-2">
              <Badge variant="outline">{loc.shown({ count: logs.length })}</Badge>
              <Badge variant="outline">{loc.filters({ count: activeFilterCount })}</Badge>
              <Badge variant={realtimeStatus === "live" ? "success" : "outline"}>
                {loc.realtimeStatus({ status: realtimeStatus })}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">{loc.received}</TableHead>
                <TableHead className="w-56">{loc.event}</TableHead>
                <TableHead className="w-44">{loc.actor}</TableHead>
                <TableHead>{loc.summary}</TableHead>
                <TableHead className="w-24">{loc.raw}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <LoadingRows label={loc.loadingLogs} /> : null}
              {!loading && logs.length === 0 ? <EmptyRow label={loc.enterGuildIdAndSearch} /> : null}
              {!loading
                ? logs.map((log) => (
                    <LogRow
                      expanded={expandedId === log.id}
                      hideLabel={loc.hide}
                      key={log.id}
                      log={log}
                      onToggle={() =>
                        setExpandedId(expandedId === log.id ? null : log.id)
                      }
                      viewLabel={loc.view}
                    />
                  ))
                : null}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button
          disabled={!nextCursor || loadingMore}
          onClick={loadMore}
          type="button"
          variant="outline"
        >
          {loadingMore ? loc.loading : loc.loadMore}
        </Button>
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
      <Input
        className="normal-case"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function LogRow({
  expanded,
  hideLabel,
  log,
  onToggle,
  viewLabel
}: {
  expanded: boolean;
  hideLabel: string;
  log: LogItem;
  onToggle: () => void;
  viewLabel: string;
}) {
  return (
    <>
      <TableRow className="hover:bg-slate-50">
        <TableCell className="text-slate-600">{formatDate(log.receivedAt)}</TableCell>
        <TableCell className="font-mono text-sm font-semibold text-teal-800">
          {log.eventName}
        </TableCell>
        <TableCell className="font-mono text-slate-600">
          {log.actorId ?? "-"}
        </TableCell>
        <TableCell className="text-slate-700">
          {formatPayloadSummary(log)}
        </TableCell>
        <TableCell>
          <Button
            onClick={onToggle}
            size="sm"
            type="button"
            variant="outline"
          >
            {expanded ? hideLabel : viewLabel}
          </Button>
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow className="bg-slate-50">
          <TableCell colSpan={5}>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-700">
              {JSON.stringify(log.payload, null, 2)}
            </pre>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

function LoadingRows({ label }: { label: string }) {
  return Array.from({ length: 5 }, (_, index) => (
    <TableRow key={index}>
      <TableCell className="text-slate-500" colSpan={5}>
        {label}
      </TableCell>
    </TableRow>
  ));
}

function EmptyRow({ label }: { label: string }) {
  return (
    <TableRow>
      <TableCell className="py-10 text-center text-slate-500" colSpan={5}>
        {label}
      </TableCell>
    </TableRow>
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
