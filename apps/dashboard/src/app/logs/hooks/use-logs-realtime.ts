"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import {
  realtimeErrorEventName,
  realtimeLogsEventName,
  realtimeLogsSubscribeEventName,
} from "../../../realtime-events";
import { type RealtimeLogsStatus } from "../logs-ui";
import type { LogItem } from "./use-logs-data";

export function useLogsRealtime(
  guildId: string | null,
  onNewLog: (log: LogItem) => void,
  onError: (message: string) => void
): RealtimeLogsStatus {
  const [status, setStatus] = useState<RealtimeLogsStatus>("idle");

  useEffect(() => {
    if (!guildId) {
      setStatus("idle");
      return;
    }

    const socket = io({ path: "/socket.io" });
    setStatus("connecting");

    socket.on("connect", () => {
      setStatus("live");
      socket.emit(realtimeLogsSubscribeEventName, { guildId });
    });
    socket.on(realtimeLogsEventName, (event: LogItem) => {
      onNewLog(event);
    });
    socket.on(realtimeErrorEventName, (payload: { error?: string }) => {
      setStatus("error");
      onError(payload.error ?? "Realtime logs failed.");
    });
    socket.on("disconnect", () => setStatus("offline"));

    return () => {
      socket.disconnect();
    };
  // onNewLog and onError are intentionally omitted — callers must stabilize them (useCallback)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  return status;
}
