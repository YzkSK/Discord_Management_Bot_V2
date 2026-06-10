import type { DashboardAccessRole } from "@discord-bot/shared";

export {
  formatRelativeTime,
  formatEventDescription,
  getEventColor,
  eventColorClasses,
} from "../../lib/event-display.js";

export type RealtimeLogsStatus = "idle" | "connecting" | "live" | "offline" | "error";
export type RealtimeStatusTone = "danger" | "muted" | "pending" | "success";

export interface LogCategoryTab {
  description: string;
  eventName: string;
  label: string;
}

export interface RealtimeStatusMeta {
  label: string;
  tone: RealtimeStatusTone;
}

const logCategoryTabs: LogCategoryTab[] = [
  {
    description: "Show every event for the selected guild.",
    eventName: "",
    label: "All"
  },
  {
    description: "Message create, update, and delete events.",
    eventName: "message",
    label: "Messages"
  },
  {
    description: "Voice join, leave, move, and state updates.",
    eventName: "voice",
    label: "Voice"
  },
  {
    description: "Generated temporary voice channel sessions.",
    eventName: "temp_vc",
    label: "Temp VC"
  },
  {
    description: "Recruitment create, join, leave, and close events.",
    eventName: "recruitment",
    label: "Recruitment"
  },
  {
    description: "Events enriched with Discord Audit Log metadata.",
    eventName: "audit",
    label: "Audit"
  },
  {
    description: "Text-to-speech sessions, spoken messages, and skips.",
    eventName: "tts",
    label: "TTS"
  },
  {
    description: "Bot, database, Redis, VOICEVOX, and handler system events.",
    eventName: "system",
    label: "System"
  }
];

export function getLogCategoryTabs() {
  return logCategoryTabs;
}

export function canViewRawLogPayload(role: DashboardAccessRole | null) {
  return role === "owner" || role === "admin";
}

export function getRealtimeStatusMeta(status: RealtimeLogsStatus): RealtimeStatusMeta {
  if (status === "live") {
    return { label: "Live", tone: "success" };
  }
  if (status === "error") {
    return { label: "Error", tone: "danger" };
  }
  if (status === "connecting") {
    return { label: "Connecting", tone: "pending" };
  }
  if (status === "offline") {
    return { label: "Offline", tone: "muted" };
  }
  return { label: "Idle", tone: "muted" };
}
