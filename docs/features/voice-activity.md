# ボイスアクティビティ

指定したテキストチャンネルにアクティブな通話状況を表示する機能。

## セットアップ

テキストチャンネルをボイスステータス表示チャンネルとしてマークする。

```text
/setup voice-status channel:#チャンネル
```

Bot はチャンネルトピックにマーカーを追記する。

```text
[discord-management-bot:voice-status]
```

テスト前に最新のマイグレーションを適用する。

```bash
pnpm db:migrate
```

スラッシュコマンドを登録する（必要な場合）。

```bash
pnpm --filter @discord-bot/bot commands:register
```

## 動作仕様

- ギルドの全音声チャンネルで人間のボイス状態遷移を追跡する。
- Bot ユーザーは無視される。
- Bot のチャンネルと Temp VC コントロールチャンネルは無視される。
- 最初の人間メンバーがVCに参加すると、`callSessions` にアクティブセッションが作成される。
- ステータスチャンネルに `Started` を示す Components V2 メッセージが投稿される。
- 1 分後もセッションがアクティブなら、同じメッセージが `Active` に更新される。
- アクティブ中はステータスメッセージが 60 秒ごとに自動更新される。
- 少なくとも 1 人の人間メンバーが残っている間、セッションは `active` を維持する。
- 最後の人間メンバーが退出すると、セッションが `ended` にマークされ、ステータスメッセージが `Ended` に更新される。
- 1 分未満の短い通話は `Active` 更新なしで `Started` から `Ended` になる。
- VCの移動は旧チャンネルの退出と新チャンネルへの参加として処理される。

ステータスメッセージの更新が失敗した場合、`voice.status.update_failed` を source とした `system.handler.error` が記録される。

## ログイベント

| イベント | 説明 |
|---|---|
| `call.started` | 新しいアクティブセッションが作成された。ペイロード: `sessionId`, `voiceChannelId`, `startedAt` |
| `call.ended` | 最後の人間メンバーが退出した。ペイロード: `sessionId`, `voiceChannelId`, `endedAt` |
| `call.member_joined` | メンバーがアクティブな通話に参加した |
| `call.member_left` | メンバーがアクティブな通話から退出した |

`voice.session.join`、`voice.session.leave`、`voice.session.move` はゲートウェイイベントログ。`call.started` と `call.ended` は集約された通話セッション状態を表す。

## Bot に必要な権限

- チャンネルを見る
- チャンネルの管理（`/setup voice-status` でチャンネルトピックを書き込むために必要）
- ステータスチャンネルへのメッセージ送信
- ステータスチャンネルのメッセージ履歴の閲覧

## データベース

| テーブル | カラム | 説明 |
|---|---|---|
| `callSessions` | `guildId` | Discord ギルドID |
| | `channelId` | 音声チャンネルID |
| | `statusMessageId` | 編集するステータスメッセージID |
| | `status` | `active` または `ended` |
| | `startedAt` | セッション開始タイムスタンプ |
| | `endedAt` | セッション終了タイムスタンプ |
| `callSessionMembers` | `callSessionId` | 親セッション |
| | `userId` | Discord ユーザーID |
| | `joinOrder` | 参加順序（Temp VC 所有権移転にも使用） |
| | `joinedAt` | 参加タイムスタンプ |
| | `leftAt` | 退出タイムスタンプ |

`callSessions` は Temp VC と共有される。`statusMessageId` により、Bot が `Started` → `Active` → `Ended` の遷移で同じメッセージを編集できる。

## 検証

手動確認:

1. マイグレーションを適用する。
2. スラッシュコマンドを登録する。
3. `/setup voice-status channel:#チャンネル` を実行する。
4. ユーザー A が任意のVCに参加する。
5. ステータスチャンネルに `Started` を示す Components V2 メッセージが投稿されることを確認する。
6. ユーザー A を 1 分以上VCに留まらせる。
7. 同じメッセージが `Active` に更新されることを確認する。
8. ユーザー B が同じVCに参加してもセッションがアクティブのままであることを確認する。
9. ユーザー A が退出してもユーザー B がいる間はセッションがアクティブのままであることを確認する。
10. ユーザー B が退出する。
11. ステータスメッセージが `Ended` に更新されて残ることを確認する。
12. 1 分未満の短い通話で `Started` から直接 `Ended` になることを確認する。
13. Dashboard ログに `call.started` と `call.ended` が記録されることを確認する。

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:migrate
docker compose --profile app build bot
```
