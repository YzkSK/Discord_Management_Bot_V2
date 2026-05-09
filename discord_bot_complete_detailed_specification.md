# Discord統合管理Bot 完全詳細設計仕様書

## 1. プロジェクト概要

複数Discordサーバー向けの統合管理Bot。

単なるモデレーションBotではなく、

- 監査ログ
- 一時VC
- 通話可視化
- 募集システム
- VOICEVOX読み上げ
- Dashboard
- System Health
- Backup / Archive

まで含めた統合運用基盤として設計する。

---

# 2. 技術スタック

## Backend

- TypeScript
- Node.js
- discord.js v14+
- tRPC
- Drizzle ORM
- PostgreSQL
- Redis
- Socket.io
- zod

---

## Frontend

- Next.js
- TailwindCSS
- shadcn/ui
- Socket.io client

---

## Infrastructure

- Docker Compose
- Nginx
- VOICEVOX Engine
- GitHub Actions

---

## Package Manager

- pnpm workspace

---

# 3. アーキテクチャ

## Event Flow

```text
Discord Gateway
↓
discord.js
↓
adapter
↓
normalized payload
↓
dispatcher
↓
handlers
↓
DB / Redis / Dashboard
```

---

## 基本思想

### Fire-and-forget

各handlerは独立。

1つの失敗で全体停止しない。

---

### Error Isolation

handler単位で例外隔離。

例:

```text
TTS失敗
↓
TTSだけ失敗
↓
loggingは継続
```

---

### Normalized Payload

Discord.js生イベントをそのまま使わず、内部形式へ統一。

全payloadに:

```ts
{
  eventTimestamp,
  receivedAt,
  guildId,
  actorId,
  ...
}
```

を持たせる。

---

# 4. Monorepo構成

```text
apps/
  bot/
  dashboard/

packages/
  db/
  shared/
  logger/
  voice/
  tts/
  recruitment/
  discord-core/
  config/

infra/
scripts/
```

---

# 5. Package責務

## apps/bot

責務:

- Discord client起動
- Gateway event受信
- slash command
- interaction受付
- dispatcher呼び出し

業務ロジックは置かない。

---

## apps/dashboard

責務:

- UI
- OAuth
- Socket.io
- tRPC router
- session管理

---

## packages/db

責務:

- schema
- migrations
- db client
- query helper

---

## packages/shared

責務:

- zod schema
- event names
- constants
- shared types

注意:

- DB依存禁止
- discord.js依存禁止

---

## packages/logger

責務:

- logs queue
- Redis Stream
- archive
- Discord log送信
- Audit Log correlation

---

## packages/voice

責務:

- Temp VC
- ownership transfer
- control channel
- call sessions
- 通話可視化

---

## packages/tts

責務:

- VOICEVOX
- queue
- dictionary
- audio playback
- text normalization

---

## packages/recruitment

責務:

- activity作成
- join/leave
- embed rendering
- state管理

---

## packages/config

責務:

- env validation
- config export

注意:

直接 `process.env` を各所で読まない。

---

# 6. Docker構成

services:

- bot
- dashboard
- postgres
- redis
- voicevox
- nginx
- backup

---

## VOICEVOX制限

初期:

```yaml
memory: 3g
cpus: "2"
```

注意:

8GB環境ではメモリ監視。

必要なら:

```yaml
memory: 2g
```

へ調整。

---

# 7. Logging設計

## 保存対象

- message.create
- message.update
- message.delete
- moderation
- temp vc
- recruitment
- tts
- system logs

---

## 除外

- typingStart
- presenceUpdate
- userUpdate

理由:

情報量過多。

---

## 保存方式

- logs単一テーブル
- JSONB payload
- 月次partition

---

## payload保存

payload jsonbへDiscord由来詳細を保存。

検索頻度高いものだけcolumn化。

例:

```text
actor_id
channel_id
event_name
```

---

## message.create

全文保存。

注意:

DB肥大化対策として将来的に:

- full
- metadata_only
- disabled

切替可能にする余地を残す。

---

# 8. Realtime Logs

ログ保存とDashboardリアルタイム配信を分離。

```sql
realtime_enabled boolean not null default false
```

---

## realtime OFF

- message.create
- message.reaction.add
- message.reaction.remove
- voice.state.update
- voice.session.join
- voice.session.leave
- call.updated
- system.bot.started
- system.backup.completed
- system.health.*
- dashboard.login
- dashboard.logout
- config.updated

理由:

高頻度・低重要度。

---

## realtime ON

- message.update
- message.delete
- message.bulk_delete
- member.kick
- member.ban
- member.unban
- member.timeout
- role.create
- role.update
- role.delete
- channel.create
- channel.update
- channel.delete
- channel.permission_update
- voice.temp.created
- voice.temp.deleted
- voice.temp.owner_transferred
- voice.temp.user_kicked
- call.started
- call.ended
- recruitment.created
- recruitment.full
- recruitment.closed
- tts.session.started
- tts.session.stopped
- system.bot.crashed
- system.handler.error
- system.database.error
- system.redis.error
- system.voicevox.error
- system.backup.failed
- system.rate_limit

---

# 9. Logs Archive

## 保持

- 0〜180日: PostgreSQL
- 181〜365日: gzip archive
- 365日超: delete

---

## archive例

```text
/backups/archive/logs_2025_11.sql.gz
```

archive済みログは通常Dashboard検索対象外。

必要時のみ手動復元。

---

# 10. Temp VC

## 作成

作成用VCへ入室時生成。

---

## 削除

空室5秒後削除。

---

## ownership transfer

現在接続中メンバーを:

```sql
ORDER BY joined_at
```

で再計算。

join_order固定依存しない。

---

## naming

### VC

```text
🎮 {username}
```

### control channel

```text
control-🎮 Yuzuki
```

rename同期あり。

---

## control channel

- ownerのみ閲覧
- 埋め込みDashboard
- button操作

---

## control操作

- rename
- lock/unlock
- hide/show
- user limit
- bitrate
- kick

---

# 11. 通話可視化

## 対象

全VC。

---

## 状態

- started
- active
- ended

---

## 表示

- 開始時間
- 経過時間
- 終了時間
- 参加者

---

## 表示場所

専用status channel。

終了表示は残す。

---

# 12. Recruitment

## 入力

- genre
- capacity
- content
- VC(optional)
- auto_close

---

## 状態

- open
- full
- closed

---

## auto_close ON

定員到達:

```text
full
```

退出:

```text
open復帰
```

---

## auto_close OFF

人数超過可能。

---

## 投稿

- 基本は作成ch
- 作成時変更可能

---

## genre

候補 + 自由入力。

---

# 13. TTS

## 制約

- 1 guild = 1 active session
- 複数VC同時読み上げなし

---

## Queue

### logs

Redis Stream。

### tts

Redis List。

---

## 読み上げ

- FIFO
- URL除外
- Bot message除外
- 長文は省略

---

## 辞書

- 部分一致
- ユーザー辞書優先

---

## 暴走対策

- source 2文字以上
- replace回数制限
- 長いsource優先
- regex禁止

---

# 14. Dashboard

## Pages

- Overview
- Logs
- Voice
- Recruitment
- TTS
- Settings
- System Health

---

## Logs

- category tabs
- realtime stream
- Human View
- Raw JSON

---

## auto scroll

スクロール中は停止。

---

## 権限

### viewer

閲覧のみ。

### admin

設定変更 + Raw JSON。

### owner

権限管理。

---

# 15. System Health

## 表示

- Gateway latency
- queue length
- Redis ping
- PostgreSQL latency
- PostgreSQL size
- VOICEVOX latency
- CPU
- Memory
- Docker status

---

## alert対象

- bot crash
- database error
- redis error
- voicevox error
- handler error
- backup failed
- rate limit

---

# 16. Database Rules

## 共通

- Discord IDはtext
- timestamptz使用
- enum不使用
- text + CHECK

---

## FK

### 貼る

DB内部uuid参照のみ。

### 貼らない

- guild_id
- user_id
- channel_id
- message_id

---

## Soft Delete

### 履歴

保持。

### 状態系

物理削除。

### guild

```sql
is_active=false
```

で論理無効化。

---

# 17. Redis設計

## 用途

- cache
- pubsub
- realtime logs
- queue

---

## Key Rule

```text
{scope}:{feature}:{id}
```

例:

```text
config:guild:123
rt:logs:123
tts:queue:123
```

---

## logs queue

Redis Stream。

- ACK
- pending recovery

---

## tts queue

Redis List。

FIFO重視。

---

# 18. Discord Intents

- Guilds
- GuildMembers
- GuildMessages
- MessageContent
- GuildVoiceStates
- GuildMessageReactions

---

# 19. Discord Permissions

- View Audit Log
- View Channels
- Send Messages
- Read Message History
- Embed Links
- Manage Messages
- Manage Channels
- Move Members
- Connect
- Speak

Administratorは本番では避ける。

---

# 20. 環境変数

```env
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=

DATABASE_URL=
REDIS_URL=
VOICEVOX_URL=

NEXTAUTH_SECRET=
SESSION_ENCRYPTION_KEY=

PUBLIC_DASHBOARD_URL=
LOG_LEVEL=
```

---

## SESSION_ENCRYPTION_KEY

```bash
openssl rand -base64 32
```

---

# 21. エラー / Retry

## 方針

可能な限り継続。

---

## Retry

- DB: 5
- Redis: 3
- Discord API: 3
- VOICEVOX: 2

---

## Backoff

```text
1s → 2s → 4s
```

---

## 429

discord.js任せ。

---

# 22. 初期セットアップ

## Discord

`/setup`

### 内容

- guild登録
- config row作成
- 権限チェック
- Dashboard URL表示

---

## Dashboard Wizard

- Logging
- Voice
- TTS
- Recruitment
- Access

---

# 23. Drizzle構成

```text
schema/
  core.ts
  configs.ts
  logs.ts
  voice.ts
  recruitment.ts
  tts.ts
  dashboard.ts
```

---

# 24. API設計

## tRPC採用

---

## routers

- guild
- logs
- settings
- voice
- recruitment
- tts
- system

---

## realtime

Socket.io使用。

---

# 25. 実装ロードマップ

## Phase0

- workspace
- docker compose
- drizzle
- config

---

## Phase1

- bot起動
- dispatcher
- setup

---

## Phase2

- logs
- Redis Stream
- Dashboard logs

---

## Phase3

- auth
- Socket.io
- settings

---

## Phase4

- Temp VC
- CallSessions

---

## Phase5

- Recruitment

---

## Phase6

- TTS

---

## Phase7

- backup
- archive
- health

---

# 26. CI/CD

## CI

- lint
- typecheck
- test
- build

---

## CD

GitHub Actions → SSH deploy

---

## deploy flow

```text
backup
↓
git pull
↓
pnpm build
↓
docker compose up -d --build
↓
db migrate
```

---

# 27. Bootstrap

```bash
pnpm init
pnpm install
docker compose up
pnpm db:migrate
pnpm dev:bot
```

---

## 最初の目標

```text
system.bot.started
```

をDBへ保存。

---

# 28. 最終レビュー注意点

## 優先度高

1. realtime logsは高頻度イベントを流さない
2. TTS辞書暴走防止
3. message.create全文保存の肥大化注意
4. ownership transfer再計算方式
5. VOICEVOXメモリ監視

---

## 優先度中

1. Dashboard RBAC拡張余地
2. OAuth token暗号化
3. logs partitionはraw SQL寄り
4. Redis Pub/Subは揮発性前提

