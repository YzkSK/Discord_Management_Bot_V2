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
  action?: number | null;
  voiceStateChanges?: Record<string, { before: unknown; after: unknown }> | null;
};

const auditLogDescriptions: Partial<Record<number, (v: EventVars) => string>> = {
  // サーバー
  1:   (_v) => "サーバー設定を変更",
  // チャンネル
  10:  (_v) => "チャンネルを作成",
  11:  (_v) => "チャンネルを更新",
  12:  (_v) => "チャンネルを削除",
  13:  (_v) => "チャンネル権限を作成",
  14:  (_v) => "チャンネル権限を更新",
  15:  (_v) => "チャンネル権限を削除",
  // メンバー
  20:  (v) => `${target(v)} をキック`,
  21:  (_v) => "非アクティブメンバーを一括削除",
  22:  (v) => `${target(v)} をBAN`,
  23:  (v) => `${target(v)} のBANを解除`,
  24:  (v) => `${target(v)} のメンバー情報を更新`,
  25:  (v) => `${target(v)} のロールを更新`,
  26:  (v) => `${target(v)} をVCに移動`,
  27:  (v) => `${target(v)} をVCから切断`,
  28:  (v) => `${target(v)} (Bot) を追加`,
  // ロール
  30:  (_v) => "ロールを作成",
  31:  (_v) => "ロールを更新",
  32:  (_v) => "ロールを削除",
  // 招待
  40:  (_v) => "招待リンクを作成",
  41:  (_v) => "招待リンクを更新",
  42:  (_v) => "招待リンクを削除",
  // Webhook
  50:  (_v) => "Webhookを作成",
  51:  (_v) => "Webhookを更新",
  52:  (_v) => "Webhookを削除",
  // 絵文字
  60:  (_v) => "絵文字を追加",
  61:  (_v) => "絵文字を更新",
  62:  (_v) => "絵文字を削除",
  // メッセージ
  72:  (_v) => "メッセージを削除",
  73:  (_v) => "メッセージを一括削除",
  74:  (_v) => "メッセージをピン留め",
  75:  (_v) => "メッセージのピン留めを解除",
  // 連携
  80:  (_v) => "連携を追加",
  81:  (_v) => "連携を更新",
  82:  (_v) => "連携を削除",
  // ステージ
  83:  (_v) => "ステージを作成",
  84:  (_v) => "ステージを更新",
  85:  (_v) => "ステージを削除",
  // スタンプ
  90:  (_v) => "スタンプを追加",
  91:  (_v) => "スタンプを更新",
  92:  (_v) => "スタンプを削除",
  // スケジュールイベント
  100: (_v) => "スケジュールイベントを作成",
  101: (_v) => "スケジュールイベントを更新",
  102: (_v) => "スケジュールイベントを削除",
  // スレッド
  110: (_v) => "スレッドを作成",
  111: (_v) => "スレッドを更新",
  112: (_v) => "スレッドを削除",
  // その他
  121: (_v) => "コマンド権限を更新",
  // 自動モデレーション
  140: (_v) => "自動モデレーションルールを作成",
  141: (_v) => "自動モデレーションルールを更新",
  142: (_v) => "自動モデレーションルールを削除",
  143: (_v) => "自動モデレーション: メッセージをブロック",
  144: (_v) => "自動モデレーション: チャンネルにフラグ",
  145: (v) => `${target(v)} のコミュニケーションを無効化`,
};

const voiceStateChangeLabels: Record<string, [string, string]> = {
  selfMute:                 ["マイクをミュート",         "マイクのミュートを解除"],
  selfDeaf:                 ["スピーカーをミュート",     "スピーカーのミュートを解除"],
  selfVideo:                ["カメラ開始",               "カメラ停止"],
  streaming:                ["配信開始",                 "配信停止"],
  serverMute:               ["サーバーミュートを適用",   "サーバーミュートを解除"],
  serverDeaf:               ["サーバー側でスピーカーミュートを適用", "サーバー側でスピーカーミュートを解除"],
  suppress:                 ["ステージ発言権なし",       "ステージ発言権あり"],
  requestToSpeakTimestamp:  ["発言リクエスト",           "発言リクエスト取消"],
};

function formatVoiceStateChanges(
  changes: Record<string, { before: unknown; after: unknown }> | null | undefined
): string | null {
  if (!changes) return null;
  const parts = Object.entries(changes)
    .map(([key, { after }]) => {
      const labels = voiceStateChangeLabels[key];
      if (!labels) return null;
      return after ? labels[0] : labels[1];
    })
    .filter((s): s is string => s !== null);
  return parts.length > 0 ? parts.join("・") : null;
}

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
  "voice.state.update": (v) => {
    const detail = formatVoiceStateChanges(v.voiceStateChanges);
    return detail
      ? `🎤 ${actor(v)} が${detail}`
      : `🎤 ${actor(v)} の音声状態が更新`;
  },
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
  "recruitment.created":  (v) => `🎮 ${actor(v)} が募集作成${v.genre ? ` (${v.genre})` : ""}`,
  "recruitment.full":     (v) => `🎮 募集が満員${v.genre ? ` (${v.genre})` : ""}`,
  "recruitment.closed":   (v) => `🎮 募集を締切${v.genre ? ` (${v.genre})` : ""}`,
  "recruitment.reopened": (v) => `🎮 募集を再オープン${v.genre ? ` (${v.genre})` : ""}`,
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
  // 監査ログ
  "audit_log.entry": (v) => {
    const a = actor(v, "不明");
    const descFn = v.action != null ? auditLogDescriptions[v.action] : null;
    const desc = descFn ? descFn(v) : v.action != null ? `監査ログを記録 (${v.action})` : "監査ログエントリを記録";
    return `📋 ${a} が${desc}`;
  },
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
  ["audit_log.", "orange"],
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

export function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function extractActorName(payload: unknown): string | null {
  if (!isObj(payload)) return null;
  const member = payload["member"];
  if (isObj(member) && typeof member["displayName"] === "string") return member["displayName"];
  const after = payload["after"];
  if (isObj(after) && typeof after["displayName"] === "string") return after["displayName"];
  const user = payload["user"];
  if (isObj(user) && typeof user["username"] === "string")
    return (typeof user["globalName"] === "string" ? user["globalName"] : null) ?? user["username"];
  const author = payload["author"];
  if (isObj(author) && typeof author["username"] === "string")
    return (typeof author["globalName"] === "string" ? author["globalName"] : null) ?? author["username"];
  return null;
}

export function extractChannelName(payload: unknown): string | null {
  if (!isObj(payload)) return null;
  const channel = payload["channel"];
  if (isObj(channel) && typeof channel["name"] === "string") return channel["name"];
  return null;
}

export function extractVoiceStateChanges(
  payload: unknown
): Record<string, { before: unknown; after: unknown }> | null {
  if (!isObj(payload)) return null;
  const changes = payload["changes"];
  if (!isRecord(changes)) return null;
  const result: Record<string, { before: unknown; after: unknown }> = {};
  for (const [key, val] of Object.entries(changes)) {
    if (isRecord(val) && "before" in val && "after" in val) {
      result[key] = { before: val["before"], after: val["after"] };
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

export function getActorText(vars: EventVars): string | null {
  if (vars.actorName) return `@${vars.actorName}`;
  if (vars.actorId) return `@${vars.actorId.slice(0, 8)}…`;
  return null;
}

export function getChannelText(vars: EventVars): string | null {
  if (vars.channelName) return `#${vars.channelName}`;
  if (vars.channelId) return `#${vars.channelId.slice(0, 8)}…`;
  return null;
}

export function getTargetText(vars: EventVars): string | null {
  if (vars.targetName) return `@${vars.targetName}`;
  if (vars.targetId) return `@${vars.targetId.slice(0, 8)}…`;
  return null;
}

export function extractAuditAction(payload: unknown): number | null {
  if (!isObj(payload)) return null;
  return typeof payload["action"] === "number" ? payload["action"] : null;
}

export function extractTargetId(payload: unknown): string | null {
  if (!isObj(payload)) return null;
  return typeof payload["targetId"] === "string" ? payload["targetId"] : null;
}

export function extractTargetName(payload: unknown): string | null {
  if (!isObj(payload)) return null;
  return typeof payload["targetName"] === "string" ? payload["targetName"] : null;
}

export function splitDescriptionOnActor(
  description: string,
  actorText: string
): { before: string; after: string } | null {
  const idx = description.indexOf(actorText);
  if (idx === -1) return null;
  return {
    before: description.slice(0, idx),
    after: description.slice(idx + actorText.length),
  };
}
