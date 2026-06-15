export const guildLanguages = ["en", "ja"] as const;
export type GuildLanguage = (typeof guildLanguages)[number];

export function isGuildLanguage(value: string): value is GuildLanguage {
  return (guildLanguages as readonly string[]).includes(value);
}

type Locale = {
  logTitle: (vars: { eventName: string }) => string;
  logActor: (vars: { actorId: string }) => string;
  logActorUnknown: string;
  logChannel: (vars: { channelId: string }) => string;
  logChannelNamed: (vars: { name: string }) => string;
  logChannelUnknown: string;
  logMessageId: (vars: { messageId: string }) => string;
  logEventTime: (vars: { timestamp: string }) => string;
  logContent: (vars: { content: string }) => string;
  logDetails: (vars: { details: string }) => string;
  logDetailsNone: string;
  setupFailed: string;
  notInGuild: string;
  noManagePermission: string;
  unknownSetupTarget: (vars: { target: string }) => string;
  tempVcSetupFailed: string;
  tempVcCreationChannelMustBeVoice: string;
  tempVcCategoryMustBeCategory: string;
  tempVcSetupComplete: string;
  tempVcCreationChannel: (vars: { id: string }) => string;
  tempVcCategory: (vars: { id: string }) => string;
  tempVcCategorySame: string;
  logsSetupFailed: string;
  logsChannelMustBeText: string;
  logsSetupComplete: string;
  logsChannel: (vars: { id: string }) => string;
  logsMarker: (vars: { marker: string }) => string;
  recruitmentSetupFailed: string;
  recruitmentChannelMustBeText: string;
  recruitmentSetupComplete: string;
  recruitmentChannel: (vars: { id: string }) => string;
  recruitmentMarker: (vars: { marker: string }) => string;
  ttsSetupFailed: string;
  ttsChannelMustBeText: string;
  ttsSetupComplete: string;
  ttsTtsChannel: (vars: { id: string }) => string;
  ttsChannelDescription: string;
  voiceStatusSetupFailed: string;
  voiceStatusChannelMustBeText: string;
  voiceStatusSetupComplete: string;
  voiceStatusChannel: (vars: { id: string }) => string;
  voiceStatusMarker: (vars: { marker: string }) => string;
  recruitmentFailed: string;
  recruitmentSetupRequired: string;
  recruitmentSetupRequiredMessage: string;
  recruitmentCreated: string;
  recruitmentPostLink: (vars: { url: string }) => string;
  recruitmentPostTitle: (vars: { title: string }) => string;
  recruitmentStatusOpen: string;
  recruitmentStatusFull: string;
  recruitmentStatusClosed: string;
  recruitmentPostCapacity: (vars: { current: number; max: number }) => string;
  recruitmentPostCreator: (vars: { id: string }) => string;
  recruitmentPostVc: (vars: { id: string }) => string;
  recruitmentPostNoVc: string;
  recruitmentButtonJoin: string;
  recruitmentButtonLeave: string;
  recruitmentButtonClose: string;
  recruitmentNotFound: string;
  recruitmentNotFoundMessage: string;
  recruitmentNotOpen: string;
  recruitmentNotOpenMessage: string;
  recruitmentAlreadyJoined: string;
  recruitmentAlreadyQueued: string;
  recruitmentQueueJoined: (vars: { position: number }) => string;
  recruitmentQueueLeft: string;
  recruitmentPromoted: (vars: { userId: string }) => string;
  recruitmentButtonReopen: string;
  recruitmentReopenedSuccess: string;
  recruitmentAlreadyOpen: string;
  recruitmentNotJoined: string;
  recruitmentParticipantsLabel: string;
  recruitmentNoParticipants: string;
  recruitmentQueueLabel: string;
  recruitmentJoined: (vars: { current: number; max: number }) => string;
  recruitmentLeft: (vars: { current: number; max: number }) => string;
  recruitmentClosedSuccess: string;
  recruitmentAlreadyClosed: string;
  recruitmentCannotClose: string;
  recruitmentCannotCloseMessage: string;
  recruitmentCannotReopen: string;
  recruitmentCannotReopenMessage: string;
  ttsJoinFailed: string;
  ttsJoinVoiceFirst: string;
  ttsAlreadyConnected: string;
  ttsAlreadyConnectedMessage: string;
  ttsAlreadyConnectedHere: string;
  ttsForceJoinSuggestion: string;
  ttsConnected: string;
  ttsVoiceChannel: (vars: { id: string }) => string;
  ttsReadingChannel: (vars: { id: string }) => string;
  ttsForceJoinFailed: string;
  ttsForceJoinAdminRequired: string;
  ttsForceJoinConfirmTitle: string;
  ttsForceJoinAlreadyConnected: string;
  ttsForceJoinMoveTo: (vars: { id: string }) => string;
  ttsForceJoinWrongUser: string;
  ttsForceJoinNotInGuild: string;
  ttsButtonMove: string;
  ttsButtonCancel: string;
  ttsMoveCancelledTitle: string;
  ttsMoveCancelledMessage: string;
  ttsMovedTitle: string;
  ttsMoved: string;
  ttsReady: string;
  ttsLeaveFailed: string;
  ttsLeaveNotInGuild: string;
  ttsDisconnected: string;
  ttsNotConnected: string;
  ttsChannelsCleared: string;
  ttsSpeakerFailed: string;
  ttsSpeakerUpdated: string;
  ttsSpeakerAlreadySet: string;
  ttsSpeakerUser: (vars: { id: number }) => string;
  ttsSpeakerServerDefault: (vars: { id: number }) => string;
  logEventTitle: (vars: { eventName: string }) => string;
  logEventTimeLabel: string;
  logReason: (vars: { reason: string }) => string;
  logRecruitmentCreator: (vars: { id: string }) => string;
  logRecruitmentGenre: (vars: { genre: string }) => string;
  logFieldLabel: (field: string) => string | null;
  logChangeField: (vars: { label: string; before: string; after: string }) => string;
  logContentChange: (vars: { before: string; after: string }) => string;
  commandSuccess: (vars: { operation: string }) => string;
  commandError: (vars: { reason: string }) => string;
  voiceTempCreatedTitle: string;
  voiceTempDeletedTitle: string;
  voiceSessionTitleStarted: string;
  voiceSessionTitleActive: string;
  voiceSessionTitleEnded: string;
  voiceSessionStartedAt: (vars: { timestamp: string; duration: string }) => string;
  voiceSessionEndedAt: (vars: { timestamp: string; duration: string }) => string;
  ttsTipMutePrefix: string;
  ttsRateLimited: string;
  ttsRateLimitedHint: string;
  ttsForceJoinCurrentChannel: (vars: { id: string }) => string;
  recruitmentModalTitle: string;
  recruitmentModalFieldTitle: string;
  recruitmentModalFieldCapacity: string;
  recruitmentModalFieldContent: string;
  recruitmentCapacityInvalid: string;
  setupStatusTitle: string;
  setupStatusTempVc: (vars: { id: string | null }) => string;
  setupStatusLogs: (vars: { id: string | null }) => string;
  setupStatusVoiceStatus: (vars: { id: string | null }) => string;
  setupStatusNotConfigured: string;
  tempVcControlTitle: string;
  tempVcControlStatusLocked: string;
  tempVcControlStatusOpen: string;
  tempVcControlStatusHidden: string;
  tempVcControlStatusVisible: string;
  tempVcControlOwner: (vars: { ownerId: string }) => string;
  tempVcControlAllowList: (vars: { users: string }) => string;
  tempVcControlDenyList: (vars: { users: string }) => string;
  tempVcControlButtonRename: string;
  tempVcControlButtonLock: string;
  tempVcControlButtonUnlock: string;
  tempVcControlButtonHide: string;
  tempVcControlButtonShow: string;
  tempVcControlButtonUserLimit: string;
  tempVcControlButtonUserManagement: string;
  tempVcUserMgmtPlaceholder: string;
  tempVcUserMgmtTitle: string;
  tempVcUserMgmtPrompt: string;
  tempVcUserMgmtActionFor: (vars: { userId: string }) => string;
  tempVcActionKick: string;
  tempVcActionAllow: string;
  tempVcActionDeny: string;
  tempVcActionTransfer: string;
  tempVcKickTitle: string;
  tempVcKickMessage: (vars: { userId: string }) => string;
  tempVcAlreadyAllowedTitle: string;
  tempVcPermErrorTitle: string;
  tempVcPermErrorManageRolesLine1: string;
  tempVcPermErrorManageRolesLine2: string;
  tempVcAllowTitle: string;
  tempVcAllowMessage: (vars: { userId: string }) => string;
  tempVcAlreadyDeniedTitle: string;
  tempVcDenyTitle: string;
  tempVcDenyMessage: (vars: { userId: string }) => string;
  tempVcTransferNotInChannelTitle: string;
  tempVcTransferNotInChannelMessage: string;
  tempVcTransferSuccessTitle: string;
  tempVcTransferSuccessMessage: (vars: { userId: string }) => string;
  tempVcAlreadyLockedTitle: string;
  tempVcLockSuccessTitle: string;
  tempVcLockSuccessMessage: string;
  tempVcAlreadyUnlockedTitle: string;
  tempVcUnlockSuccessTitle: string;
  tempVcUnlockSuccessMessage: string;
  tempVcAlreadyHiddenTitle: string;
  tempVcHideSuccessTitle: string;
  tempVcHideSuccessMessage: string;
  tempVcAlreadyVisibleTitle: string;
  tempVcShowSuccessTitle: string;
  tempVcShowSuccessMessage: string;
  tempVcRenameEmptyTitle: string;
  tempVcRenameEmptyMessage: string;
  tempVcRenameSuccessTitle: string;
  tempVcRenameSuccessMessage: (vars: { name: string }) => string;
  tempVcUserLimitInvalidTitle: string;
  tempVcUserLimitInvalidMessage: string;
  tempVcUserLimitSuccessTitle: string;
  tempVcUserLimitSuccessMessage: (vars: { limit: number }) => string;
  tempVcChannelPermErrorTitle: string;
  tempVcChannelPermErrorMessage: string;
  tempVcChannelPermErrorHint: string;
  tempVcModalRenameTitle: string;
  tempVcModalUserLimitTitle: string;
  tempVcModalRenameLabel: string;
  tempVcModalUserLimitLabel: string;
  tempVcOwnerChangedTitle: string;
  tempVcOwnerChangedMessage: (vars: { userId: string }) => string;
};

const locales: Record<GuildLanguage, Locale> = {
  en: {
    logTitle: ({ eventName }) => `Log: ${eventName}`,
    logActor: ({ actorId }) => `Actor: <@${actorId}>`,
    logActorUnknown: "Actor: unknown",
    logChannel: ({ channelId }) => `Channel: <#${channelId}>`,
    logChannelNamed: ({ name }) => `Channel: ${name}`,
    logChannelUnknown: "Channel: unknown",
    logMessageId: ({ messageId }) => `Message ID: ${messageId}`,
    logEventTime: ({ timestamp }) => `Event time: ${timestamp}`,
    logContent: ({ content }) => `Content: ${content}`,
    logDetails: ({ details }) => `Details: ${details}`,
    logDetailsNone: "Details: none",
    setupFailed: "❌ Setup failed",
    notInGuild: "This command can only be used in a guild.",
    noManagePermission: "You need Manage Server permission to run setup.",
    unknownSetupTarget: ({ target }) => `Unknown setup target: ${target}`,
    tempVcSetupFailed: "❌ Temp VC setup failed",
    tempVcCreationChannelMustBeVoice: "Creation channel must be a voice channel.",
    tempVcCategoryMustBeCategory: "Category must be a channel category.",
    tempVcSetupComplete: "✅ Temp VC setup complete",
    tempVcCreationChannel: ({ id }) => `Creation channel: <#${id}>`,
    tempVcCategory: ({ id }) => `Category: <#${id}>`,
    tempVcCategorySame: "same category as the creation channel",
    logsSetupFailed: "❌ Logs setup failed",
    logsChannelMustBeText: "Log channel must be a text channel.",
    logsSetupComplete: "✅ Logs setup complete",
    logsChannel: ({ id }) => `Log channel: <#${id}>`,
    logsMarker: ({ marker }) => `Marker: ${marker}`,
    recruitmentSetupFailed: "❌ Recruitment setup failed",
    recruitmentChannelMustBeText: "Recruitment channel must be a text channel.",
    recruitmentSetupComplete: "✅ Recruitment setup complete",
    recruitmentChannel: ({ id }) => `Recruitment channel: <#${id}>`,
    recruitmentMarker: ({ marker }) => `Marker: ${marker}`,
    ttsSetupFailed: "❌ TTS setup failed",
    ttsChannelMustBeText: "TTS channel must be a text channel.",
    ttsSetupComplete: "✅ TTS setup complete",
    ttsTtsChannel: ({ id }) => `TTS text channel: <#${id}>`,
    ttsChannelDescription:
      "Messages in this channel will be read while the bot is connected to voice.",
    voiceStatusSetupFailed: "❌ Voice status setup failed",
    voiceStatusChannelMustBeText: "Voice status channel must be a text channel.",
    voiceStatusSetupComplete: "✅ Voice status setup complete",
    voiceStatusChannel: ({ id }) => `Voice status channel: <#${id}>`,
    voiceStatusMarker: ({ marker }) => `Marker: ${marker}`,
    recruitmentFailed: "❌ Recruitment failed",
    recruitmentSetupRequired: "❌ Recruitment setup required",
    recruitmentSetupRequiredMessage:
      "Run `/setup recruitment channel:<text channel>` first.",
    recruitmentCreated: "✅ Recruitment created",
    recruitmentPostLink: ({ url }) => `Post: ${url}`,
    recruitmentPostTitle: ({ title }) => `🎮 Recruitment: ${title}`,
    recruitmentStatusOpen: "🟢 Open",
    recruitmentStatusFull: "🟡 Full",
    recruitmentStatusClosed: "🔴 Closed",
    recruitmentPostCapacity: ({ current, max }) => `Capacity: ${current}/${max}`,
    recruitmentPostCreator: ({ id }) => `Creator: <@${id}>`,
    recruitmentPostVc: ({ id }) => `VC: <#${id}>`,
    recruitmentPostNoVc: "VC: none",
    recruitmentButtonJoin: "➕ Join",
    recruitmentButtonLeave: "➖ Leave",
    recruitmentButtonClose: "🔒 Close",
    recruitmentNotFound: "❌ Recruitment not found",
    recruitmentNotFoundMessage: "This recruitment post no longer exists.",
    recruitmentNotOpen: "❌ Recruitment is not open",
    recruitmentNotOpenMessage: "This recruitment is already full or closed.",
    recruitmentAlreadyJoined: "You've already joined this recruitment.",
    recruitmentAlreadyQueued: "You're already in the queue.",
    recruitmentQueueJoined: ({ position }) => `✅ Added to queue (position ${position})`,
    recruitmentQueueLeft: "✅ Removed from the queue.",
    recruitmentPromoted: ({ userId }) => `<@${userId}> A spot opened up!`,
    recruitmentButtonReopen: "🔓 Reopen",
    recruitmentReopenedSuccess: "✅ Recruitment reopened",
    recruitmentAlreadyOpen: "This recruitment is already open.",
    recruitmentNotJoined: "You haven't joined this recruitment.",
    recruitmentParticipantsLabel: "Participants:",
    recruitmentNoParticipants: "Participants: none",
    recruitmentQueueLabel: "Queue:",
    recruitmentJoined: ({ current, max }) => `✅ Joined! (${current}/${max})`,
    recruitmentLeft: ({ current, max }) => `✅ Left. (${current}/${max})`,
    recruitmentClosedSuccess: "✅ Recruitment closed",
    recruitmentAlreadyClosed: "This recruitment is already closed.",
    recruitmentCannotClose: "❌ Cannot close recruitment",
    recruitmentCannotCloseMessage: "Only the creator or a server manager can close this.",
    recruitmentCannotReopen: "❌ Cannot reopen recruitment",
    recruitmentCannotReopenMessage: "Only the creator or a server manager can reopen this.",
    ttsJoinFailed: "❌ TTS join failed",
    ttsJoinVoiceFirst: "Join a voice channel first.",
    ttsAlreadyConnected: "⚠️ TTS already connected",
    ttsAlreadyConnectedMessage:
      "The bot is already connected to another voice channel.",
    ttsAlreadyConnectedHere: "Already connected to this channel.",
    ttsForceJoinSuggestion:
      "Ask a Dashboard admin or owner to use `/force-join`.",
    ttsConnected: "✅ 🔊 TTS connected",
    ttsVoiceChannel: ({ id }) => `🎤 <#${id}>`,
    ttsReadingChannel: ({ id }) => `Reading: <#${id}>`,
    ttsForceJoinFailed: "❌ TTS force join failed",
    ttsForceJoinAdminRequired: "Dashboard admin or owner access is required.",
    ttsForceJoinConfirmTitle: "⚠️ Confirm TTS move",
    ttsForceJoinAlreadyConnected:
      "The bot is already connected to another voice channel.",
    ttsForceJoinMoveTo: ({ id }) => `→ Move to <#${id}>?`,
    ttsForceJoinWrongUser:
      "Only the user who ran `/force-join` can confirm this move.",
    ttsForceJoinNotInGuild:
      "This confirmation can only be used in a guild.",
    ttsButtonMove: "🚀 Move",
    ttsButtonCancel: "✖ Cancel",
    ttsMoveCancelledTitle: "TTS move cancelled",
    ttsMoveCancelledMessage: "No voice channel move was performed.",
    ttsMovedTitle: "✅ 🔊 TTS moved",
    ttsMoved: "Moved TTS to your voice channel.",
    ttsReady: "TTS is ready.",
    ttsLeaveFailed: "❌ TTS leave failed",
    ttsLeaveNotInGuild: "This command can only be used in a guild.",
    ttsDisconnected: "🔇 TTS disconnected",
    ttsNotConnected: "TTS is not connected.",
    ttsChannelsCleared: "Temporary TTS text channels were cleared.",
    ttsSpeakerFailed: "❌ TTS speaker update failed",
    ttsSpeakerUpdated: "✅ TTS speaker updated",
    ttsSpeakerAlreadySet: "That speaker is already selected.",
    ttsSpeakerUser: ({ id }) => `Your TTS speaker: ${id}`,
    ttsSpeakerServerDefault: ({ id }) => `Server default TTS speaker: ${id}`,
    logEventTitle: ({ eventName }) => {
      const titles: Record<string, string> = {
        "voice.session.join": "🎤 Voice Session Started",
        "voice.session.leave": "🎤 Voice Session Ended",
        "voice.session.move": "🎤 Voice Channel Move",
        "member.join": "👋 Member Joined",
        "member.leave": "👋 Member Left",
        "member.kick": "🦶 Member Kicked",
        "member.ban": "🔨 Member Banned",
        "member.unban": "🔓 Member Unbanned",
        "member.timeout": "⏱️ Member Timed Out",
        "message.create": "✉️ Message Created",
        "message.delete": "🗑️ Message Deleted",
        "message.bulk_delete": "🗑️ Messages Bulk Deleted",
        "message.update": "✏️ Message Edited",
        "voice.temp.created": "✨ Temp VC Created",
        "voice.temp.deleted": "🗑️ Temp VC Deleted",
        "voice.temp.owner_transferred": "👑 Temp VC Ownership Transferred",
        "voice.temp.user_kicked": "🚫 User Kicked from Temp VC",
        "call.started": "📞 Call Started",
        "call.ended": "📞 Call Ended",
        "recruitment.created": "🎮 Recruitment Created",
        "recruitment.full": "🎮 Recruitment Full",
        "recruitment.closed": "🎮 Recruitment Closed",
        "recruitment.reopened": "🎮 Recruitment Reopened",
        "tts.session.started": "🔊 TTS Session Started",
        "tts.session.stopped": "🔊 TTS Session Stopped",
        "tts.message.skipped": "🔊 TTS Message Skipped",
        "tts.message.spoken": "🔊 TTS Message Spoken",
        "member.update": "✏️ Member Updated",
        "guild.update": "⚙️ Server Updated",
        "role.create": "🏷️ Role Created",
        "role.update": "🏷️ Role Updated",
        "role.delete": "🏷️ Role Deleted",
        "channel.create": "📁 Channel Created",
        "channel.update": "📁 Channel Updated",
        "channel.delete": "📁 Channel Deleted",
        "channel.permission_update": "🔐 Channel Permissions Updated",
        "thread.create": "🧵 Thread Created",
        "thread.update": "🧵 Thread Updated",
        "thread.delete": "🧵 Thread Deleted",
        "invite.create": "🔗 Invite Created",
        "invite.delete": "🔗 Invite Deleted",
        "emoji.create": "😀 Emoji Added",
        "emoji.update": "😀 Emoji Updated",
        "emoji.delete": "😀 Emoji Deleted",
        "sticker.create": "🖼️ Sticker Added",
        "sticker.update": "🖼️ Sticker Updated",
        "sticker.delete": "🖼️ Sticker Deleted",
        "webhook.update": "🔗 Webhook Updated",
        "voice.state.update": "🎤 Voice State Updated",
        "call.updated": "📞 Call Updated",
        "message.reaction.add": "😀 Reaction Added",
        "message.reaction.remove": "😀 Reaction Removed",
        "system.bot.started": "🟢 Bot Started",
        "system.bot.crashed": "🔴 Bot Crashed",
        "system.backup.completed": "✅ Backup Completed",
        "system.handler.error": "⚠️ Handler Error",
        "system.database.error": "⚠️ Database Error",
        "system.redis.error": "⚠️ Redis Error",
        "system.voicevox.error": "⚠️ VOICEVOX Error",
        "system.backup.failed": "⚠️ Backup Failed",
        "system.rate_limit": "⚠️ Rate Limited",
        "dashboard.login": "🔑 Dashboard Login",
        "dashboard.logout": "🔑 Dashboard Logout",
        "config.updated": "⚙️ Config Updated",
      };
      return titles[eventName] ?? `📋 ${eventName}`;
    },
    logEventTimeLabel: "Event time",
    logReason: ({ reason }) => `Reason: ${reason}`,
    logRecruitmentCreator: ({ id }) => `Creator: <@${id}>`,
    logRecruitmentGenre: ({ genre }) => `Genre: ${genre}`,
    logFieldLabel: (field) => ({
      displayName: "Display name",
      nickname: "Nickname",
      name: "Name",
      communicationDisabledUntil: "Timeout until",
      description: "Description",
      topic: "Topic",
      color: "Color",
      ownerId: "Owner",
    } as Record<string, string>)[field] ?? null,
    logChangeField: ({ label, before, after }) => `${label}: ${before} → ${after}`,
    logContentChange: ({ before, after }) => `Content: ${before} → ${after}`,
    commandSuccess: ({ operation }) => `✅ ${operation} completed`,
    commandError: ({ reason }) => `❌ ${reason}`,
    voiceTempCreatedTitle: "✨ Temp VC Created",
    voiceTempDeletedTitle: "🗑️ Temp VC Deleted",
    voiceSessionTitleStarted: "🟢 Voice Session Started",
    voiceSessionTitleActive: "🔵 Voice Session Active",
    voiceSessionTitleEnded: "⚫ Voice Session Ended",
    voiceSessionStartedAt: ({ timestamp, duration }) => `Started: ${timestamp}  ·  ${duration}`,
    voiceSessionEndedAt: ({ timestamp, duration }) => `Ended: ${timestamp}  ·  ${duration}`,
    ttsTipMutePrefix: "Prefix messages with `//` to skip TTS.",
    ttsRateLimited: "⚡ Slow down",
    ttsRateLimitedHint: "Messages are rate-limited. Wait a moment before sending more.",
    ttsForceJoinCurrentChannel: ({ id }) => `Currently in <#${id}>`,
    recruitmentModalTitle: "Create Recruitment",
    recruitmentModalFieldTitle: "Title",
    recruitmentModalFieldCapacity: "Capacity (1–99)",
    recruitmentModalFieldContent: "Details",
    recruitmentCapacityInvalid: "Capacity must be an integer between 1 and 99.",
    setupStatusTitle: "📋 Server Configuration",
    setupStatusTempVc: ({ id }) => `Temp VC: ${id ? `<#${id}>` : "Not configured"}`,
    setupStatusLogs: ({ id }) => `Logs: ${id ? `<#${id}>` : "Not configured"}`,
    setupStatusVoiceStatus: ({ id }) => `Voice Status: ${id ? `<#${id}>` : "Not configured"}`,
    setupStatusNotConfigured: "Not configured",
    tempVcControlTitle: "## 🎙️ Temp VC Control",
    tempVcControlStatusLocked: "🔒 Locked",
    tempVcControlStatusOpen: "🔓 Open",
    tempVcControlStatusHidden: "🚫 Hidden",
    tempVcControlStatusVisible: "🌐 Visible",
    tempVcControlOwner: ({ ownerId }) => `Owner: <@${ownerId}>`,
    tempVcControlAllowList: ({ users }) => `✅ Allowed: ${users}`,
    tempVcControlDenyList: ({ users }) => `🚫 Denied: ${users}`,
    tempVcControlButtonRename: "✏️ Rename",
    tempVcControlButtonLock: "🔒 Lock",
    tempVcControlButtonUnlock: "🔓 Unlock",
    tempVcControlButtonHide: "🚫 Hide",
    tempVcControlButtonShow: "🌐 Show",
    tempVcControlButtonUserLimit: "👥 User Limit",
    tempVcControlButtonUserManagement: "👤 User Management",
    tempVcUserMgmtPlaceholder: "Select a user...",
    tempVcUserMgmtTitle: "👤 User Management",
    tempVcUserMgmtPrompt: "Select a user to manage.",
    tempVcUserMgmtActionFor: ({ userId }) => `Action for <@${userId}>:`,
    tempVcActionKick: "🚪 Kick",
    tempVcActionAllow: "✅ Allow",
    tempVcActionDeny: "🚫 Deny",
    tempVcActionTransfer: "👑 Transfer Owner",
    tempVcKickTitle: "✅ Kicked",
    tempVcKickMessage: ({ userId }) => `<@${userId}> was kicked.`,
    tempVcAlreadyAllowedTitle: "Already allowed",
    tempVcPermErrorTitle: "❌ Permission error",
    tempVcPermErrorManageRolesLine1: "The bot lacks `MANAGE_ROLES` permission to set per-user overrides.",
    tempVcPermErrorManageRolesLine2: "Grant the bot role `Manage Roles` in server settings.",
    tempVcAllowTitle: "✅ Allowed",
    tempVcAllowMessage: ({ userId }) => `<@${userId}> is now allowed to join.`,
    tempVcAlreadyDeniedTitle: "Already denied",
    tempVcDenyTitle: "🚫 Denied",
    tempVcDenyMessage: ({ userId }) => `<@${userId}> is now denied from joining.`,
    tempVcTransferNotInChannelTitle: "❌ Cannot transfer",
    tempVcTransferNotInChannelMessage: "Owner transfer is only available to members currently in the channel.",
    tempVcTransferSuccessTitle: "👑 Transfer complete",
    tempVcTransferSuccessMessage: ({ userId }) => `<@${userId}> is now the owner.`,
    tempVcAlreadyLockedTitle: "Already locked",
    tempVcLockSuccessTitle: "✅ 🔒 Locked",
    tempVcLockSuccessMessage: "New members can no longer connect.",
    tempVcAlreadyUnlockedTitle: "Already unlocked",
    tempVcUnlockSuccessTitle: "✅ 🔓 Unlocked",
    tempVcUnlockSuccessMessage: "New members can now connect.",
    tempVcAlreadyHiddenTitle: "Already hidden",
    tempVcHideSuccessTitle: "✅ 🚫 Hidden",
    tempVcHideSuccessMessage: "Channel is now hidden.",
    tempVcAlreadyVisibleTitle: "Already visible",
    tempVcShowSuccessTitle: "✅ 🌐 Visible",
    tempVcShowSuccessMessage: "Channel is now visible.",
    tempVcRenameEmptyTitle: "❌ Rename failed",
    tempVcRenameEmptyMessage: "Please enter a channel name.",
    tempVcRenameSuccessTitle: "✅ ✏️ Renamed",
    tempVcRenameSuccessMessage: ({ name }) => `New name: ${name}`,
    tempVcUserLimitInvalidTitle: "❌ User limit failed",
    tempVcUserLimitInvalidMessage: "Please enter a number between 0 and 99.",
    tempVcUserLimitSuccessTitle: "✅ 👥 User limit updated",
    tempVcUserLimitSuccessMessage: ({ limit }) => `User limit: ${limit}`,
    tempVcChannelPermErrorTitle: "❌ Permission error",
    tempVcChannelPermErrorMessage: "The bot could not update this VC's permission overwrites.",
    tempVcChannelPermErrorHint: "Make sure the bot role has `Manage Channels` and can view the target VC.",
    tempVcModalRenameTitle: "✏️ Rename Temp VC",
    tempVcModalUserLimitTitle: "👥 Temp VC User Limit",
    tempVcModalRenameLabel: "New channel name",
    tempVcModalUserLimitLabel: "User limit (0–99)",
    tempVcOwnerChangedTitle: "👑 Owner changed",
    tempVcOwnerChangedMessage: ({ userId }) => `<@${userId}> is now the Temp VC owner.\nYou can manage the channel from the control panel.`,
  },
  ja: {
    logTitle: ({ eventName }) => `ログ: ${eventName}`,
    logActor: ({ actorId }) => `アクター: <@${actorId}>`,
    logActorUnknown: "アクター: 不明",
    logChannel: ({ channelId }) => `チャンネル: <#${channelId}>`,
    logChannelNamed: ({ name }) => `チャンネル: ${name}`,
    logChannelUnknown: "チャンネル: 不明",
    logMessageId: ({ messageId }) => `メッセージID: ${messageId}`,
    logEventTime: ({ timestamp }) => `イベント時刻: ${timestamp}`,
    logContent: ({ content }) => `内容: ${content}`,
    logDetails: ({ details }) => `詳細: ${details}`,
    logDetailsNone: "詳細: なし",
    setupFailed: "❌ セットアップ失敗",
    notInGuild: "このコマンドはサーバー内でのみ使用できます。",
    noManagePermission: "セットアップにはサーバー管理権限が必要です。",
    unknownSetupTarget: ({ target }) => `不明なセットアップ対象: ${target}`,
    tempVcSetupFailed: "❌ 一時VCセットアップ失敗",
    tempVcCreationChannelMustBeVoice:
      "作成チャンネルはボイスチャンネルにしてください。",
    tempVcCategoryMustBeCategory:
      "カテゴリはチャンネルカテゴリにしてください。",
    tempVcSetupComplete: "✅ 一時VCセットアップ完了",
    tempVcCreationChannel: ({ id }) => `作成チャンネル: <#${id}>`,
    tempVcCategory: ({ id }) => `カテゴリ: <#${id}>`,
    tempVcCategorySame: "作成チャンネルと同じカテゴリ",
    logsSetupFailed: "❌ ログセットアップ失敗",
    logsChannelMustBeText: "ログチャンネルはテキストチャンネルにしてください。",
    logsSetupComplete: "✅ ログセットアップ完了",
    logsChannel: ({ id }) => `ログチャンネル: <#${id}>`,
    logsMarker: ({ marker }) => `マーカー: ${marker}`,
    recruitmentSetupFailed: "❌ 募集セットアップ失敗",
    recruitmentChannelMustBeText:
      "募集チャンネルはテキストチャンネルにしてください。",
    recruitmentSetupComplete: "✅ 募集セットアップ完了",
    recruitmentChannel: ({ id }) => `募集チャンネル: <#${id}>`,
    recruitmentMarker: ({ marker }) => `マーカー: ${marker}`,
    ttsSetupFailed: "❌ TTSセットアップ失敗",
    ttsChannelMustBeText: "TTSチャンネルはテキストチャンネルにしてください。",
    ttsSetupComplete: "✅ TTSセットアップ完了",
    ttsTtsChannel: ({ id }) => `TTSテキストチャンネル: <#${id}>`,
    ttsChannelDescription:
      "ボットがボイスに接続中、このチャンネルのメッセージが読み上げられます。",
    recruitmentFailed: "❌ 募集失敗",
    recruitmentSetupRequired: "❌ 募集セットアップが必要です",
    recruitmentSetupRequiredMessage:
      "先に `/setup recruitment channel:<テキストチャンネル>` を実行してください。",
    recruitmentCreated: "✅ 募集を作成しました",
    recruitmentPostLink: ({ url }) => `投稿: ${url}`,
    recruitmentPostTitle: ({ title }) => `🎮 募集: ${title}`,
    recruitmentStatusOpen: "🟢 募集中",
    recruitmentStatusFull: "🟡 満員",
    recruitmentStatusClosed: "🔴 締切済み",
    recruitmentPostCapacity: ({ current, max }) => `定員: ${current}/${max}人`,
    recruitmentPostCreator: ({ id }) => `作成者: <@${id}>`,
    recruitmentPostVc: ({ id }) => `VC: <#${id}>`,
    recruitmentPostNoVc: "VC: なし",
    recruitmentButtonJoin: "➕ 参加",
    recruitmentButtonLeave: "➖ 退出",
    recruitmentButtonClose: "🔒 締切",
    recruitmentNotFound: "❌ 募集が見つかりません",
    recruitmentNotFoundMessage: "この募集投稿はすでに存在しません。",
    recruitmentNotOpen: "❌ 募集は受け付けていません",
    recruitmentNotOpenMessage: "この募集は満員または締切済みです。",
    recruitmentAlreadyJoined: "既に参加済みです。",
    recruitmentAlreadyQueued: "既に待機リストに入っています。",
    recruitmentQueueJoined: ({ position }) => `✅ 待機リストに追加されました（${position}番目）`,
    recruitmentQueueLeft: "✅ 待機リストから外れました。",
    recruitmentPromoted: ({ userId }) => `<@${userId}> 参加枠が空きました！`,
    recruitmentButtonReopen: "🔓 再オープン",
    recruitmentReopenedSuccess: "✅ 募集を再オープンしました",
    recruitmentAlreadyOpen: "この募集は既に再開されています。",
    recruitmentNotJoined: "参加していません。",
    recruitmentParticipantsLabel: "参加者:",
    recruitmentNoParticipants: "参加者: なし",
    recruitmentQueueLabel: "待機中:",
    recruitmentJoined: ({ current, max }) => `✅ 参加しました！（${current}/${max}人）`,
    recruitmentLeft: ({ current, max }) => `✅ 退出しました。（${current}/${max}人）`,
    recruitmentClosedSuccess: "✅ 募集を締め切りました",
    recruitmentAlreadyClosed: "この募集は既に締め切られています。",
    recruitmentCannotClose: "❌ 締め切れません",
    recruitmentCannotCloseMessage: "作成者またはサーバー管理者のみが締め切れます。",
    recruitmentCannotReopen: "❌ 再オープンできません",
    recruitmentCannotReopenMessage: "作成者またはサーバー管理者のみが再オープンできます。",
    ttsJoinFailed: "❌ TTS参加失敗",
    ttsJoinVoiceFirst: "先にボイスチャンネルに参加してください。",
    ttsAlreadyConnected: "⚠️ TTS接続中",
    ttsAlreadyConnectedMessage:
      "ボットはすでに別のボイスチャンネルに接続されています。",
    ttsAlreadyConnectedHere: "既にこのチャンネルに接続しています。",
    ttsForceJoinSuggestion:
      "ダッシュボード管理者またはオーナーが `/force-join` を使用してください。",
    ttsConnected: "✅ 🔊 TTS接続完了",
    ttsVoiceChannel: ({ id }) => `🎤 <#${id}>`,
    ttsReadingChannel: ({ id }) => `読み上げ: <#${id}>`,
    ttsForceJoinFailed: "❌ TTS強制参加失敗",
    ttsForceJoinAdminRequired:
      "ダッシュボード管理者またはオーナー権限が必要です。",
    ttsForceJoinConfirmTitle: "⚠️ TTS移動の確認",
    ttsForceJoinAlreadyConnected:
      "ボットはすでに別のボイスチャンネルに接続されています。",
    ttsForceJoinMoveTo: ({ id }) => `→ <#${id}> に移動しますか？`,
    ttsForceJoinWrongUser:
      "`/force-join` を実行したユーザーのみが確認できます。",
    ttsForceJoinNotInGuild:
      "この確認はサーバー内でのみ使用できます。",
    ttsButtonMove: "🚀 移動",
    ttsButtonCancel: "✖ キャンセル",
    ttsMoveCancelledTitle: "TTS移動キャンセル",
    ttsMoveCancelledMessage: "ボイスチャンネルの移動は行われませんでした。",
    ttsMovedTitle: "✅ 🔊 TTS移動完了",
    ttsMoved: "TTSをあなたのボイスチャンネルに移動しました。",
    ttsReady: "TTSは準備完了です。",
    ttsLeaveFailed: "❌ TTS退出失敗",
    ttsLeaveNotInGuild: "このコマンドはサーバー内でのみ使用できます。",
    ttsDisconnected: "🔇 TTS切断完了",
    ttsNotConnected: "TTSは接続していません。",
    ttsChannelsCleared: "一時TTSテキストチャンネルをクリアしました。",
    ttsSpeakerFailed: "❌ TTS話者変更失敗",
    ttsSpeakerUpdated: "✅ TTS話者を更新しました",
    ttsSpeakerAlreadySet: "既にそのスピーカーが選択されています。",
    ttsSpeakerUser: ({ id }) => `あなたのTTS話者: ${id}`,
    ttsSpeakerServerDefault: ({ id }) => `サーバーデフォルトTTS話者: ${id}`,
    logEventTitle: ({ eventName }) => {
      const titles: Record<string, string> = {
        "voice.session.join": "🎤 ボイスセッション開始",
        "voice.session.leave": "🎤 ボイスセッション終了",
        "voice.session.move": "🎤 チャンネル移動",
        "member.join": "👋 メンバー参加",
        "member.leave": "👋 メンバー退出",
        "member.kick": "🦶 メンバーキック",
        "member.ban": "🔨 メンバーBAN",
        "member.unban": "🔓 BAN解除",
        "member.timeout": "⏱️ タイムアウト適用",
        "message.create": "✉️ メッセージ送信",
        "message.delete": "🗑️ メッセージ削除",
        "message.bulk_delete": "🗑️ 一括削除",
        "message.update": "✏️ メッセージ編集",
        "voice.temp.created": "✨ 一時VC作成",
        "voice.temp.deleted": "🗑️ 一時VC削除",
        "voice.temp.owner_transferred": "👑 一時VCオーナー移譲",
        "voice.temp.user_kicked": "🚫 一時VCキック",
        "call.started": "📞 通話開始",
        "call.ended": "📞 通話終了",
        "recruitment.created": "🎮 募集作成",
        "recruitment.full": "🎮 募集満員",
        "recruitment.closed": "🎮 募集締切",
        "recruitment.reopened": "🎮 募集再オープン",
        "tts.session.started": "🔊 TTSセッション開始",
        "tts.session.stopped": "🔊 TTSセッション終了",
        "tts.message.skipped": "🔊 TTSメッセージスキップ",
        "tts.message.spoken": "🔊 TTSメッセージ読み上げ",
        "member.update": "✏️ メンバー情報更新",
        "guild.update": "⚙️ サーバー設定更新",
        "role.create": "🏷️ ロール作成",
        "role.update": "🏷️ ロール更新",
        "role.delete": "🏷️ ロール削除",
        "channel.create": "📁 チャンネル作成",
        "channel.update": "📁 チャンネル更新",
        "channel.delete": "📁 チャンネル削除",
        "channel.permission_update": "🔐 チャンネル権限更新",
        "thread.create": "🧵 スレッド作成",
        "thread.update": "🧵 スレッド更新",
        "thread.delete": "🧵 スレッド削除",
        "invite.create": "🔗 招待リンク作成",
        "invite.delete": "🔗 招待リンク削除",
        "emoji.create": "😀 絵文字追加",
        "emoji.update": "😀 絵文字更新",
        "emoji.delete": "😀 絵文字削除",
        "sticker.create": "🖼️ スタンプ追加",
        "sticker.update": "🖼️ スタンプ更新",
        "sticker.delete": "🖼️ スタンプ削除",
        "webhook.update": "🔗 Webhook更新",
        "voice.state.update": "🎤 音声状態更新",
        "call.updated": "📞 通話更新",
        "message.reaction.add": "😀 リアクション追加",
        "message.reaction.remove": "😀 リアクション削除",
        "system.bot.started": "🟢 Bot起動",
        "system.bot.crashed": "🔴 Bot停止",
        "system.backup.completed": "✅ バックアップ完了",
        "system.handler.error": "⚠️ ハンドラーエラー",
        "system.database.error": "⚠️ データベースエラー",
        "system.redis.error": "⚠️ Redisエラー",
        "system.voicevox.error": "⚠️ VOICEVOXエラー",
        "system.backup.failed": "⚠️ バックアップ失敗",
        "system.rate_limit": "⚠️ レート制限",
        "dashboard.login": "🔑 ダッシュボードログイン",
        "dashboard.logout": "🔑 ダッシュボードログアウト",
        "config.updated": "⚙️ 設定更新",
      };
      return titles[eventName] ?? `📋 ${eventName}`;
    },
    logEventTimeLabel: "イベント時刻",
    logReason: ({ reason }) => `理由: ${reason}`,
    logRecruitmentCreator: ({ id }) => `作成者: <@${id}>`,
    logRecruitmentGenre: ({ genre }) => `ジャンル: ${genre}`,
    logFieldLabel: (field) => ({
      displayName: "表示名",
      nickname: "ニックネーム",
      name: "名前",
      communicationDisabledUntil: "タイムアウト期限",
      description: "説明",
      topic: "トピック",
      color: "カラー",
      ownerId: "オーナー",
    } as Record<string, string>)[field] ?? null,
    logChangeField: ({ label, before, after }) => `${label}: ${before} → ${after}`,
    logContentChange: ({ before, after }) => `内容: ${before} → ${after}`,
    commandSuccess: ({ operation }) => `✅ ${operation}が完了しました`,
    commandError: ({ reason }) => `❌ ${reason}`,
    voiceTempCreatedTitle: "✨ 一時VCが作成された",
    voiceTempDeletedTitle: "🗑️ 一時VCが削除された",
    voiceSessionTitleStarted: "🟢 通話セッション開始",
    voiceSessionTitleActive: "🔵 通話セッション中",
    voiceSessionTitleEnded: "⚫ 通話セッション終了",
    voiceSessionStartedAt: ({ timestamp, duration }) => `開始: ${timestamp}  ·  ${duration}`,
    voiceSessionEndedAt: ({ timestamp, duration }) => `終了: ${timestamp}  ·  ${duration}`,
    voiceStatusSetupFailed: "❌ 通話状態セットアップ失敗",
    voiceStatusChannelMustBeText:
      "通話状態チャンネルはテキストチャンネルにしてください。",
    voiceStatusSetupComplete: "✅ 通話状態セットアップ完了",
    voiceStatusChannel: ({ id }) => `通話状態チャンネル: <#${id}>`,
    voiceStatusMarker: ({ marker }) => `マーカー: ${marker}`,
    ttsTipMutePrefix: "`//` で始まるメッセージは読み上げをスキップします。",
    ttsRateLimited: "⚡ 送信が速すぎます",
    ttsRateLimitedHint: "メッセージの読み上げにはレート制限があります。少し待ってから再送信してください。",
    ttsForceJoinCurrentChannel: ({ id }) => `現在 <#${id}> に接続中`,
    recruitmentModalTitle: "募集を作成",
    recruitmentModalFieldTitle: "タイトル",
    recruitmentModalFieldCapacity: "定員（1〜99）",
    recruitmentModalFieldContent: "内容",
    recruitmentCapacityInvalid: "定員は1〜99の整数を入力してください。",
    setupStatusTitle: "📋 サーバー設定",
    setupStatusTempVc: ({ id }) => `一時VC: ${id ? `<#${id}>` : "未設定"}`,
    setupStatusLogs: ({ id }) => `ログ: ${id ? `<#${id}>` : "未設定"}`,
    setupStatusVoiceStatus: ({ id }) => `通話状態: ${id ? `<#${id}>` : "未設定"}`,
    setupStatusNotConfigured: "未設定",
    tempVcControlTitle: "## 🎙️ Temp VC コントロール",
    tempVcControlStatusLocked: "🔒 ロック中",
    tempVcControlStatusOpen: "🔓 オープン",
    tempVcControlStatusHidden: "🚫 非表示",
    tempVcControlStatusVisible: "🌐 表示中",
    tempVcControlOwner: ({ ownerId }) => `オーナー: <@${ownerId}>`,
    tempVcControlAllowList: ({ users }) => `✅ 入室許可: ${users}`,
    tempVcControlDenyList: ({ users }) => `🚫 入室禁止: ${users}`,
    tempVcControlButtonRename: "✏️ 名前変更",
    tempVcControlButtonLock: "🔒 ロック",
    tempVcControlButtonUnlock: "🔓 解除",
    tempVcControlButtonHide: "🚫 非表示",
    tempVcControlButtonShow: "🌐 表示",
    tempVcControlButtonUserLimit: "👥 人数制限",
    tempVcControlButtonUserManagement: "👤 ユーザー管理",
    tempVcUserMgmtPlaceholder: "ユーザーを選択してください...",
    tempVcUserMgmtTitle: "👤 ユーザー管理",
    tempVcUserMgmtPrompt: "操作するユーザーを選択してください。",
    tempVcUserMgmtActionFor: ({ userId }) => `<@${userId}> に対するアクション:`,
    tempVcActionKick: "🚪 キック",
    tempVcActionAllow: "✅ 入室許可",
    tempVcActionDeny: "🚫 入室禁止",
    tempVcActionTransfer: "👑 オーナー譲渡",
    tempVcKickTitle: "✅ キック完了",
    tempVcKickMessage: ({ userId }) => `<@${userId}> をキックしました。`,
    tempVcAlreadyAllowedTitle: "既に入室を許可しています",
    tempVcPermErrorTitle: "❌ 権限エラー",
    tempVcPermErrorManageRolesLine1: "ボットに `MANAGE_ROLES` 権限がないため、ユーザーへの個別権限設定ができません。",
    tempVcPermErrorManageRolesLine2: "サーバー設定でボットロールに `ロールの管理` 権限を付与してください。",
    tempVcAllowTitle: "✅ 入室許可",
    tempVcAllowMessage: ({ userId }) => `<@${userId}> の入室を許可しました。`,
    tempVcAlreadyDeniedTitle: "既に入室を禁止しています",
    tempVcDenyTitle: "🚫 入室禁止",
    tempVcDenyMessage: ({ userId }) => `<@${userId}> の入室を禁止しました。`,
    tempVcTransferNotInChannelTitle: "❌ 譲渡できません",
    tempVcTransferNotInChannelMessage: "オーナー譲渡は現在通話に参加しているメンバーにのみ行えます。",
    tempVcTransferSuccessTitle: "👑 オーナー譲渡完了",
    tempVcTransferSuccessMessage: ({ userId }) => `<@${userId}> にオーナーを譲渡しました。`,
    tempVcAlreadyLockedTitle: "既にロックされています",
    tempVcLockSuccessTitle: "✅ 🔒 ロック完了",
    tempVcLockSuccessMessage: "新しいメンバーは接続できなくなりました。",
    tempVcAlreadyUnlockedTitle: "既にロック解除されています",
    tempVcUnlockSuccessTitle: "✅ 🔓 ロック解除",
    tempVcUnlockSuccessMessage: "新しいメンバーが接続できるようになりました。",
    tempVcAlreadyHiddenTitle: "既に非表示になっています",
    tempVcHideSuccessTitle: "✅ 🚫 非表示",
    tempVcHideSuccessMessage: "チャンネルを非表示にしました。",
    tempVcAlreadyVisibleTitle: "既に表示されています",
    tempVcShowSuccessTitle: "✅ 🌐 表示",
    tempVcShowSuccessMessage: "チャンネルを表示しました。",
    tempVcRenameEmptyTitle: "❌ 名前変更失敗",
    tempVcRenameEmptyMessage: "チャンネル名を入力してください。",
    tempVcRenameSuccessTitle: "✅ ✏️ 名前変更完了",
    tempVcRenameSuccessMessage: ({ name }) => `新しい名前: ${name}`,
    tempVcUserLimitInvalidTitle: "❌ 人数制限失敗",
    tempVcUserLimitInvalidMessage: "0〜99の数字を入力してください。",
    tempVcUserLimitSuccessTitle: "✅ 👥 人数制限更新",
    tempVcUserLimitSuccessMessage: ({ limit }) => `人数制限: ${limit}人`,
    tempVcChannelPermErrorTitle: "❌ 権限エラー",
    tempVcChannelPermErrorMessage: "Bot がこの VC の権限設定を変更できませんでした。",
    tempVcChannelPermErrorHint: "Bot ロールに `チャンネルの管理` があり、対象 VC を表示できるか確認してください。",
    tempVcModalRenameTitle: "✏️ Temp VC 名前変更",
    tempVcModalUserLimitTitle: "👥 Temp VC 人数制限",
    tempVcModalRenameLabel: "新しいチャンネル名",
    tempVcModalUserLimitLabel: "人数制限（0〜99）",
    tempVcOwnerChangedTitle: "👑 オーナーが変更されました",
    tempVcOwnerChangedMessage: ({ userId }) => `<@${userId}> さんがこの Temp VC のオーナーになりました。\nコントロールパネルからチャンネルを管理できます。`,
  }
};

export function getLocale(lang: GuildLanguage) {
  return locales[lang];
}
