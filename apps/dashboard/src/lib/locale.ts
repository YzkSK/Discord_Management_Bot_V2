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
  // Settings panel sections (UI branch)
  guildInfo: string;
  dashboardAccess: string;
  dashboardAccessNote: string;
  saveRoles: string;
  savingRoles: string;
  accessRolesUpdated: string;
  failedToLoadSettings: string;
  settingsOverview: string;
  logsSettings: string;
  tempVcSettings: string;
  ttsSettings: string;
  recruitmentSettings: string;
  configured: string;
  notConfigured: string;
  readOnly: string;
  tempVcCreateChannelId: string;
  tempVcCategoryId: string;
  ttsTextChannelId: string;
  recruitmentMarker: string;
  saveTempVcSettings: string;
  saveTtsSettings: string;
  tempVcSettingsSaved: string;
  ttsSettingsSaved: string;
  ttsDictionary: string;
  ttsDictionarySaved: string;
  ttsDictionaryDeleted: string;
  ttsEnabled: string;
  ttsFromText: string;
  ttsPriority: string;
  ttsScope: string;
  ttsSpeakerDefault: string;
  ttsSpeakerDeleted: string;
  ttsSpeakerId: string;
  ttsSpeakerSaved: string;
  ttsToText: string;
  ttsUserSpeakers: string;
  accessGrantTarget: string;
  accessGrantUser: string;
  accessGrantRole: string;
  accessGrantUserId: string;
  accessGrantRoleId: string;
  accessGrantSelectRole: string;
  accessGrantAccess: string;
  accessGrantAction: string;
  accessGrantViewer: string;
  accessGrantAdmin: string;
  accessGrantSave: string;
  accessGrantSaved: string;
  accessGrantUpdated: string;
  accessGrantDeleted: string;
  accessGrantTargetRequired: string;
  accessGrantId: string;
  noAccessGrants: string;
  managementRoleShortcutNote: string;
  // Logs page
  search: string;
  guild: string;
  event: string;
  actor: string;
  reset: string;
  noLogsFound: string;
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
  voiceActiveCalls: string;
  voiceChannelId: string;
  voiceControlChannelId: string;
  voiceDuration: string;
  voiceFailedToLoad: string;
  voiceMembers: string;
  voiceNoActiveCalls: string;
  voiceNoRecentCalls: string;
  voiceNoTempVcChannels: string;
  voiceOwnerId: string;
  voiceRecentCalls: string;
  voiceSetupShortcuts: string;
  voiceStatusSetup: string;
  voiceTempVc: string;
  voiceTempVcChannels: string;
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
    guildInfo: "Guild Info",
    dashboardAccess: "Dashboard Access",
    dashboardAccessNote: "Roles that can access the dashboard in addition to server owner and administrators.",
    saveRoles: "Save Roles",
    savingRoles: "Saving…",
    accessRolesUpdated: "Access roles updated.",
    failedToLoadSettings: "Failed to load settings.",
    settingsOverview: "Overview",
    logsSettings: "Logs",
    tempVcSettings: "Temp VC",
    ttsSettings: "TTS",
    recruitmentSettings: "Recruitment",
    configured: "Configured",
    notConfigured: "Not configured",
    readOnly: "Read-only",
    tempVcCreateChannelId: "Creation Channel ID",
    tempVcCategoryId: "Category ID",
    ttsTextChannelId: "TTS Text Channel ID",
    recruitmentMarker: "Channel Marker",
    saveTempVcSettings: "Save Temp VC",
    saveTtsSettings: "Save TTS",
    tempVcSettingsSaved: "Temp VC settings saved.",
    ttsSettingsSaved: "TTS settings saved.",
    ttsDictionary: "Dictionary",
    ttsDictionarySaved: "TTS dictionary entry saved.",
    ttsDictionaryDeleted: "TTS dictionary entry deleted.",
    ttsEnabled: "Enabled",
    ttsFromText: "From Text",
    ttsPriority: "Priority",
    ttsScope: "Scope",
    ttsSpeakerDefault: "Default Speaker ID",
    ttsSpeakerDeleted: "TTS speaker deleted.",
    ttsSpeakerId: "Speaker ID",
    ttsSpeakerSaved: "TTS speaker saved.",
    ttsToText: "To Text",
    ttsUserSpeakers: "User Speakers",
    accessGrantTarget: "Target",
    accessGrantUser: "User",
    accessGrantRole: "Role",
    accessGrantUserId: "User ID",
    accessGrantRoleId: "Role ID",
    accessGrantSelectRole: "Select role",
    accessGrantAccess: "Access",
    accessGrantAction: "Action",
    accessGrantViewer: "Viewer",
    accessGrantAdmin: "Admin",
    accessGrantSave: "Save Grant",
    accessGrantSaved: "Dashboard access grant saved.",
    accessGrantUpdated: "Dashboard access grant updated.",
    accessGrantDeleted: "Dashboard access grant deleted.",
    accessGrantTargetRequired: "Target ID is required.",
    accessGrantId: "ID",
    noAccessGrants: "No explicit dashboard access grants.",
    managementRoleShortcutNote: "Existing management role shortcut. Selected roles receive admin access.",
    search: "Search",
    guild: "Guild",
    event: "Event",
    actor: "Actor",
    reset: "Reset",
    shown: ({ count }) => `${count} shown`,
    filters: ({ count }) => `${count} filters`,
    realtimeStatus: ({ status }) => `realtime ${status}`,
    loadMore: "Load More",
    noLogsFound: "No logs found for this guild.",
    enterGuildIdToLoadLogs: "Enter a guild ID to load logs.",
    enterGuildIdAndSearch: "Enter a guild ID and search logs.",
    received: "Received",
    summary: "Summary",
    raw: "Raw",
    hide: "Hide",
    view: "View",
    loadingLogs: "Loading logs",
    voiceActiveCalls: "Active Calls",
    voiceChannelId: "Channel ID",
    voiceControlChannelId: "Control Channel ID",
    voiceDuration: "Duration",
    voiceFailedToLoad: "Failed to load voice state.",
    voiceMembers: "Members",
    voiceNoActiveCalls: "No active calls.",
    voiceNoRecentCalls: "No recent calls.",
    voiceNoTempVcChannels: "No active Temp VC channels.",
    voiceOwnerId: "Owner ID",
    voiceRecentCalls: "Recent Calls",
    voiceSetupShortcuts: "Setup Shortcuts",
    voiceStatusSetup: "Voice Status Setup",
    voiceTempVc: "Temp VC",
    voiceTempVcChannels: "Temp VC Channels"
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
    guildInfo: "Guild情報",
    dashboardAccess: "ダッシュボードアクセス",
    dashboardAccessNote: "サーバーオーナーと管理者に加えて、ダッシュボードにアクセスできるロールです。",
    saveRoles: "ロールを保存",
    savingRoles: "保存中…",
    accessRolesUpdated: "アクセスロールを更新しました。",
    failedToLoadSettings: "設定の読み込みに失敗しました。",
    settingsOverview: "概要",
    logsSettings: "ログ",
    tempVcSettings: "一時VC",
    ttsSettings: "TTS",
    recruitmentSettings: "募集",
    configured: "設定済み",
    notConfigured: "未設定",
    readOnly: "閲覧のみ",
    tempVcCreateChannelId: "作成チャンネルID",
    tempVcCategoryId: "カテゴリID",
    ttsTextChannelId: "TTSテキストチャンネルID",
    recruitmentMarker: "チャンネルマーカー",
    saveTempVcSettings: "一時VCを保存",
    saveTtsSettings: "TTSを保存",
    tempVcSettingsSaved: "一時VC設定を保存しました。",
    ttsSettingsSaved: "TTS設定を保存しました。",
    ttsDictionary: "辞書",
    ttsDictionarySaved: "TTS辞書を保存しました。",
    ttsDictionaryDeleted: "TTS辞書を削除しました。",
    ttsEnabled: "有効",
    ttsFromText: "置換前",
    ttsPriority: "優先度",
    ttsScope: "範囲",
    ttsSpeakerDefault: "デフォルト話者ID",
    ttsSpeakerDeleted: "TTS話者を削除しました。",
    ttsSpeakerId: "話者ID",
    ttsSpeakerSaved: "TTS話者を保存しました。",
    ttsToText: "置換後",
    ttsUserSpeakers: "ユーザー別話者",
    accessGrantTarget: "対象",
    accessGrantUser: "ユーザー",
    accessGrantRole: "ロール",
    accessGrantUserId: "ユーザーID",
    accessGrantRoleId: "ロールID",
    accessGrantSelectRole: "ロールを選択",
    accessGrantAccess: "アクセス権限",
    accessGrantAction: "操作",
    accessGrantViewer: "閲覧者",
    accessGrantAdmin: "管理者",
    accessGrantSave: "権限を保存",
    accessGrantSaved: "ダッシュボードアクセス権限を保存しました。",
    accessGrantUpdated: "ダッシュボードアクセス権限を更新しました。",
    accessGrantDeleted: "ダッシュボードアクセス権限を削除しました。",
    accessGrantTargetRequired: "対象IDを入力してください。",
    accessGrantId: "ID",
    noAccessGrants: "明示的なダッシュボードアクセス権限はありません。",
    managementRoleShortcutNote: "既存の管理ロールショートカットです。選択したロールには管理者権限が付与されます。",
    search: "検索",
    guild: "Guild",
    event: "イベント",
    actor: "アクター",
    reset: "リセット",
    shown: ({ count }) => `${count}件表示`,
    filters: ({ count }) => `${count}フィルター`,
    realtimeStatus: ({ status }) => `リアルタイム ${status}`,
    loadMore: "さらに読み込む",
    noLogsFound: "このGuildのログが見つかりませんでした。",
    enterGuildIdToLoadLogs: "Guild IDを入力してログを読み込んでください。",
    enterGuildIdAndSearch: "Guild IDを入力してログを検索してください。",
    received: "受信時刻",
    summary: "概要",
    raw: "生データ",
    hide: "非表示",
    view: "表示",
    loadingLogs: "ログ読み込み中",
    voiceActiveCalls: "通話中",
    voiceChannelId: "チャンネルID",
    voiceControlChannelId: "操作チャンネルID",
    voiceDuration: "通話時間",
    voiceFailedToLoad: "通話状態の読み込みに失敗しました。",
    voiceMembers: "参加人数",
    voiceNoActiveCalls: "現在通話中のVCはありません。",
    voiceNoRecentCalls: "最近の通話はありません。",
    voiceNoTempVcChannels: "有効な一時VCはありません。",
    voiceOwnerId: "所有者ID",
    voiceRecentCalls: "最近の通話",
    voiceSetupShortcuts: "セットアップ導線",
    voiceStatusSetup: "通話状態表示の設定",
    voiceTempVc: "一時VC",
    voiceTempVcChannels: "一時VC"
  }
};

export function getDashboardLocale(lang: GuildLanguage): DashboardLocale {
  return dashboardLocales[lang];
}

export function detectBrowserLanguage(): GuildLanguage {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.startsWith("ja") ? "ja" : "en";
}
