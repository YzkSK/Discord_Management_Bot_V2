"use client";

import { useState } from "react";
import type { DashboardAccessRole } from "@discord-bot/shared";

export interface LogItem {
  actorId: string | null;
  channelId: string | null;
  channelName: string | null;
  eventName: string;
  eventTimestamp: string;
  guildId: string | null;
  id: string;
  messageId: string | null;
  payload: unknown;
  realtimeEnabled: boolean;
  receivedAt: string;
}

export interface LogFilters {
  actorId: string;
  eventName: string;
  guildId: string;
  search: string;
}

interface LogsResponse {
  accessRole: DashboardAccessRole;
  items: LogItem[];
  nextCursor: string | null;
}

const LOGS_FETCH_LIMIT = 50;
const LOGS_REALTIME_BUFFER_SIZE = 200;

async function fetchLogs(filters: LogFilters, before?: string): Promise<LogsResponse> {
  const query = new URLSearchParams();
  query.set("limit", String(LOGS_FETCH_LIMIT));
  if (filters.search.trim()) query.set("search", filters.search.trim());
  if (filters.guildId.trim()) query.set("guildId", filters.guildId.trim());
  if (filters.eventName.trim()) query.set("eventName", filters.eventName.trim());
  if (filters.actorId.trim()) query.set("actorId", filters.actorId.trim());
  if (before) query.set("before", before);

  const r = await fetch(`/api/logs?${query.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed to load logs (${r.status})`);
  return (await r.json()) as LogsResponse;
}

export interface UseLogsDataResult {
  accessRole: DashboardAccessRole | null;
  error: string | null;
  loading: boolean;
  loadingMore: boolean;
  logs: LogItem[];
  nextCursor: string | null;
  loadLogs: (filters: LogFilters) => Promise<void>;
  loadMore: (filters: LogFilters, cursor: string) => Promise<void>;
  appendRealtimeLog: (log: LogItem) => void;
}

export function useLogsData(): UseLogsDataResult {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessRole, setAccessRole] = useState<DashboardAccessRole | null>(null);

  async function loadLogs(filters: LogFilters): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLogs(filters);
      setAccessRole(data.accessRole);
      setLogs(data.items);
      setNextCursor(data.nextCursor);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore(filters: LogFilters, cursor: string): Promise<void> {
    setLoadingMore(true);
    setError(null);
    try {
      const data = await fetchLogs(filters, cursor);
      setAccessRole(data.accessRole);
      setLogs((cur) => [...cur, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load more logs");
    } finally {
      setLoadingMore(false);
    }
  }

  function appendRealtimeLog(log: LogItem): void {
    setLogs((cur) => {
      if (cur.some((l) => l.id === log.id)) return cur;
      return [log, ...cur].slice(0, LOGS_REALTIME_BUFFER_SIZE);
    });
  }

  return { accessRole, error, loading, loadingMore, logs, nextCursor, loadLogs, loadMore, appendRealtimeLog };
}
