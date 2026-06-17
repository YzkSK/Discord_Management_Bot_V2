"use client";

import { useEffect, useState } from "react";
import {
  COUNTDOWN_THRESHOLD_24H_MS,
  COUNTDOWN_THRESHOLD_1H_MS,
  RECRUITMENT_SCHEDULER_INTERVAL_MS
} from "@discord-bot/shared";

export interface DeadlineCountdown {
  msLeft: number;
  expired: boolean;
}

export function useDeadlineCountdown(deadlineAt: string | null): DeadlineCountdown | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadlineAt) return;

    const deadline = new Date(deadlineAt).getTime();
    const msLeft = deadline - Date.now();

    const interval =
      msLeft <= COUNTDOWN_THRESHOLD_1H_MS
        ? RECRUITMENT_SCHEDULER_INTERVAL_MS
        : msLeft <= COUNTDOWN_THRESHOLD_24H_MS
          ? COUNTDOWN_THRESHOLD_1H_MS
          : null;

    if (interval === null) return;

    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [deadlineAt]);

  if (!deadlineAt) return null;

  const deadline = new Date(deadlineAt).getTime();
  const msLeft = deadline - now;

  return { msLeft, expired: msLeft <= 0 };
}
