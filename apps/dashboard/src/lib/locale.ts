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
  recruitmentChannelLabel: string;
  recruitmentChannelPlaceholder: string;
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
  ttsDictionaryEntries: string;
  ttsConfiguredStatus: string;
  ttsDisabledDictionaryEntries: string;
  ttsEnabled: string;
  ttsEnabledDictionaryEntries: string;
  ttsFromText: string;
  ttsNotConfiguredStatus: string;
  ttsPageTitle: string;
  ttsPriority: string;
  ttsScope: string;
  ttsSpeakerDefault: string;
  ttsSpeakerDeleted: string;
  ttsSpeakerId: string;
  ttsSpeakerSaved: string;
  ttsSetupCommand: string;
  ttsSourceChannel: string;
  ttsStatus: string;
  ttsToText: string;
  ttsUserSpeakers: string;
  ttsVoiceCommands: string;
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
  humanView: string;
  logCategoryTabs: string;
  rawJsonRestricted: string;
  hide: string;
  view: string;
  loadingLogs: string;
  healthCheckedAt: string;
  healthDependencies: string;
  healthError: string;
  healthFailedToLoad: string;
  healthFailingServices: string;
  healthHealthyServices: string;
  healthLatency: string;
  healthMessage: string;
  healthOk: string;
  healthOverallStatus: string;
  healthPageTitle: string;
  healthRefresh: string;
  healthService: string;
  healthStatus: string;
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
  recruitmentAutoClose: string;
  recruitmentCapacity: string;
  recruitmentClosed: string;
  recruitmentCreateCommand: string;
  recruitmentCreatorId: string;
  recruitmentFailedToLoad: string;
  recruitmentFull: string;
  recruitmentGenre: string;
  recruitmentNoItems: string;
  recruitmentOpen: string;
  recruitmentPageTitle: string;
  recruitmentParticipants: string;
  recruitmentPost: string;
  recruitmentSetupShortcut: string;
  recruitmentStatus: string;
  recruitmentTableTitle: string;
  recruitmentUpdated: string;
  recruitmentVoiceChannelId: string;
  recruitmentDeadlineLabel: string;
  recruitmentDeadlinePlaceholder: string;
  recruitmentDeadlineAbsolute: (vars: { date: string }) => string;
  recruitmentDeadlineHours: (vars: { hours: number; minutes: number }) => string;
  recruitmentDeadlineMinutes: (vars: { minutes: number }) => string;
  // Settings tab placeholders
  tempVcCreateChannelPlaceholder: string;
  tempVcCategoryPlaceholder: string;
  ttsTextChannelPlaceholder: string;
  // Overview client
  overviewActiveVc: string;
  overviewTodayEvents: string;
  overviewOpenRecruitments: string;
  overviewTtsTodayCount: string;
  overviewVoiceDesc: string;
  overviewRecruitmentDesc: string;
  overviewTtsDesc: string;
  overviewLogsDesc: string;
  overviewAccessDesc: string;
  overviewFailedToLoad: string;
  overviewRetry: string;
  overviewActivityChart: string;
  overviewActiveCalls: string;
  overviewRecentActivity: string;
  overviewViewAll: string;
  overviewNoEvents: string;
  overviewMemberCount: (vars: { count: number }) => string;
  // Panel dashboard
  panelDataLoadFailed: string;
  panelServerDefault: string;
  panelSaveFailed: string;
  panelSpeakerChanged: string;
  panelCommunicationError: string;
  panelSpeakerReset: string;
  panelTtsSpeakerSettings: string;
  panelCurrentSetting: string;
  panelSelectSpeaker: string;
  panelSpeakerIdPlaceholder: string;
  panelPreview: string;
  panelSavingEllipsis: string;
  panelChange: string;
  panelReset: string;
  panelRegistrationFailed: string;
  panelRegistered: string;
  panelDeleteFailed: string;
  panelPersonalDictionary: string;
  panelBeforeConversion: string;
  panelAfterConversion: string;
  panelExampleBefore: string;
  panelExampleAfter: string;
  panelRegistering: string;
  panelAdd: string;
  panelNoDictionaryEntries: string;
  panelDelete: string;
  panelConfirmDeleteTitle: string;
  panelConfirmDeleteDesc: (vars: { from: string }) => string;
  panelCreateRecruitment: string;
  panelPostChannel: string;
  panelChannelListError: string;
  panelTitle: string;
  panelExampleTitle: string;
  panelCapacity: string;
  panelCapacityError: string;
  panelContent: string;
  panelContentPlaceholder: string;
  panelDeadline: string;
  panelDeadlinePlaceholder: string;
  panelDeadlineError: string;
  panelFillAllFields: string;
  panelCreating: string;
  panelCreateButton: string;
  panelFillAllFieldsCapacity: string;
  panelSelectChannelPrompt: string;
  panelDeadlineRangeError: string;
  panelCreationFailed: string;
  panelRecruitmentCreated: string;
  // Shared action panel strings
  serverSettings: string;
  ttsDefaultSpeakerReset: string;
  ttsResetFailed: string;
  ttsSelectPlaceholder: string;
  ttsPlayingPreview: string;
  ttsSpeakerListUnavailable: string;
  // Shared UI primitives
  retry: string;
  cancel: string;
  save: string;
  create: string;
  capacity: string;
  copyId: string;
  copied: string;
  clearSelection: string;
  searchByName: string;
  searching: string;
  forbidden: string;
  forbiddenDetail: string;
  // Voice dashboard
  voiceHourLabel: (vars: { h: number }) => string;
  voicePeakHours: string;
  voiceDeletionPending: string;
  voiceDeletionIn: (vars: { seconds: number }) => string;
  voiceRealtimeUpdate: string;
  // Recruitment dashboard
  recruitmentProcessing: string;
  recruitmentReopen: string;
  recruitmentClose: string;
  recruitmentDeadlinePast: string;
  recruitmentCreatedAt: (vars: { time: string }) => string;
  recruitmentNew: string;
  recruitmentActionFailed: string;
  recruitmentMyPosts: string;
  recruitmentNoPosts: string;
  recruitmentCreateHint: string;
  recruitmentNone: string;
  recruitmentDayAfter: (vars: { days: number }) => string;
  recruitmentExampleTitle: string;
  recruitmentDetailPlaceholder: string;
  recruitmentDeadlineSimple: string;
  recruitmentContentLabel: string;
  recruitmentDeadlineDate: (vars: { date: string }) => string;
  recruitmentDeadlineHoursMinutes: (vars: { hours: number; minutes: number }) => string;
  dateLocale: string;
  personUnit: string;
  // TTS dashboard
  ttsPersonalSection: string;
  ttsRegisterServerDict: string;
  ttsPreviewDefault: string;
  ttsRegisterFailed: string;
  ttsExampleBeforeServer: string;
  ttsExampleAfterServer: string;
  ttsRegister: string;
  // DictionaryTable / UserSpeakerTable
  ttsSearchPlaceholder: string;
  ttsResultCount: (vars: { shown: number; total: number }) => string;
  ttsNoSearchResults: string;
  ttsPageInfo: (vars: { page: number; total: number }) => string;
  ttsPrevPage: string;
  ttsNextPage: string;
  ttsUserSearchPlaceholder: string;
  ttsSpeakerLabel: string;
  ttsPreviewAria: (vars: { speaker: string }) => string;
  // TtsUserSettingsModal / TtsUserPersonalCard
  ttsPersonalSpeakerTitle: string;
  ttsNotSet: string;
  ttsPersonalDictTitle: string;
  ttsNoDictEntries: string;
  ttsPersonalSettingsButton: string;
  ttsPersonalSettingsTitle: string;
  ttsPersonalApplied: string;
  ttsNotSetParens: string;
  ttsChangeViaHeader: string;
  ttsRegisterViaHeader: string;
  ttsMoreEntries: (vars: { count: number }) => string;
  ttsLoading: string;
  // AccessGrantsTab
  accessLoadingUser: string;
  accessDeleteGrant: string;
  accessDeleteGrantTitle: string;
  accessDeleteGrantDesc: (vars: { target: string }) => string;
  accessDeleteRoleTitle: string;
  accessDeleteRoleDesc: string;
  // logs-explorer
  logsSearchPlaceholder: string;
  logsLive: string;
  logsNoEventsDisplay: string;
  logsLoading: string;
  logsEventTime: string;
  logsChannelLabel: string;
  logsRecruitmentId: string;
  logsCreatorId: string;
  logsGenre: string;
  logsCapacity: string;
  logsParticipantCount: string;
  logsStatusLabel: string;
  logsVoiceChannelId: string;
  logsReason: string;
  // logs-chart
  logsHourLabel: (vars: { h: number }) => string;
  logsEventFrequency: string;
  // dashboard-shell
  shellExpandSidebar: string;
  shellExpandMenu: string;
  shellClose: string;
  shellCollapseSidebar: string;
  shellServer: string;
  shellChangeServer: string;
  shellChangeServerAria: string;
  shellOpenMenu: string;
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
    recruitmentChannelLabel: "Recruitment Channel",
    recruitmentChannelPlaceholder: "Select recruitment channel (defaults to command channel if not set)",
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
    ttsDictionaryEntries: "Dictionary Entries",
    ttsConfiguredStatus: "Configured",
    ttsDisabledDictionaryEntries: "Disabled Entries",
    ttsEnabled: "Enabled",
    ttsEnabledDictionaryEntries: "Enabled Entries",
    ttsFromText: "From Text",
    ttsNotConfiguredStatus: "Not configured",
    ttsPageTitle: "TTS",
    ttsPriority: "Priority",
    ttsScope: "Scope",
    ttsSpeakerDefault: "Default Speaker ID",
    ttsSpeakerDeleted: "TTS speaker deleted.",
    ttsSpeakerId: "Speaker ID",
    ttsSpeakerSaved: "TTS speaker saved.",
    ttsSetupCommand: "Setup from Discord with /setup tts",
    ttsSourceChannel: "Text Channel",
    ttsStatus: "TTS Status",
    ttsToText: "To Text",
    ttsUserSpeakers: "User Speakers",
    ttsVoiceCommands: "Voice Commands",
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
    humanView: "Human View",
    logCategoryTabs: "Categories",
    rawJsonRestricted: "Raw JSON is available to admins only.",
    hide: "Hide",
    view: "View",
    loadingLogs: "Loading logs",
    healthCheckedAt: "Checked at",
    healthDependencies: "Dependencies",
    healthError: "Error",
    healthFailedToLoad: "Failed to load system health.",
    healthFailingServices: "Failing Services",
    healthHealthyServices: "Healthy Services",
    healthLatency: "Latency",
    healthMessage: "Message",
    healthOk: "OK",
    healthOverallStatus: "Overall Status",
    healthPageTitle: "System Health",
    healthRefresh: "Refresh",
    healthService: "Service",
    healthStatus: "Status",
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
    voiceTempVcChannels: "Temp VC Channels",
    recruitmentAutoClose: "Auto Close",
    recruitmentCapacity: "Capacity",
    recruitmentClosed: "Closed",
    recruitmentCreateCommand: "Create from Discord with /recruitment create",
    recruitmentCreatorId: "Creator ID",
    recruitmentFailedToLoad: "Failed to load recruitments.",
    recruitmentFull: "Full",
    recruitmentGenre: "Genre",
    recruitmentNoItems: "No recruitments found for this guild.",
    recruitmentOpen: "Open",
    recruitmentPageTitle: "Recruitment",
    recruitmentParticipants: "Participants",
    recruitmentPost: "Post",
    recruitmentSetupShortcut: "Setup recruitment channel",
    recruitmentStatus: "Status",
    recruitmentTableTitle: "Recruitment Posts",
    recruitmentUpdated: "Updated",
    recruitmentVoiceChannelId: "Voice Channel ID",
    recruitmentDeadlineLabel: "Deadline (days)",
    recruitmentDeadlinePlaceholder: "1–30 (default: 7 days)",
    recruitmentDeadlineAbsolute: ({ date }) => `Closes: ${date}`,
    recruitmentDeadlineHours: ({ hours, minutes }) => `Closes in ${hours}h ${minutes}m`,
    recruitmentDeadlineMinutes: ({ minutes }) => `Closes in ${minutes}m`,
    tempVcCreateChannelPlaceholder: "Select voice channel",
    tempVcCategoryPlaceholder: "Select category",
    ttsTextChannelPlaceholder: "Select TTS channel",
    overviewActiveVc: "Active VC",
    overviewTodayEvents: "Today's Events",
    overviewOpenRecruitments: "Open Recruitments",
    overviewTtsTodayCount: "TTS Today",
    overviewVoiceDesc: "Voice Status",
    overviewRecruitmentDesc: "Recruitment",
    overviewTtsDesc: "Text-to-Speech",
    overviewLogsDesc: "Event Logs",
    overviewAccessDesc: "Access Control",
    overviewFailedToLoad: "Failed to load data",
    overviewRetry: "Retry",
    overviewActivityChart: "7-Day Activity",
    overviewActiveCalls: "Active Calls",
    overviewRecentActivity: "Recent Activity",
    overviewViewAll: "View All",
    overviewNoEvents: "No events",
    overviewMemberCount: ({ count }) => `${count} members`,
    panelDataLoadFailed: "Failed to load data.",
    panelServerDefault: "Server default",
    panelSaveFailed: "Failed to save.",
    panelSpeakerChanged: "Speaker updated.",
    panelCommunicationError: "Communication error.",
    panelSpeakerReset: "Personal settings reset. Server default will be used.",
    panelTtsSpeakerSettings: "TTS Speaker Settings",
    panelCurrentSetting: "Current:",
    panelSelectSpeaker: "Select Speaker",
    panelSpeakerIdPlaceholder: "Speaker ID",
    panelPreview: "Preview",
    panelSavingEllipsis: "Saving...",
    panelChange: "Change",
    panelReset: "Reset",
    panelRegistrationFailed: "Registration failed.",
    panelRegistered: "Registered.",
    panelDeleteFailed: "Failed to delete.",
    panelPersonalDictionary: "Personal Dictionary",
    panelBeforeConversion: "Before",
    panelAfterConversion: "After",
    panelExampleBefore: "e.g. hoge",
    panelExampleAfter: "e.g. hogei",
    panelRegistering: "Adding...",
    panelAdd: "Add",
    panelNoDictionaryEntries: "No dictionary entries registered.",
    panelDelete: "Delete",
    panelConfirmDeleteTitle: "Delete dictionary entry?",
    panelConfirmDeleteDesc: ({ from }) => `This will delete the rule for "${from}".`,
    panelCreateRecruitment: "Create Recruitment",
    panelPostChannel: "Post Channel",
    panelChannelListError: "Failed to get channel list. Configure recruitment channel in server settings.",
    panelTitle: "Title",
    panelExampleTitle: "e.g. Genshin - Spiral Abyss 12",
    panelCapacity: "Capacity (1–99)",
    panelCapacityError: "Enter an integer from 1 to 99",
    panelContent: "Content",
    panelContentPlaceholder: "Enter recruitment description...",
    panelDeadline: "Deadline (days, default 7)",
    panelDeadlinePlaceholder: "1–30",
    panelDeadlineError: "Enter an integer from 1 to 30",
    panelFillAllFields: "Please fill in all fields correctly",
    panelCreating: "Creating...",
    panelCreateButton: "Create Recruitment",
    panelFillAllFieldsCapacity: "Please fill in all fields correctly (capacity: 1–99).",
    panelSelectChannelPrompt: "Please select a post channel.",
    panelDeadlineRangeError: "Please enter a deadline from 1 to 30 days.",
    panelCreationFailed: "Failed to create.",
    panelRecruitmentCreated: "Recruitment created.",
    serverSettings: "Server Settings",
    ttsDefaultSpeakerReset: "Default speaker reset.",
    ttsResetFailed: "Failed to reset.",
    ttsSelectPlaceholder: "Select",
    ttsPlayingPreview: "Playing...",
    ttsSpeakerListUnavailable: "Speaker list unavailable",
    // Shared UI primitives
    retry: "Retry",
    cancel: "Cancel",
    save: "Save",
    create: "Create",
    capacity: "Capacity",
    copyId: "Copy ID",
    copied: "Copied",
    clearSelection: "Clear selection",
    searchByName: "Search by name...",
    searching: "Searching...",
    forbidden: "Access denied",
    forbiddenDetail: "You need admin or higher to view this page.",
    // Voice dashboard
    voiceHourLabel: ({ h }: { h: number }) => `${h}:00`,
    voicePeakHours: "Peak Hours",
    voiceDeletionPending: "Pending deletion",
    voiceDeletionIn: ({ seconds }: { seconds: number }) => `Deletes in ${seconds}s`,
    voiceRealtimeUpdate: "Real-time updates",
    // Recruitment dashboard
    recruitmentProcessing: "Processing...",
    recruitmentReopen: "Reopen",
    recruitmentClose: "Close",
    recruitmentDeadlinePast: "Deadline passed",
    recruitmentCreatedAt: ({ time }: { time: string }) => `${time} ago`,
    recruitmentNew: "New Recruitment",
    recruitmentActionFailed: "Action failed.",
    recruitmentMyPosts: "My Recruitments",
    recruitmentNoPosts: "No recruitments",
    recruitmentCreateHint: "Use 'Create Recruitment' to post a new one.",
    recruitmentNone: "None",
    recruitmentDayAfter: ({ days }: { days: number }) => `${days} day${days > 1 ? "s" : ""} from now`,
    recruitmentExampleTitle: "e.g. APEX Ranked",
    recruitmentDetailPlaceholder: "Enter recruitment details",
    recruitmentDeadlineSimple: "Deadline",
    recruitmentContentLabel: "Content",
    recruitmentDeadlineDate: ({ date }: { date: string }) => `Deadline: ${date}`,
    recruitmentDeadlineHoursMinutes: ({ hours, minutes }: { hours: number; minutes: number }) => `Time left: ${hours}h ${minutes}m`,
    dateLocale: "en-US",
    personUnit: "",
    // TTS dashboard
    ttsPersonalSection: "Personal",
    ttsRegisterServerDict: "Register word (server dictionary)",
    ttsPreviewDefault: "Preview server default speaker",
    ttsRegisterFailed: "Failed to register.",
    ttsExampleBeforeServer: "e.g. Discord",
    ttsExampleAfterServer: "e.g. Discōdo",
    ttsRegister: "Register",
    // DictionaryTable / UserSpeakerTable
    ttsSearchPlaceholder: "Search before/after...",
    ttsResultCount: ({ shown, total }: { shown: number; total: number }) => `${shown} / ${total}`,
    ttsNoSearchResults: "No results",
    ttsPageInfo: ({ page, total }: { page: number; total: number }) => `Page ${page} of ${total}`,
    ttsPrevPage: "‹ Prev",
    ttsNextPage: "Next ›",
    ttsUserSearchPlaceholder: "Search by user ID...",
    ttsSpeakerLabel: "Speaker",
    ttsPreviewAria: ({ speaker }: { speaker: string }) => `Preview ${speaker}`,
    // TtsUserSettingsModal / TtsUserPersonalCard
    ttsPersonalSpeakerTitle: "Personal Speaker Settings",
    ttsNotSet: "Not set (server default)",
    ttsPersonalDictTitle: "Personal Dictionary",
    ttsNoDictEntries: "No personal dictionary entries",
    ttsPersonalSettingsButton: "Personal",
    ttsPersonalSettingsTitle: "Personal TTS Settings",
    ttsPersonalApplied: "Personal settings applied",
    ttsNotSetParens: "(not set)",
    ttsChangeViaHeader: 'Change via "Personal" in the header',
    ttsRegisterViaHeader: 'Register via "Personal" in the header',
    ttsMoreEntries: ({ count }: { count: number }) => `${count} more...`,
    ttsLoading: "Loading...",
    // AccessGrantsTab
    accessLoadingUser: "Loading user info...",
    accessDeleteGrant: "Delete access",
    accessDeleteGrantTitle: "Delete access grant?",
    accessDeleteGrantDesc: ({ target }: { target: string }) => `Remove access for ${target}.`,
    accessDeleteRoleTitle: "Remove management role?",
    accessDeleteRoleDesc: "Removing this role will revoke access for users who only have it.",
    // logs-explorer
    logsSearchPlaceholder: "Search events...",
    logsLive: "Live",
    logsNoEventsDisplay: "No events to display",
    logsLoading: "Loading...",
    logsEventTime: "Event Time",
    logsChannelLabel: "Channel",
    logsRecruitmentId: "Recruitment ID",
    logsCreatorId: "Creator",
    logsGenre: "Genre",
    logsCapacity: "Capacity",
    logsParticipantCount: "Participants",
    logsStatusLabel: "Status",
    logsVoiceChannelId: "Voice Channel ID",
    logsReason: "Reason",
    // logs-chart
    logsHourLabel: ({ h }: { h: number }) => `${h}:00`,
    logsEventFrequency: "Event Frequency (Last 24h)",
    // dashboard-shell
    shellExpandSidebar: "Expand sidebar",
    shellExpandMenu: "Expand menu",
    shellClose: "Close",
    shellCollapseSidebar: "Collapse sidebar",
    shellServer: "Server",
    shellChangeServer: "Change",
    shellChangeServerAria: "Change server",
    shellOpenMenu: "Open menu",
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
    recruitmentChannelLabel: "募集チャンネル",
    recruitmentChannelPlaceholder: "募集チャンネルを選択（未設定時はコマンドチャンネルを使用）",
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
    ttsDictionaryEntries: "辞書エントリ",
    ttsConfiguredStatus: "設定済み",
    ttsDisabledDictionaryEntries: "無効な辞書",
    ttsEnabled: "有効",
    ttsEnabledDictionaryEntries: "有効な辞書",
    ttsFromText: "置換前",
    ttsNotConfiguredStatus: "未設定",
    ttsPageTitle: "TTS",
    ttsPriority: "優先度",
    ttsScope: "範囲",
    ttsSpeakerDefault: "デフォルト話者ID",
    ttsSpeakerDeleted: "TTS話者を削除しました。",
    ttsSpeakerId: "話者ID",
    ttsSpeakerSaved: "TTS話者を保存しました。",
    ttsSetupCommand: "Discordで /setup tts から設定",
    ttsSourceChannel: "テキストチャンネル",
    ttsStatus: "TTS状態",
    ttsToText: "置換後",
    ttsUserSpeakers: "ユーザー別話者",
    ttsVoiceCommands: "通話コマンド",
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
    humanView: "見やすい表示",
    logCategoryTabs: "カテゴリ",
    rawJsonRestricted: "Raw JSONはadmin以上のみ表示できます。",
    hide: "非表示",
    view: "表示",
    loadingLogs: "ログ読み込み中",
    healthCheckedAt: "確認時刻",
    healthDependencies: "依存サービス",
    healthError: "異常",
    healthFailedToLoad: "システム状態の読み込みに失敗しました。",
    healthFailingServices: "異常サービス",
    healthHealthyServices: "正常サービス",
    healthLatency: "応答時間",
    healthMessage: "メッセージ",
    healthOk: "正常",
    healthOverallStatus: "全体状態",
    healthPageTitle: "システム状態",
    healthRefresh: "再読み込み",
    healthService: "サービス",
    healthStatus: "状態",
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
    voiceTempVcChannels: "一時VC",
    recruitmentAutoClose: "自動締切",
    recruitmentCapacity: "定員",
    recruitmentClosed: "締切",
    recruitmentCreateCommand: "Discordで /recruitment create から作成",
    recruitmentCreatorId: "作成者ID",
    recruitmentFailedToLoad: "募集の読み込みに失敗しました。",
    recruitmentFull: "満員",
    recruitmentGenre: "ジャンル",
    recruitmentNoItems: "このGuildの募集はありません。",
    recruitmentOpen: "募集中",
    recruitmentPageTitle: "募集",
    recruitmentParticipants: "参加者",
    recruitmentPost: "投稿",
    recruitmentSetupShortcut: "募集チャンネル設定",
    recruitmentStatus: "状態",
    recruitmentTableTitle: "募集一覧",
    recruitmentUpdated: "更新",
    recruitmentVoiceChannelId: "VC ID",
    recruitmentDeadlineLabel: "締め切り（日数）",
    recruitmentDeadlinePlaceholder: "1〜30（省略で7日）",
    recruitmentDeadlineAbsolute: ({ date }) => `締め切り：${date}`,
    recruitmentDeadlineHours: ({ hours, minutes }) => `締め切りまで ${hours}時間${minutes}分`,
    recruitmentDeadlineMinutes: ({ minutes }) => `締め切りまで ${minutes}分`,
    tempVcCreateChannelPlaceholder: "ボイスチャンネルを選択",
    tempVcCategoryPlaceholder: "カテゴリを選択",
    ttsTextChannelPlaceholder: "TTSチャンネルを選択",
    overviewActiveVc: "アクティブ VC",
    overviewTodayEvents: "今日のイベント",
    overviewOpenRecruitments: "進行中の募集",
    overviewTtsTodayCount: "今日のTTS起動数",
    overviewVoiceDesc: "通話状況",
    overviewRecruitmentDesc: "募集管理",
    overviewTtsDesc: "音声読み上げ",
    overviewLogsDesc: "イベントログ",
    overviewAccessDesc: "アクセス管理",
    overviewFailedToLoad: "データの取得に失敗しました",
    overviewRetry: "再試行",
    overviewActivityChart: "7日間のアクティビティ",
    overviewActiveCalls: "アクティブ通話",
    overviewRecentActivity: "最近のアクティビティ",
    overviewViewAll: "すべて見る",
    overviewNoEvents: "イベントがありません",
    overviewMemberCount: ({ count }) => `${count}人`,
    panelDataLoadFailed: "データの読み込みに失敗しました。",
    panelServerDefault: "サーバーデフォルト",
    panelSaveFailed: "保存に失敗しました。",
    panelSpeakerChanged: "話者を変更しました。",
    panelCommunicationError: "通信エラーが発生しました。",
    panelSpeakerReset: "個人設定をリセットしました。サーバーデフォルトが使用されます。",
    panelTtsSpeakerSettings: "TTS 話者設定",
    panelCurrentSetting: "現在の設定:",
    panelSelectSpeaker: "話者を選択",
    panelSpeakerIdPlaceholder: "スピーカーID",
    panelPreview: "試聴",
    panelSavingEllipsis: "保存中...",
    panelChange: "変更",
    panelReset: "リセット",
    panelRegistrationFailed: "登録に失敗しました。",
    panelRegistered: "登録しました。",
    panelDeleteFailed: "削除に失敗しました。",
    panelPersonalDictionary: "辞書登録（個人）",
    panelBeforeConversion: "変換前",
    panelAfterConversion: "変換後",
    panelExampleBefore: "例: ほげ",
    panelExampleAfter: "例: ほうげい",
    panelRegistering: "登録中...",
    panelAdd: "追加",
    panelNoDictionaryEntries: "登録された辞書エントリはありません。",
    panelDelete: "削除",
    panelConfirmDeleteTitle: "辞書エントリを削除しますか？",
    panelConfirmDeleteDesc: ({ from }) => `「${from}」の変換ルールを削除します。`,
    panelCreateRecruitment: "募集作成",
    panelPostChannel: "投稿先チャンネル",
    panelChannelListError: "チャンネル一覧を取得できませんでした。サーバー設定から募集チャンネルを設定してください。",
    panelTitle: "タイトル",
    panelExampleTitle: "例: 原神　螺旋12層",
    panelCapacity: "定員（1〜99）",
    panelCapacityError: "1〜99の整数を入力してください",
    panelContent: "内容",
    panelContentPlaceholder: "募集の説明を入力...",
    panelDeadline: "締め切り（日数・省略で7日）",
    panelDeadlinePlaceholder: "1〜30",
    panelDeadlineError: "1〜30の整数を入力してください",
    panelFillAllFields: "全項目を正しく入力してください",
    panelCreating: "作成中...",
    panelCreateButton: "募集を作成",
    panelFillAllFieldsCapacity: "全項目を正しく入力してください（定員: 1〜99）。",
    panelSelectChannelPrompt: "投稿先チャンネルを選択してください。",
    panelDeadlineRangeError: "締め切りは1〜30の整数を入力してください。",
    panelCreationFailed: "作成に失敗しました。",
    panelRecruitmentCreated: "募集を作成しました。",
    serverSettings: "サーバー設定",
    ttsDefaultSpeakerReset: "サーバーデフォルト話者をリセットしました。",
    ttsResetFailed: "リセットに失敗しました",
    ttsSelectPlaceholder: "選択してください",
    ttsPlayingPreview: "再生中...",
    ttsSpeakerListUnavailable: "話者リストを取得できません",
    // Shared UI primitives
    retry: "再試行",
    cancel: "キャンセル",
    save: "保存",
    create: "作成",
    capacity: "定員",
    copyId: "IDをコピー",
    copied: "コピーしました",
    clearSelection: "選択を解除",
    searchByName: "名前で検索...",
    searching: "検索中...",
    forbidden: "アクセス権限がありません",
    forbiddenDetail: "このページを表示するには管理者以上の権限が必要です。",
    // Voice dashboard
    voiceHourLabel: ({ h }: { h: number }) => `${h}時`,
    voicePeakHours: "ピーク時間帯",
    voiceDeletionPending: "削除保留中",
    voiceDeletionIn: ({ seconds }: { seconds: number }) => `あと${seconds}秒で削除`,
    voiceRealtimeUpdate: "リアルタイム更新",
    // Recruitment dashboard
    recruitmentProcessing: "処理中...",
    recruitmentReopen: "再オープン",
    recruitmentClose: "締め切る",
    recruitmentDeadlinePast: "締め切り済み",
    recruitmentCreatedAt: ({ time }: { time: string }) => `${time} 作成`,
    recruitmentNew: "新しい募集",
    recruitmentActionFailed: "操作に失敗しました",
    recruitmentMyPosts: "自分の募集",
    recruitmentNoPosts: "募集がありません",
    recruitmentCreateHint: "「募集を作成」から新しい募集を投稿できます",
    recruitmentNone: "なし",
    recruitmentDayAfter: ({ days }: { days: number }) => `${days}日後`,
    recruitmentExampleTitle: "例：APEX ランク一緒に",
    recruitmentDetailPlaceholder: "募集の詳細を入力してください",
    recruitmentDeadlineSimple: "締め切り",
    recruitmentContentLabel: "募集内容",
    recruitmentDeadlineDate: ({ date }: { date: string }) => `締め切り：${date}`,
    recruitmentDeadlineHoursMinutes: ({ hours, minutes }: { hours: number; minutes: number }) => `締め切りまで ${hours}時間${minutes}分`,
    dateLocale: "ja-JP",
    personUnit: "人",
    // TTS dashboard
    ttsPersonalSection: "個人設定",
    ttsRegisterServerDict: "新しい単語を登録（サーバー辞書）",
    ttsPreviewDefault: "サーバーデフォルト話者を試聴",
    ttsRegisterFailed: "登録に失敗しました",
    ttsExampleBeforeServer: "例: Discord",
    ttsExampleAfterServer: "例: ディスコード",
    ttsRegister: "登録",
    // DictionaryTable / UserSpeakerTable
    ttsSearchPlaceholder: "変換前・変換後で検索...",
    ttsResultCount: ({ shown, total }: { shown: number; total: number }) => `${shown} / ${total} 件`,
    ttsNoSearchResults: "検索結果がありません",
    ttsPageInfo: ({ page, total }: { page: number; total: number }) => `${page} / ${total} ページ`,
    ttsPrevPage: "‹ 前",
    ttsNextPage: "次 ›",
    ttsUserSearchPlaceholder: "ユーザーIDで検索...",
    ttsSpeakerLabel: "話者",
    ttsPreviewAria: ({ speaker }: { speaker: string }) => `${speaker} を試聴`,
    // TtsUserSettingsModal / TtsUserPersonalCard
    ttsPersonalSpeakerTitle: "個人話者設定",
    ttsNotSet: "未設定（サーバーデフォルト）",
    ttsPersonalDictTitle: "個人辞書",
    ttsNoDictEntries: "個人辞書エントリがありません",
    ttsPersonalSettingsButton: "個人設定",
    ttsPersonalSettingsTitle: "個人TTS設定",
    ttsPersonalApplied: "個人設定が適用されています",
    ttsNotSetParens: "（未設定）",
    ttsChangeViaHeader: "ヘッダーの「個人設定」から変更できます",
    ttsRegisterViaHeader: "ヘッダーの「個人設定」から登録できます",
    ttsMoreEntries: ({ count }: { count: number }) => `他 ${count} 件...`,
    ttsLoading: "読み込み中...",
    // AccessGrantsTab
    accessLoadingUser: "ユーザー情報を読み込み中...",
    accessDeleteGrant: "アクセス権限を削除",
    accessDeleteGrantTitle: "アクセス権限を削除しますか？",
    accessDeleteGrantDesc: ({ target }: { target: string }) => `${target} の権限を削除します。`,
    accessDeleteRoleTitle: "管理ロールを削除しますか？",
    accessDeleteRoleDesc: "既存の管理ロールを外すと、そのロールを持つユーザーがダッシュボードにアクセスできなくなります。",
    // logs-explorer
    logsSearchPlaceholder: "イベントを検索...",
    logsLive: "ライブ",
    logsNoEventsDisplay: "表示するイベントがありません",
    logsLoading: "読み込み中...",
    logsEventTime: "イベント時刻",
    logsChannelLabel: "チャンネル",
    logsRecruitmentId: "募集ID",
    logsCreatorId: "作成者",
    logsGenre: "ジャンル",
    logsCapacity: "定員",
    logsParticipantCount: "参加者数",
    logsStatusLabel: "ステータス",
    logsVoiceChannelId: "VCチャンネルID",
    logsReason: "理由",
    // logs-chart
    logsHourLabel: ({ h }: { h: number }) => `${h}時`,
    logsEventFrequency: "直近24時間のイベント頻度",
    // dashboard-shell
    shellExpandSidebar: "サイドバーを展開",
    shellExpandMenu: "メニューを展開",
    shellClose: "閉じる",
    shellCollapseSidebar: "サイドバーを折りたたむ",
    shellServer: "サーバー",
    shellChangeServer: "変更",
    shellChangeServerAria: "サーバーを変更",
    shellOpenMenu: "メニューを開く",
  }
};

export function getDashboardLocale(lang: GuildLanguage): DashboardLocale {
  return dashboardLocales[lang];
}

export function detectBrowserLanguage(): GuildLanguage {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.startsWith("ja") ? "ja" : "en";
}
