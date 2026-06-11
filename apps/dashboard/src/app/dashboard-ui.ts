export interface DashboardNavItem {
  href: string;
  label: string;
  description: string;
}

export interface DashboardNavGroup {
  label: string;
  items: DashboardNavItem[];
}

const dashboardNavGroups: DashboardNavGroup[] = [
  {
    label: "アクティビティ",
    items: [
      { href: "/", label: "概要", description: "KPIと最近のアクティビティ" },
      { href: "/logs", label: "ログ", description: "イベント履歴とリアルタイム通知" },
    ],
  },
  {
    label: "機能",
    items: [
      { href: "/voice", label: "音声", description: "VCセッションと一時VC管理" },
      { href: "/recruitment", label: "募集", description: "募集投稿とステータス管理" },
      { href: "/tts", label: "TTS", description: "テキスト読み上げの設定" },
    ],
  },
  {
    label: "システム",
    items: [
      { href: "/settings", label: "設定", description: "サーバー設定とアクセス管理" },
      { href: "/health", label: "ヘルス", description: "依存サービスの状態" },
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
