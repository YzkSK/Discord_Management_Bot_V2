# ロギング

## アーキテクチャ

```text
Discord ゲートウェイイベント
-> packages/discord-core 正規化イベントアダプター
-> イベントディスパッチャー
-> packages/logger インジェストサービス
-> PostgreSQL logs テーブル
-> Redis Stream
-> 設定済み Discord ログチャンネル
-> Dashboard /api/logs
-> Dashboard /logs
```

## ログモード

`guildConfigs.logMode` でロギング動作を制御する。

- `full` — 全イベントをフルペイロードで記録
- `metadata_only` — 最小ペイロードで記録
- `disabled` — ロギング無効

## ログチャンネルの設定

テキストチャンネルをログ配信先としてマークする。

```text
/setup logs channel:#チャンネル
```

Bot はチャンネルトピックに以下のマーカーを追記する。

```text
[discord-management-bot:logs]
```

Discord イベントを検出すると、Bot は PostgreSQL と Redis に書き込んだうえで、マーク済みチャンネルに Components V2 サマリーを投稿する。Bot 自身のメッセージイベントはスキップされる。

Discord ゲートウェイに実行者情報が含まれないアクションについては、Bot がギルドの Audit Log を参照して実行者情報を `payload.auditLog` に付与する。これには `View Audit Log` 権限が必要。権限がない場合もイベントはロギングされるが、`payload.auditLog.status` が `missing_permission` になる。

## ログイベント一覧

### ギルド

| イベント | 説明 |
|---|---|
| `guild.update` | ギルド設定が変更された |
| `member.join` | ユーザーがサーバーに参加した |
| `member.leave` | ユーザーがサーバーを退出した |
| `member.kick` | ユーザーがキックされた（Audit Log 参照） |
| `member.ban` | ユーザーがBANされた |
| `member.unban` | ユーザーのBANが解除された |
| `member.update` | メンバー設定が変更された（ロール、ニックネーム） |
| `member.timeout` | メンバーのタイムアウトが適用または解除された |

### チャンネル

| イベント | 説明 |
|---|---|
| `channel.create` | チャンネルが作成された（Temp VC は抑制） |
| `channel.update` | チャンネル設定が変更された |
| `channel.delete` | チャンネルが削除された（Temp VC は抑制） |
| `webhook.update` | Webhook が作成・削除・変更された |

### メッセージ

| イベント | 説明 |
|---|---|
| `message.reaction.add` | リアクションが追加された（Bot 以外） |
| `message.reaction.remove` | リアクションが削除された（Bot 以外） |
| `message.bulk_delete` | メッセージが一括削除された |

### ロール

| イベント | 説明 |
|---|---|
| `role.create` | ロールが作成された |
| `role.update` | ロールが更新された |
| `role.delete` | ロールが削除された |

### ボイス

| イベント | 説明 |
|---|---|
| `voice.session.join` | ユーザーがVCに参加した（Bot はスキップ） |
| `voice.session.leave` | ユーザーがVCを退出した（Bot はスキップ） |
| `voice.session.move` | ユーザーが別のVCに移動した |
| `voice.state.update` | ボイス状態が変化した（ミュート/デフ等） |

### スレッド / 招待

| イベント | 説明 |
|---|---|
| `thread.create` | スレッドが作成された |
| `thread.update` | スレッドが更新された |
| `thread.delete` | スレッドが削除された |
| `invite.create` | 招待リンクが作成された |
| `invite.delete` | 招待リンクが削除された |

### 絵文字 / スタンプ

| イベント | 説明 |
|---|---|
| `emoji.create` | 絵文字が作成された |
| `emoji.update` | 絵文字が更新された |
| `emoji.delete` | 絵文字が削除された |
| `sticker.create` | スタンプが作成された |
| `sticker.update` | スタンプが更新された |
| `sticker.delete` | スタンプが削除された |

### TTS

| イベント | 説明 |
|---|---|
| `tts.session.started` | Bot がVCに参加してTTSを開始した。`reason`: `join-command`, `force-join-command`, `force-join-confirmed` |
| `tts.session.stopped` | Bot がVCから退出した。`reason`: `leave-command`, `auto-leave` |

### 募集

| イベント | 説明 |
|---|---|
| `recruitment.created` | 募集投稿が作成された |
| `recruitment.updated` | 募集のステータスが変更された |

### 通話セッション

| イベント | 説明 |
|---|---|
| `call.started` | 最初の人間メンバーがVCに参加してセッションが開始した |
| `call.ended` | 最後の人間メンバーがVCを退出してセッションが終了した |
| `call.member_joined` | メンバーがアクティブな通話に参加した |
| `call.member_left` | メンバーがアクティブな通話から退出した |

## Redis Stream キー

- `logs:events` — 耐久性のあるログイベントストリーム
- `rt:logs:<guildId>` — ギルドごとのリアルタイムストリーム（リアルタイム有効イベントのみ）

`message.create` などの高頻度イベントはデフォルトでリアルタイム無効。重要な更新・削除・エラーイベントはリアルタイム有効。

## リアルタイム Dashboard ログ

- Socket パス: `/socket.io`
- 購読イベント: `logs:subscribe`
- ペイロード: `{ "guildId": "<discord guild id>" }`
- サーバーイベント: `logs:event`
- エラーイベント: `logs:error`

Dashboard ログページはギルドID選択後にソケットを開く。ソケットはブラウザセッションCookieを使用し、`rt:logs:<guildId>` を読む前に `viewer` 以上のアクセス権を確認する。

## Dashboard ログ API

`GET /api/logs` クエリパラメータ:

- `guildId`（必須）
- `limit` — 1〜100、デフォルト 50
- `before` — `receivedAt` 基準の ISO タイムスタンプカーソル
- `eventName`
- `actorId`
- `channelId`
- `messageId`
- `search` — イベント名と JSON ペイロードテキストを検索

レスポンス:

```json
{
  "accessRole": "viewer",
  "items": [],
  "nextCursor": null
}
```

## 検証

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose up -d postgres redis
pnpm db:migrate
```
