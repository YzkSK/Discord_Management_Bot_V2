"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";

import {
  realtimeErrorEventName,
  realtimeLogsEventName,
  realtimeLogsSubscribeEventName
} from "../../../realtime-events";

const VOICE_EVENTS = new Set([
  "call.started",
  "call.ended",
  "voice.session.join",
  "voice.session.leave",
  "voice.temp.deleted"
]);

export function useVoiceRealtime(guildId: string, onUpdate: () => void) {
  useEffect(() => {
    const socket = io({ path: "/socket.io" });

    socket.on("connect", () => {
      socket.emit(realtimeLogsSubscribeEventName, { guildId });
    });

    socket.on(realtimeLogsEventName, (event: { eventName?: string }) => {
      if (event.eventName && VOICE_EVENTS.has(event.eventName)) {
        onUpdate();
      }
    });

    socket.on(realtimeErrorEventName, (err: unknown) => {
      console.warn("voice-realtime: realtime error received", err);
    });

    const interval = setInterval(onUpdate, 60_000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
    // onUpdate must be stable (useCallback from parent); guildId reconnects on change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);
}
