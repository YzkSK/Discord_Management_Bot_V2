# 募集

## 動作仕様

- 設定済みの募集テキストチャンネルを投稿先として使用する。
- `/recruitment create` でモーダルを開き、Components V2 募集投稿を作成する。
- ユーザーは投稿の **参加** / **退出** ボタンを使用できる。
- 作成者またはサーバー管理者は募集をクローズできる。
- ステータス: `open`（受付中）、`full`（満員）、`closed`（クローズ済み）。
- 自動クローズが有効な場合、定員に達すると自動的にクローズされる。
- 自動クローズ後に参加者が定員を下回ると、再オープンできる。

### ライフサイクルイベント

- `recruitment.created` — 投稿が作成された
- `recruitment.updated` — ステータスが変更された（open → full、full → open、any → closed）

## コマンド

### `/setup recruitment channel:#チャンネル`

ギルドの募集投稿チャンネルを設定する。

- チャンネルIDを `guildConfigs.recruitmentChannelId` に保存する。
- チャンネルトピックにもマーカーを追記する。
  ```text
  [discord-management-bot:recruitment]
  ```
- `Manage Channels` 権限が必要（チャンネルトピックの書き込みに使用）。

### `/recruitment create`

以下のフィールドを持つモーダルを開く。

| フィールド | 最大文字数 | 必須 |
|---|---|---|
| タイトル | 80 文字 | 必須 |
| 定員 | 2 桁（1〜99） | 必須 |
| 内容 | 1000 文字 | 必須 |

ユーザーが音声チャンネルにいる場合、そのVCが投稿に自動で紐付けられる。

投稿は設定済みの募集チャンネルに送信される。

## データベース

| テーブル | 用途 |
|---|---|
| `recruitments` | 投稿データ（`guildId`, `channelId`, `messageId`, `creatorId`, `genre`, `capacity`, `content`, `voiceChannelId`, `status`, クローズメタデータ） |
| `recruitmentParticipants` | 参加者追跡（`recruitmentId`, `userId`, `joinedAt`, `isQueued`, `queuedAt`, `leftAt`） |

`recruitmentParticipants` は定員超過時のキュー（`isQueued`, `queuedAt`）をサポートする。

## Bot に必要な権限

- チャンネルを見る
- メッセージの送信
- メッセージ履歴の閲覧
- チャンネルの管理（`/setup recruitment` でチャンネルトピックを書き込むために必要）

## 検証

### セットアップ

```bash
pnpm db:migrate
pnpm --filter @discord-bot/bot commands:register
```

Discord で実行する。

```text
/setup recruitment channel:#your-channel
```

### 手動確認

1. `/recruitment create` を実行してモーダルに入力する。
2. 設定したチャンネルに Components V2 募集投稿が表示されることを確認する。
3. **参加**を押して参加者数が更新されることを確認する。
4. **退出**を押して参加者数が更新されることを確認する。
5. 定員まで参加させてステータスが `full` になることを確認する。
6. 作成者またはサーバー管理者としてクローズする。
7. サーバー管理権限のない非作成者がクローズできないことを確認する。

## 検証コマンド

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:migrate
docker compose --profile app build bot
```
