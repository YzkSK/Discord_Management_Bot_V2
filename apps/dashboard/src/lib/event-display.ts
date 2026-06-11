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

export type EventVars = {
  actorId?: string | null;
  actorName?: string | null;
  channelId?: string | null;
  channelName?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  count?: number | null;
  name?: string | null;
  genre?: string | null;
};

function actor(v: EventVars, fallback = "不明"): string {
  if (v.actorName) return `@${v.actorName}`;
  if (v.actorId) return `@${v.actorId.slice(0, 8)}…`;
  return fallback;
}

function ch(v: EventVars): string {
  if (v.channelName) return `#${v.channelName}`;
  if (v.channelId) return `#${v.channelId.slice(0, 8)}…`;
  return "";
}

function target(v: EventVars): string {
  if (v.targetName) return `@${v.targetName}`;
  if (v.targetId) return `@${v.targetId.slice(0, 8)}…`;
  return "ユーザー";
}

const eventDescriptions: Record<string, (v: EventVars) => string> = {
  // メッセージ
  "message.create": (v) => `✉️ ${actor(v)} が${ch(v) ? `${ch(v)} に` : ""}メッセージを送信`,
  "message.update": (v) => `✏️ ${ch(v) ? `${ch(v)} の` : ""}メッセージを編集`,
  "message.delete": (v) => `🗑️ ${ch(v) ? `${ch(v)} の` : ""}メッセージを削除`,
  "message.bulk_delete": (v) => `🗑️ ${ch(v) ? `${ch(v)} の` : ""}メッセージを一括削除${v.count ? ` (${v.count}件)` : ""}`,
  "message.reaction.add": (v) => `😀 ${actor(v)} がリアクション追加`,
  "message.reaction.remove": (v) => `😀 ${actor(v)} がリアクション削除`,
  // 音声
  "voice.session.join": (v) => `🎤 ${actor(v)} が${ch(v) ? `${ch(v)}` : "VCチャンネル"} に参加`,
  "voice.session.leave": (v) => `🎤 ${actor(v)} が${ch(v) ? `${ch(v)}` : "VCチャンネル"} から退出`,
  "voice.session.move": (v) => `🎤 ${actor(v)} が${ch(v) ? `${ch(v)}` : "VCチャンネル"} に移動`,
  "voice.state.update": (_v) => `🎤 音声状態更新`,
  "call.started": (v) => `📞 ${ch(v) ? `${ch(v)} で` : ""}通話開始`,
  "call.ended": (v) => `📞 ${ch(v) ? `${ch(v)} の` : ""}通話終了`,
  "call.updated": (_v) => `📞 通話更新`,
  // Temp VC
  "voice.temp.created": (v) => `✨ 一時VC作成${v.name ? `: ${v.name}` : ""}`,
  "voice.temp.deleted": (v) => `🗑️ 一時VC削除${v.name ? `: ${v.name}` : ""}`,
  "voice.temp.owner_transferred": (v) => `👑 一時VCオーナー移譲${v.actorId || v.actorName ? ` → ${actor(v, "")}` : ""}`,
  "voice.temp.user_kicked": (v) => `🚫 一時VCから ${target(v)} をキック`,
  // メンバー
  "member.join": (v) => `👋 ${actor(v)} がサーバーに参加`,
  "member.leave": (v) => `👋 ${actor(v)} がサーバーを退出`,
  "member.update": (v) => `✏️ ${actor(v, "メンバー")} の情報を更新`,
  "member.kick": (v) => `🦶 ${actor(v)} をキック`,
  "member.ban": (v) => `🔨 ${actor(v)} をBAN`,
  "member.unban": (v) => `🔓 ${actor(v)} のBANを解除`,
  "member.timeout": (v) => `⏱️ ${actor(v)} にタイムアウトを適用`,
  // サーバー構成
  "guild.update": (_v) => `⚙️ サーバー設定を更新`,
  "role.create": (v) => `🏷️ ロール作成${v.name ? `: ${v.name}` : ""}`,
  "role.update": (_v) => `🏷️ ロールを更新`,
  "role.delete": (_v) => `🏷️ ロールを削除`,
  "channel.create": (v) => `📁 チャンネル作成${v.name ? `: ${v.name}` : ""}`,
  "channel.update": (_v) => `📁 チャンネルを更新`,
  "channel.delete": (_v) => `📁 チャンネルを削除`,
  "channel.permission_update": (v) => `🔐 ${ch(v) ? `${ch(v)} の` : ""}チャンネル権限を更新`,
  "thread.create": (_v) => `🧵 スレッド作成`,
  "thread.update": (_v) => `🧵 スレッドを更新`,
  "thread.delete": (_v) => `🧵 スレッドを削除`,
  "invite.create": (_v) => `🔗 招待リンク作成`,
  "invite.delete": (_v) => `🔗 招待リンクを削除`,
  "emoji.create": (_v) => `😀 絵文字を追加`,
  "emoji.update": (_v) => `😀 絵文字を更新`,
  "emoji.delete": (_v) => `😀 絵文字を削除`,
  "sticker.create": (_v) => `🖼️ スタンプを追加`,
  "sticker.update": (_v) => `🖼️ スタンプを更新`,
  "sticker.delete": (_v) => `🖼️ スタンプを削除`,
  "webhook.update": (_v) => `🔗 Webhookを更新`,
  // 募集
  "recruitment.created": (v) => `🎮 募集作成${v.genre ? ` (${v.genre})` : ""}`,
  "recruitment.full": (_v) => `🎮 募集が満員に`,
  "recruitment.closed": (_v) => `🎮 募集を締切`,
  // TTS
  "tts.session.started": (v) => `🔊 ${actor(v, "")} TTSセッション開始`.trimStart(),
  "tts.session.stopped": (_v) => `🔊 TTSセッション終了`,
  "tts.message.skipped": (_v) => `🔊 TTSメッセージをスキップ`,
  "tts.message.spoken": (_v) => `🔊 TTSメッセージを読み上げ`,
  // システム
  "system.bot.crashed": (_v) => `🔴 Bot停止`,
  "system.bot.started": (_v) => `🟢 Bot起動`,
  "system.handler.error": (_v) => `⚠️ ハンドラーエラー発生`,
  "system.database.error": (_v) => `⚠️ データベースエラー発生`,
  "system.redis.error": (_v) => `⚠️ Redisエラー発生`,
  "system.voicevox.error": (_v) => `⚠️ VOICEVOXエラー発生`,
  "system.backup.failed": (_v) => `⚠️ バックアップ失敗`,
  "system.backup.completed": (_v) => `✅ バックアップ完了`,
  "system.rate_limit": (_v) => `⚠️ レート制限に到達`,
  // ダッシュボード
  "dashboard.login": (v) => `🔑 ${actor(v, "ユーザー")} がログイン`,
  "dashboard.logout": (v) => `🔑 ${actor(v, "ユーザー")} がログアウト`,
  "config.updated": (_v) => `⚙️ 設定を更新`,
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

export function formatEventDescription(eventName: string, vars: EventVars = {}): string {
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
  const text = fn({ actorId: null, channelId: null });
  return Array.from(text)[0] ?? "📋";
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
