import type { GuildLanguage } from "@discord-bot/shared";

type DashboardLocale = {
  // Settings page
  loadGuild: string;
  guildIdSharedNote: string;
  guildId: string;
  loadSettings: string;
  loading: string;
  settingsSaved: string;
  enterGuildId: string;
  guildSettings: string;
  reviewAccessNote: string;
  guildName: string;
  access: string;
  updated: string;
  logMode: string;
  language: string;
  saveChanges: string;
  saving: string;
  loadGuildFirst: string;
  // Log Mode options
  logModeFull: string;
  logModeMetadataOnly: string;
  logModeDisabled: string;
  // Language options
  languageEn: string;
  languageJa: string;
  // Logs page
  search: string;
  guild: string;
  event: string;
  actor: string;
  reset: string;
  shown: (vars: { count: number }) => string;
  filters: (vars: { count: number }) => string;
  realtimeStatus: (vars: { status: string }) => string;
  loadMore: string;
  enterGuildIdToLoadLogs: string;
  enterGuildIdAndSearch: string;
  received: string;
  summary: string;
  raw: string;
  hide: string;
  view: string;
  loadingLogs: string;
};

const dashboardLocales: Record<GuildLanguage, DashboardLocale> = {
  en: {
    loadGuild: "Load Guild",
    guildIdSharedNote: "This guild ID is shared with Logs in this browser.",
    guildId: "Guild ID",
    loadSettings: "Load Settings",
    loading: "Loading",
    settingsSaved: "Settings saved.",
    enterGuildId: "Enter a guild ID.",
    guildSettings: "Guild Settings",
    reviewAccessNote: "Review access and logging behavior for the loaded guild.",
    guildName: "Guild Name",
    access: "Access",
    updated: "Updated",
    logMode: "Log Mode",
    language: "Language",
    saveChanges: "Save Changes",
    saving: "Saving",
    loadGuildFirst: "Load a guild to review its access role and logging mode.",
    logModeFull: "Full",
    logModeMetadataOnly: "Metadata Only",
    logModeDisabled: "Disabled",
    languageEn: "English",
    languageJa: "日本語",
    search: "Search",
    guild: "Guild",
    event: "Event",
    actor: "Actor",
    reset: "Reset",
    shown: ({ count }) => `${count} shown`,
    filters: ({ count }) => `${count} filters`,
    realtimeStatus: ({ status }) => `realtime ${status}`,
    loadMore: "Load More",
    enterGuildIdToLoadLogs: "Enter a guild ID to load logs.",
    enterGuildIdAndSearch: "Enter a guild ID and search logs.",
    received: "Received",
    summary: "Summary",
    raw: "Raw",
    hide: "Hide",
    view: "View",
    loadingLogs: "Loading logs"
  },
  ja: {
    loadGuild: "Guildを読み込む",
    guildIdSharedNote: "このGuild IDはブラウザ内でLogsと共有されます。",
    guildId: "Guild ID",
    loadSettings: "設定を読み込む",
    loading: "読み込み中",
    settingsSaved: "設定を保存しました。",
    enterGuildId: "Guild IDを入力してください。",
    guildSettings: "Guild設定",
    reviewAccessNote: "読み込んだGuildのアクセス権とログ動作を確認します。",
    guildName: "Guild名",
    access: "アクセス",
    updated: "更新日時",
    logMode: "ログモード",
    language: "言語",
    saveChanges: "変更を保存",
    saving: "保存中",
    loadGuildFirst: "Guildを読み込んでアクセスロールとログモードを確認してください。",
    logModeFull: "フル",
    logModeMetadataOnly: "メタデータのみ",
    logModeDisabled: "無効",
    languageEn: "English",
    languageJa: "日本語",
    search: "検索",
    guild: "Guild",
    event: "イベント",
    actor: "アクター",
    reset: "リセット",
    shown: ({ count }) => `${count}件表示`,
    filters: ({ count }) => `${count}フィルター`,
    realtimeStatus: ({ status }) => `リアルタイム ${status}`,
    loadMore: "さらに読み込む",
    enterGuildIdToLoadLogs: "Guild IDを入力してログを読み込んでください。",
    enterGuildIdAndSearch: "Guild IDを入力してログを検索してください。",
    received: "受信時刻",
    summary: "概要",
    raw: "生データ",
    hide: "非表示",
    view: "表示",
    loadingLogs: "ログ読み込み中"
  }
};

export function getDashboardLocale(lang: GuildLanguage): DashboardLocale {
  return dashboardLocales[lang];
}

export function detectBrowserLanguage(): GuildLanguage {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.startsWith("ja") ? "ja" : "en";
}
