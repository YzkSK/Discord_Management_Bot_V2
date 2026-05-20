export interface DashboardNavItem {
  href: string;
  label: string;
  description: string;
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
