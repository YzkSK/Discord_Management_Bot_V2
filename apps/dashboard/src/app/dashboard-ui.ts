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
