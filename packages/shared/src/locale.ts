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
  recruitmentFailed: string;
  recruitmentSetupRequired: string;
  recruitmentSetupRequiredMessage: string;
  recruitmentCreated: string;
  recruitmentPostLink: (vars: { url: string }) => string;
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
    setupFailed: "Setup failed",
    notInGuild: "This command can only be used in a guild.",
    noManagePermission: "You need Manage Server permission to run setup.",
    unknownSetupTarget: ({ target }) => `Unknown setup target: ${target}`,
    tempVcSetupFailed: "Temp VC setup failed",
    tempVcCreationChannelMustBeVoice: "Creation channel must be a voice channel.",
    tempVcCategoryMustBeCategory: "Category must be a channel category.",
    tempVcSetupComplete: "Temp VC setup complete",
    tempVcCreationChannel: ({ id }) => `Creation channel: <#${id}>`,
    tempVcCategory: ({ id }) => `Category: <#${id}>`,
    tempVcCategorySame: "same category as the creation channel",
    logsSetupFailed: "Logs setup failed",
    logsChannelMustBeText: "Log channel must be a text channel.",
    logsSetupComplete: "Logs setup complete",
    logsChannel: ({ id }) => `Log channel: <#${id}>`,
    logsMarker: ({ marker }) => `Marker: ${marker}`,
    recruitmentSetupFailed: "Recruitment setup failed",
    recruitmentChannelMustBeText: "Recruitment channel must be a text channel.",
    recruitmentSetupComplete: "Recruitment setup complete",
    recruitmentChannel: ({ id }) => `Recruitment channel: <#${id}>`,
    recruitmentMarker: ({ marker }) => `Marker: ${marker}`,
    ttsSetupFailed: "TTS setup failed",
    ttsChannelMustBeText: "TTS channel must be a text channel.",
    ttsSetupComplete: "TTS setup complete",
    ttsTtsChannel: ({ id }) => `TTS text channel: <#${id}>`,
    ttsChannelDescription:
      "Messages in this channel will be read while the bot is connected to voice.",
    recruitmentFailed: "Recruitment failed",
    recruitmentSetupRequired: "Recruitment setup required",
    recruitmentSetupRequiredMessage:
      "Run `/setup recruitment channel:<text channel>` first.",
    recruitmentCreated: "Recruitment created",
    recruitmentPostLink: ({ url }) => `Post: ${url}`,
    ttsJoinFailed: "TTS join failed",
    ttsJoinVoiceFirst: "Join a voice channel first.",
    ttsAlreadyConnected: "TTS already connected",
    ttsAlreadyConnectedMessage:
      "The bot is already connected to another voice channel.",
    ttsForceJoinSuggestion:
      "Ask a Dashboard admin or owner to use `/force-join`.",
    ttsConnected: "TTS connected",
    ttsVoiceChannel: ({ id }) => `Voice channel: <#${id}>`,
    ttsReadingChannel: ({ id }) => `Reading text channel: <#${id}>`,
    ttsForceJoinFailed: "TTS force join failed",
    ttsForceJoinAdminRequired: "Dashboard admin or owner access is required.",
    ttsForceJoinConfirmTitle: "Confirm TTS move",
    ttsForceJoinAlreadyConnected:
      "The bot is already connected to another voice channel.",
    ttsForceJoinMoveTo: ({ id }) => `Move TTS to <#${id}>?`,
    ttsForceJoinWrongUser:
      "Only the user who ran `/force-join` can confirm this move.",
    ttsForceJoinNotInGuild:
      "This confirmation can only be used in a guild.",
    ttsButtonMove: "Move",
    ttsButtonCancel: "Cancel",
    ttsMoveCancelledTitle: "TTS move cancelled",
    ttsMoveCancelledMessage: "No voice channel move was performed.",
    ttsMovedTitle: "TTS moved",
    ttsMoved: "Moved TTS to your voice channel.",
    ttsReady: "TTS is ready.",
    ttsLeaveFailed: "TTS leave failed",
    ttsLeaveNotInGuild: "This command can only be used in a guild.",
    ttsDisconnected: "TTS disconnected",
    ttsChannelsCleared: "Temporary TTS text channels were cleared."
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
    setupFailed: "セットアップ失敗",
    notInGuild: "このコマンドはサーバー内でのみ使用できます。",
    noManagePermission: "セットアップにはサーバー管理権限が必要です。",
    unknownSetupTarget: ({ target }) => `不明なセットアップ対象: ${target}`,
    tempVcSetupFailed: "一時VCセットアップ失敗",
    tempVcCreationChannelMustBeVoice:
      "作成チャンネルはボイスチャンネルにしてください。",
    tempVcCategoryMustBeCategory:
      "カテゴリはチャンネルカテゴリにしてください。",
    tempVcSetupComplete: "一時VCセットアップ完了",
    tempVcCreationChannel: ({ id }) => `作成チャンネル: <#${id}>`,
    tempVcCategory: ({ id }) => `カテゴリ: <#${id}>`,
    tempVcCategorySame: "作成チャンネルと同じカテゴリ",
    logsSetupFailed: "ログセットアップ失敗",
    logsChannelMustBeText: "ログチャンネルはテキストチャンネルにしてください。",
    logsSetupComplete: "ログセットアップ完了",
    logsChannel: ({ id }) => `ログチャンネル: <#${id}>`,
    logsMarker: ({ marker }) => `マーカー: ${marker}`,
    recruitmentSetupFailed: "募集セットアップ失敗",
    recruitmentChannelMustBeText:
      "募集チャンネルはテキストチャンネルにしてください。",
    recruitmentSetupComplete: "募集セットアップ完了",
    recruitmentChannel: ({ id }) => `募集チャンネル: <#${id}>`,
    recruitmentMarker: ({ marker }) => `マーカー: ${marker}`,
    ttsSetupFailed: "TTSセットアップ失敗",
    ttsChannelMustBeText: "TTSチャンネルはテキストチャンネルにしてください。",
    ttsSetupComplete: "TTSセットアップ完了",
    ttsTtsChannel: ({ id }) => `TTSテキストチャンネル: <#${id}>`,
    ttsChannelDescription:
      "ボットがボイスに接続中、このチャンネルのメッセージが読み上げられます。",
    recruitmentFailed: "募集失敗",
    recruitmentSetupRequired: "募集セットアップが必要です",
    recruitmentSetupRequiredMessage:
      "先に `/setup recruitment channel:<テキストチャンネル>` を実行してください。",
    recruitmentCreated: "募集を作成しました",
    recruitmentPostLink: ({ url }) => `投稿: ${url}`,
    ttsJoinFailed: "TTS参加失敗",
    ttsJoinVoiceFirst: "先にボイスチャンネルに参加してください。",
    ttsAlreadyConnected: "TTS接続中",
    ttsAlreadyConnectedMessage:
      "ボットはすでに別のボイスチャンネルに接続されています。",
    ttsForceJoinSuggestion:
      "ダッシュボード管理者またはオーナーが `/force-join` を使用してください。",
    ttsConnected: "TTS接続完了",
    ttsVoiceChannel: ({ id }) => `ボイスチャンネル: <#${id}>`,
    ttsReadingChannel: ({ id }) => `読み上げチャンネル: <#${id}>`,
    ttsForceJoinFailed: "TTS強制参加失敗",
    ttsForceJoinAdminRequired:
      "ダッシュボード管理者またはオーナー権限が必要です。",
    ttsForceJoinConfirmTitle: "TTS移動の確認",
    ttsForceJoinAlreadyConnected:
      "ボットはすでに別のボイスチャンネルに接続されています。",
    ttsForceJoinMoveTo: ({ id }) => `TTSを <#${id}> に移動しますか？`,
    ttsForceJoinWrongUser:
      "`/force-join` を実行したユーザーのみが確認できます。",
    ttsForceJoinNotInGuild:
      "この確認はサーバー内でのみ使用できます。",
    ttsButtonMove: "移動",
    ttsButtonCancel: "キャンセル",
    ttsMoveCancelledTitle: "TTS移動キャンセル",
    ttsMoveCancelledMessage: "ボイスチャンネルの移動は行われませんでした。",
    ttsMovedTitle: "TTS移動完了",
    ttsMoved: "TTSをあなたのボイスチャンネルに移動しました。",
    ttsReady: "TTSは準備完了です。",
    ttsLeaveFailed: "TTS退出失敗",
    ttsLeaveNotInGuild: "このコマンドはサーバー内でのみ使用できます。",
    ttsDisconnected: "TTS切断完了",
    ttsChannelsCleared: "一時TTSテキストチャンネルをクリアしました。"
  }
};

export function getLocale(lang: GuildLanguage) {
  return locales[lang];
}
