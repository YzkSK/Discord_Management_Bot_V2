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
  recruitmentPostTitle: (vars: { genre: string }) => string;
  recruitmentStatusOpen: string;
  recruitmentStatusFull: string;
  recruitmentStatusClosed: string;
  recruitmentPostCapacity: (vars: { current: number; max: number }) => string;
  recruitmentPostCreator: (vars: { id: string }) => string;
  recruitmentPostVc: (vars: { id: string }) => string;
  recruitmentPostNoVc: string;
  recruitmentPostAutoClose: (vars: { enabled: boolean }) => string;
  recruitmentButtonJoin: string;
  recruitmentButtonLeave: string;
  recruitmentButtonClose: string;
  recruitmentNotFound: string;
  recruitmentNotFoundMessage: string;
  recruitmentNotOpen: string;
  recruitmentNotOpenMessage: string;
  recruitmentJoined: (vars: { current: number; max: number }) => string;
  recruitmentLeft: (vars: { current: number; max: number }) => string;
  recruitmentClosedSuccess: string;
  recruitmentCannotClose: string;
  recruitmentCannotCloseMessage: string;
  ttsJoinFailed: string;
  ttsJoinVoiceFirst: string;
  ttsAlreadyConnected: string;
  ttsAlreadyConnectedMessage: string;
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
  ttsChannelsCleared: string;
  ttsSpeakerFailed: string;
  ttsSpeakerUpdated: string;
  ttsSpeakerUser: (vars: { id: number }) => string;
  ttsSpeakerServerDefault: (vars: { id: number }) => string;
  logEventTitle: (vars: { eventName: string }) => string;
  logEventTimeLabel: string;
  logReason: (vars: { reason: string }) => string;
  logFieldLabel: (field: string) => string | null;
  logChangeField: (vars: { label: string; before: string; after: string }) => string;
  commandSuccess: (vars: { operation: string }) => string;
  commandError: (vars: { reason: string }) => string;
  voiceTempCreatedTitle: string;
  voiceTempDeletedTitle: string;
  voiceSessionTitleStarted: string;
  voiceSessionTitleActive: string;
  voiceSessionTitleEnded: string;
  voiceSessionStartedAt: (vars: { timestamp: string; duration: string }) => string;
  voiceSessionEndedAt: (vars: { timestamp: string; duration: string }) => string;
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
    recruitmentPostTitle: ({ genre }) => `🎮 Recruitment: ${genre}`,
    recruitmentStatusOpen: "🟢 Open",
    recruitmentStatusFull: "🟡 Full",
    recruitmentStatusClosed: "🔴 Closed",
    recruitmentPostCapacity: ({ current, max }) => `Capacity: ${current}/${max}`,
    recruitmentPostCreator: ({ id }) => `Creator: <@${id}>`,
    recruitmentPostVc: ({ id }) => `VC: <#${id}>`,
    recruitmentPostNoVc: "VC: none",
    recruitmentPostAutoClose: ({ enabled }) => `Auto close: ${enabled ? "on" : "off"}`,
    recruitmentButtonJoin: "➕ Join",
    recruitmentButtonLeave: "➖ Leave",
    recruitmentButtonClose: "🔒 Close",
    recruitmentNotFound: "❌ Recruitment not found",
    recruitmentNotFoundMessage: "This recruitment post no longer exists.",
    recruitmentNotOpen: "❌ Recruitment is not open",
    recruitmentNotOpenMessage: "This recruitment is already full or closed.",
    recruitmentJoined: ({ current, max }) => `✅ Joined! (${current}/${max})`,
    recruitmentLeft: ({ current, max }) => `✅ Left. (${current}/${max})`,
    recruitmentClosedSuccess: "✅ Recruitment closed",
    recruitmentCannotClose: "❌ Cannot close recruitment",
    recruitmentCannotCloseMessage: "Only the creator or a server manager can close this.",
    ttsJoinFailed: "❌ TTS join failed",
    ttsJoinVoiceFirst: "Join a voice channel first.",
    ttsAlreadyConnected: "⚠️ TTS already connected",
    ttsAlreadyConnectedMessage:
      "The bot is already connected to another voice channel.",
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
    ttsChannelsCleared: "Temporary TTS text channels were cleared.",
    ttsSpeakerFailed: "❌ TTS speaker update failed",
    ttsSpeakerUpdated: "✅ TTS speaker updated",
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
    commandSuccess: ({ operation }) => `✅ ${operation} completed`,
    commandError: ({ reason }) => `❌ ${reason}`,
    voiceTempCreatedTitle: "✨ Temp VC Created",
    voiceTempDeletedTitle: "🗑️ Temp VC Deleted",
    voiceSessionTitleStarted: "🟢 Voice Session Started",
    voiceSessionTitleActive: "🔵 Voice Session Active",
    voiceSessionTitleEnded: "⚫ Voice Session Ended",
    voiceSessionStartedAt: ({ timestamp, duration }) => `Started: ${timestamp}  ·  ${duration}`,
    voiceSessionEndedAt: ({ timestamp, duration }) => `Ended: ${timestamp}  ·  ${duration}`,
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
    recruitmentPostTitle: ({ genre }) => `🎮 募集: ${genre}`,
    recruitmentStatusOpen: "🟢 募集中",
    recruitmentStatusFull: "🟡 満員",
    recruitmentStatusClosed: "🔴 締切済み",
    recruitmentPostCapacity: ({ current, max }) => `定員: ${current}/${max}人`,
    recruitmentPostCreator: ({ id }) => `作成者: <@${id}>`,
    recruitmentPostVc: ({ id }) => `VC: <#${id}>`,
    recruitmentPostNoVc: "VC: なし",
    recruitmentPostAutoClose: ({ enabled }) => `自動締切: ${enabled ? "オン" : "オフ"}`,
    recruitmentButtonJoin: "➕ 参加",
    recruitmentButtonLeave: "➖ 退出",
    recruitmentButtonClose: "🔒 締切",
    recruitmentNotFound: "❌ 募集が見つかりません",
    recruitmentNotFoundMessage: "この募集投稿はすでに存在しません。",
    recruitmentNotOpen: "❌ 募集は受け付けていません",
    recruitmentNotOpenMessage: "この募集は満員または締切済みです。",
    recruitmentJoined: ({ current, max }) => `✅ 参加しました！（${current}/${max}人）`,
    recruitmentLeft: ({ current, max }) => `✅ 退出しました。（${current}/${max}人）`,
    recruitmentClosedSuccess: "✅ 募集を締め切りました",
    recruitmentCannotClose: "❌ 締め切れません",
    recruitmentCannotCloseMessage: "作成者またはサーバー管理者のみが締め切れます。",
    ttsJoinFailed: "❌ TTS参加失敗",
    ttsJoinVoiceFirst: "先にボイスチャンネルに参加してください。",
    ttsAlreadyConnected: "⚠️ TTS接続中",
    ttsAlreadyConnectedMessage:
      "ボットはすでに別のボイスチャンネルに接続されています。",
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
    ttsChannelsCleared: "一時TTSテキストチャンネルをクリアしました。",
    ttsSpeakerFailed: "❌ TTS話者変更失敗",
    ttsSpeakerUpdated: "✅ TTS話者を更新しました",
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
    voiceStatusMarker: ({ marker }) => `マーカー: ${marker}`
  }
};

export function getLocale(lang: GuildLanguage) {
  return locales[lang];
}
