export interface DashboardNavItem {
  href: string;
  label: string;
  description: string;
  minRole?: "admin" | "owner";
}

export interface DashboardNavGroup {
  label: string;
  items: DashboardNavItem[];
}

const dashboardNavGroups: DashboardNavGroup[] = [
  {
    label: "Activity",
    items: [
      { href: "/", label: "Overview", description: "KPIs and recent activity" },
      { href: "/logs", label: "Logs", description: "Event history and real-time notifications", minRole: "admin" },
    ],
  },
  {
    label: "Features",
    items: [
      { href: "/panel", label: "Panel", description: "TTS話者・辞書・募集作成" },
      { href: "/voice", label: "Voice", description: "VC sessions and temporary VC management" },
      { href: "/recruitment", label: "Recruitment", description: "Recruitment posts and status management" },
      { href: "/tts", label: "TTS", description: "Text-to-speech configuration" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings", label: "Settings", description: "Server settings and access management" },
      { href: "/health", label: "Health", description: "Dependency service status", minRole: "admin" },
    ],
  },
];

export function getDashboardNavGroups(): DashboardNavGroup[] {
  return dashboardNavGroups;
}

export interface DashboardFilters {
  actorId?: string;
  eventName?: string;
  guildId?: string;
  search?: string;
}

export interface DashboardEventPreset {
  description: string;
  eventName: string;
  label: string;
}

export const dashboardGuildStorageKey = "discord-bot-dashboard:guild-id";

const dashboardNavItems: DashboardNavItem[] = [
  {
    description: "Operational summary and quick checks",
    href: "/",
    label: "Overview"
  },
  {
    description: "Current calls and temporary voice channels",
    href: "/voice",
    label: "Voice"
  },
  {
    description: "Recruitment posts, status, and participant counts",
    href: "/recruitment",
    label: "Recruitment"
  },
  {
    description: "TTS setup, dictionary, and speaker state",
    href: "/tts",
    label: "TTS"
  },
  {
    description: "Dependency status, latency, and errors",
    href: "/health",
    label: "Health"
  },
  {
    description: "Search Discord and feature events",
    href: "/logs",
    label: "Logs"
  },
  {
    description: "Guild settings and access state",
    href: "/settings",
    label: "Settings"
  }
];

const dashboardEventPresets: DashboardEventPreset[] = [
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
  }
];

export function normalizeGuildId(value: string) {
  return value.trim();
}

export function toGuildQueryValue(value: string) {
  const guildId = normalizeGuildId(value);
  return guildId.length > 0 ? guildId : null;
}

export function countActiveFilters(filters: DashboardFilters) {
  return Object.values(filters).filter((value) => Boolean(value?.trim())).length;
}

export function getDashboardNavItems() {
  return dashboardNavItems;
}

export function getDashboardEventPresets() {
  return dashboardEventPresets;
}
