# 「既に行われている」ガード 設計

## 背景

ボタンやコマンドを二回押したとき、現状は処理が二重に走るか、成功メッセージが返るだけで
ユーザーに何も伝わらないケースがある。
既に完了している操作を明示的に通知することで、操作ミスや混乱を防ぐ。

## 方針

DB または Discord の状態を確認し、既に目的の状態になっていれば yellow の ephemeral reply を
返して処理を終了する。既存の参加/脱退ボタンが採用しているパターンを全箇所に統一適用する。

## 対象と実装詳細

### 1. 募集ボタン — `apps/bot/src/discord/recruitment-interactions.ts`

権限チェック通過後、DB 更新前に挿入。

| ボタン | チェック | 新規ロケールキー |
|--------|---------|----------------|
| 締め切る | `recruitment.status === 'closed'` | `recruitmentAlreadyClosed` |
| 再開 | `recruitment.status !== 'closed'` | `recruitmentAlreadyOpen` |

```typescript
// handleClose 内
if (recruitment.status === 'closed') {
  await interaction.reply({ title: loc.recruitmentAlreadyClosed, accentColor: EVENT_COLORS.yellow, privateResponse: true });
  return;
}

// handleReopen 内
if (recruitment.status !== 'closed') {
  await interaction.reply({ title: loc.recruitmentAlreadyOpen, accentColor: EVENT_COLORS.yellow, privateResponse: true });
  return;
}
```

### 2. Temp VC ボタン — `apps/bot/src/discord/temp-voice-controls.ts`

`channel.permissionOverwrites.resolve(id)` で現在の Discord 権限設定を読み取る。
チェックはオーナー確認・チャンネル存在確認の後、`permissionOverwrites.edit` の前に挿入。

| ボタン | チェック条件 | メッセージ（日本語ハードコード） |
|--------|------------|-------------------------------|
| lock | `@everyone` Connect が `false` | 「既にロックされています」 |
| unlock | `@everyone` Connect が `false` でない | 「既にロック解除されています」 |
| hide | `@everyone` ViewChannel が `false` | 「既に非表示になっています」 |
| show | `@everyone` ViewChannel が `false` でない | 「既に表示されています」 |
| allow-target | 対象ユーザーの Connect が `true` | 「既に入室を許可しています」 |
| deny-target | 対象ユーザーの Connect が `false` | 「既に入室を禁止しています」 |

```typescript
// lock の例
const everyoneOverwrite = channel.permissionOverwrites.resolve(guild.roles.everyone.id);
if (everyoneOverwrite?.deny.has(PermissionFlagsBits.Connect)) {
  await replyPrivate(interaction, "既にロックされています", []);
  return true;
}

// allow-target の例
const targetOverwrite = channel.permissionOverwrites.resolve(parsed.targetUserId);
if (targetOverwrite?.allow.has(PermissionFlagsBits.Connect)) {
  await replyPrivate(interaction, "既に入室を許可しています", []);
  return true;
}
```

### 3. TTS コマンド — `apps/bot/src/commands/tts.ts`

| コマンド | チェック条件 | 対応 |
|---------|------------|------|
| `/tts join` | `result.status === "already-connected"` | 新規キー `ttsAlreadyConnectedHere` で「既にこのチャンネルに接続しています」 |
| `/tts force-join` | `result.status === "already-connected"` | 同上 |
| `/tts leave` | `!wasConnected` | 新規キー `ttsNotConnected` で「接続していません」 |
| `/tts speaker set` | 現在の speakerId と同一 | 新規キー `ttsSpeakerAlreadySet` で「既にそのスピーカーです」 |

`/tts join` と `/tts force-join` は session manager の結果を受け取った後に分岐を追加：

```typescript
// join/force-join 共通
if (result.status === "already-connected") {
  await replyPrivate(interaction, loc.ttsAlreadyConnectedHere, [...], EVENT_COLORS.yellow);
  return;
}
```

`/tts leave` は既存の `wasConnected` フラグを活用：

```typescript
if (!wasConnected) {
  await replyPrivate(interaction, loc.ttsNotConnected, [...], EVENT_COLORS.yellow);
  return;
}
```

`/tts speaker set` は DB から現在値を取得してから比較：

```typescript
const current = await getUserTtsSpeaker(context.db, { guildId, userId });
if (current?.speakerId === speakerId) {
  await replyPrivate(interaction, loc.ttsSpeakerAlreadySet, [...], EVENT_COLORS.yellow);
  return;
}
```

## ロケールキー追加

以下のキーを各言語ファイルに追加する（`packages/i18n/` 以下）。

| キー | JP | EN |
|------|----|----|
| `recruitmentAlreadyClosed` | この募集は既に締め切られています | This recruitment is already closed |
| `recruitmentAlreadyOpen` | この募集は既に再開されています | This recruitment is already open |
| `ttsAlreadyConnectedHere` | 既にこのチャンネルに接続しています | Already connected to this channel |
| `ttsNotConnected` | 接続していません | Not connected |
| `ttsSpeakerAlreadySet` | 既にそのスピーカーが選択されています | That speaker is already selected |

## 変更対象ファイル

- `apps/bot/src/discord/recruitment-interactions.ts` — close/reopen ハンドラにガード追加
- `apps/bot/src/discord/temp-voice-controls.ts` — lock/unlock/hide/show/allow-target/deny-target にガード追加
- `apps/bot/src/commands/tts.ts` — join/force-join/leave/speaker set にガード追加
- `packages/i18n/` 以下の言語ファイル — 新規ロケールキー追加

## 検証方法

1. 締め切り済みの募集に「締め切る」を押す → yellow ephemeral が出る
2. 再開済みの募集に「再開」を押す → yellow ephemeral が出る
3. ロック済みの Temp VC に「ロック」を押す → yellow ephemeral が出る
4. 既に許可済みのユーザーに「入室許可」を押す → yellow ephemeral が出る（deny も同様）
5. hide/show/unlock も同様に確認
6. TTS 接続中に `/tts join` を同じチャンネルで実行 → yellow ephemeral が出る
7. TTS 未接続時に `/tts leave` → yellow ephemeral が出る
8. 同じスピーカーで `/tts speaker set` → yellow ephemeral が出る
