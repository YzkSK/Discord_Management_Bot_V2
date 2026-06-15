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

    socket.on(realtimeErrorEventName, () => {});

    return () => {
      socket.disconnect();
    };
    // onUpdate must be stable (useCallback from parent); guildId reconnects on change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);
}
