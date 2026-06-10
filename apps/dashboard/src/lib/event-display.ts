// apps/dashboard/src/lib/event-display.ts

export type EventColorKey =
  | "blue"
  | "purple"
  | "teal"
  | "green"
  | "red"
  | "orange"
  | "sky"
  | "gray";

type EventVars = {
  actorId?: string | null;
  channelId?: string | null;
  targetId?: string | null;
  count?: number | null;
  name?: string | null;
  genre?: string | null;
};

const eventDescriptions: Record<string, (v: EventVars) => string> = {
  // メッセージ
  "message.create": (v) => `✉️ ${v.actorId ? `<@${v.actorId}>` : "不明"} がメッセージを送信${v.channelId ? ` in <#${v.channelId}>` : ""}`,
  "message.update": (v) => `✏️ メッセージを編集${v.channelId ? ` in <#${v.channelId}>` : ""}`,
  "message.delete": (v) => `🗑️ メッセージを削除${v.channelId ? ` in <#${v.channelId}>` : ""}`,
  "message.bulk_delete": (v) => `🗑️ メッセージを一括削除${v.channelId ? ` in <#${v.channelId}>` : ""}${v.count ? ` (${v.count}件)` : ""}`,
  "message.reaction.add": (v) => `😀 ${v.actorId ? `<@${v.actorId}>` : "不明"} がリアクション追加`,
  "message.reaction.remove": (v) => `😀 ${v.actorId ? `<@${v.actorId}>` : "不明"} がリアクション削除`,
  // 音声
  "voice.session.join": (v) => `🎤 ${v.actorId ? `<@${v.actorId}>` : "不明"} が${v.channelId ? ` <#${v.channelId}>` : ""} に参加`,
  "voice.session.leave": (v) => `🎤 ${v.actorId ? `<@${v.actorId}>` : "不明"} が${v.channelId ? ` <#${v.channelId}>` : ""} から退出`,
  "voice.session.move": (v) => `🎤 ${v.actorId ? `<@${v.actorId}>` : "不明"} が${v.channelId ? ` <#${v.channelId}>` : ""} に移動`,
  "voice.state.update": (_v) => `🎤 音声状態が更新された`,
  "call.started": (v) => `📞 通話が開始した${v.channelId ? ` in <#${v.channelId}>` : ""}`,
  "call.ended": (v) => `📞 通話が終了した${v.channelId ? ` in <#${v.channelId}>` : ""}`,
  "call.updated": (_v) => `📞 通話が更新された`,
  // Temp VC
  "voice.temp.created": (v) => `✨ 一時VCが作成された${v.name ? `: ${v.name}` : ""}`,
  "voice.temp.deleted": (v) => `🗑️ 一時VCが削除された${v.name ? `: ${v.name}` : ""}`,
  "voice.temp.owner_transferred": (v) => `👑 一時VCのオーナーが移譲された${v.actorId ? ` → <@${v.actorId}>` : ""}`,
  "voice.temp.user_kicked": (v) => `🚫 ${v.targetId ? `<@${v.targetId}>` : "ユーザー"} が一時VCからキックされた`,
  // メンバー
  "member.join": (v) => `👋 ${v.actorId ? `<@${v.actorId}>` : "不明"} がサーバーに参加`,
  "member.leave": (v) => `👋 ${v.actorId ? `<@${v.actorId}>` : "不明"} がサーバーを退出`,
  "member.update": (v) => `✏️ ${v.actorId ? `<@${v.actorId}>` : "メンバー"} 情報が更新された`,
  "member.kick": (v) => `🦶 ${v.actorId ? `<@${v.actorId}>` : "不明"} をキック`,
  "member.ban": (v) => `🔨 ${v.actorId ? `<@${v.actorId}>` : "不明"} をBAN`,
  "member.unban": (v) => `🔓 ${v.actorId ? `<@${v.actorId}>` : "不明"} のBANを解除`,
  "member.timeout": (v) => `⏱️ ${v.actorId ? `<@${v.actorId}>` : "不明"} にタイムアウトを適用`,
  // サーバー構成
  "guild.update": (_v) => `⚙️ サーバー設定が更新された`,
  "role.create": (v) => `🏷️ ロール作成${v.name ? `: ${v.name}` : ""}`,
  "role.update": (_v) => `🏷️ ロールが更新された`,
  "role.delete": (_v) => `🏷️ ロールが削除された`,
  "channel.create": (v) => `📁 チャンネル作成${v.name ? `: ${v.name}` : ""}`,
  "channel.update": (_v) => `📁 チャンネルが更新された`,
  "channel.delete": (_v) => `📁 チャンネルが削除された`,
  "channel.permission_update": (v) => `🔐 チャンネル権限が更新された${v.channelId ? ` (<#${v.channelId}>)` : ""}`,
  "thread.create": (_v) => `🧵 スレッドが作成された`,
  "thread.update": (_v) => `🧵 スレッドが更新された`,
  "thread.delete": (_v) => `🧵 スレッドが削除された`,
  "invite.create": (_v) => `🔗 招待リンクが作成された`,
  "invite.delete": (_v) => `🔗 招待リンクが削除された`,
  "emoji.create": (_v) => `😀 絵文字が追加された`,
  "emoji.update": (_v) => `😀 絵文字が更新された`,
  "emoji.delete": (_v) => `😀 絵文字が削除された`,
  "sticker.create": (_v) => `🖼️ スタンプが追加された`,
  "sticker.update": (_v) => `🖼️ スタンプが更新された`,
  "sticker.delete": (_v) => `🖼️ スタンプが削除された`,
  "webhook.update": (_v) => `🔗 Webhookが更新された`,
  // 募集
  "recruitment.created": (v) => `🎮 募集が作成された${v.genre ? ` (${v.genre})` : ""}`,
  "recruitment.full": (_v) => `🎮 募集が満員になった`,
  "recruitment.closed": (_v) => `🎮 募集が締め切られた`,
  // TTS
  "tts.session.started": (v) => `🔊 ${v.actorId ? `<@${v.actorId}>` : ""} TTSセッションが開始`,
  "tts.session.stopped": (_v) => `🔊 TTSセッションが終了`,
  "tts.message.skipped": (_v) => `🔊 TTSメッセージがスキップされた`,
  "tts.message.spoken": (_v) => `🔊 TTSメッセージが読み上げられた`,
  // システム
  "system.bot.crashed": (_v) => `🔴 Botが予期せず停止`,
  "system.bot.started": (_v) => `🟢 Botが起動した`,
  "system.handler.error": (_v) => `⚠️ ハンドラーエラーが発生`,
  "system.database.error": (_v) => `⚠️ データベースエラーが発生`,
  "system.redis.error": (_v) => `⚠️ Redisエラーが発生`,
  "system.voicevox.error": (_v) => `⚠️ VOICEVOXエラーが発生`,
  "system.backup.failed": (_v) => `⚠️ バックアップが失敗`,
  "system.backup.completed": (_v) => `✅ バックアップが完了`,
  "system.rate_limit": (_v) => `⚠️ レート制限に達した`,
  // ダッシュボード
  "dashboard.login": (v) => `🔑 ${v.actorId ? `<@${v.actorId}>` : "ユーザー"} がログイン`,
  "dashboard.logout": (v) => `🔑 ${v.actorId ? `<@${v.actorId}>` : "ユーザー"} がログアウト`,
  "config.updated": (_v) => `⚙️ 設定が更新された`,
};

const eventColorPrefixes: Array<[string, EventColorKey]> = [
  ["message.", "blue"],
  ["voice.session.", "purple"],
  ["voice.state.", "purple"],
  ["call.", "purple"],
  ["voice.temp.", "teal"],
  ["recruitment.", "green"],
  ["tts.", "sky"],
  ["system.", "red"],
  ["member.", "orange"],
  ["guild.", "orange"],
  ["role.", "orange"],
  ["channel.", "orange"],
  ["thread.", "orange"],
  ["invite.", "orange"],
  ["emoji.", "orange"],
  ["sticker.", "orange"],
  ["webhook.", "orange"],
  ["dashboard.", "gray"],
  ["config.", "gray"],
];

export function formatEventDescription(eventName: string, vars: EventVars): string {
  const fn = eventDescriptions[eventName];
  if (!fn) return eventName;
  return fn(vars);
}

export function getEventColor(eventName: string): EventColorKey {
  for (const [prefix, color] of eventColorPrefixes) {
    if (eventName.startsWith(prefix)) return color;
  }
  return "gray";
}

export function getEventIcon(eventName: string): string {
  const fn = eventDescriptions[eventName];
  if (!fn) return "📋";
  const text = fn({});
  // First char is the emoji
  return [...text][0] ?? "📋";
}

export function formatRelativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
}

export const eventColorClasses: Record<EventColorKey, { dot: string; badge: string; border: string }> = {
  blue:   { dot: "bg-blue-500",   badge: "bg-blue-500/10 text-blue-400",    border: "border-blue-500/20" },
  purple: { dot: "bg-purple-500", badge: "bg-purple-500/10 text-purple-400", border: "border-purple-500/20" },
  teal:   { dot: "bg-teal-500",   badge: "bg-teal-500/10 text-teal-400",    border: "border-teal-500/20" },
  green:  { dot: "bg-green-500",  badge: "bg-green-500/10 text-green-400",   border: "border-green-500/20" },
  red:    { dot: "bg-red-500",    badge: "bg-red-500/10 text-red-400",       border: "border-red-500/20" },
  orange: { dot: "bg-orange-500", badge: "bg-orange-500/10 text-orange-400", border: "border-orange-500/20" },
  sky:    { dot: "bg-sky-500",    badge: "bg-sky-500/10 text-sky-400",       border: "border-sky-500/20" },
  gray:   { dot: "bg-zinc-500",   badge: "bg-zinc-500/10 text-zinc-400",     border: "border-zinc-500/20" },
};
