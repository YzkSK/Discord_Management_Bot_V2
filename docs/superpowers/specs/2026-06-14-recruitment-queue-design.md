# 募集システム改善設計 — キュー・参加者表示・再オープン

Date: 2026-06-14

## 概要

募集システムに以下の改善を加える。

1. **参加者リスト表示** — 投稿メッセージに誰が参加・待機しているかを縦並びで表示
2. **キューシステム** — 定員超過時に締め切るのではなく待機列に追加する
3. **重複バリデーション** — 参加済み・未参加の状態に対する適切なフィードバック
4. **手動再オープンボタン** — 手動締め切り後に再オープンできるボタンを表示
5. **autoClose 廃止** — 自動締め切り概念を削除

---

## 削除するもの

- `recruitments.autoClose` / `autoClosed` DBカラム
- `autoClose` トグルボタン・設定UI（`settings` / `toggle-auto-close` アクション）
- `updateRecruitmentAutoClose` DB関数
- 自動締め切り・再オープン時のチャンネル通知（現行の `channel.send`）
- ロケールキー: `recruitmentAutoCloseStatus`, `recruitmentAutoClosedTitle`, `recruitmentAutoClosedHint`, `recruitmentReopenedTitle`, `recruitmentAutoCloseToggleOn`, `recruitmentAutoCloseToggleOff`, `recruitmentAutoCloseUpdated`, `recruitmentButtonSettings`, `recruitmentSettingsTitle`, `recruitmentNotCreator`, `recruitmentPostAutoClose`

---

## DB変更

### `recruitmentParticipants` テーブル

追加カラム：
- `isQueued boolean NOT NULL DEFAULT false` — 待機中かどうか
- `queuedAt timestamp` — キューに入った時刻（順序管理用、NULL = 通常参加）

削除カラム（`recruitments` テーブル）：
- `autoClose`
- `autoClosed`

### 新規DBマイグレーション

```sql
ALTER TABLE recruitment_participants
  ADD COLUMN is_queued boolean NOT NULL DEFAULT false,
  ADD COLUMN queued_at timestamp;

ALTER TABLE recruitments
  DROP COLUMN auto_close,
  DROP COLUMN auto_closed;
```

### 新規DB関数

```ts
// packages/db/src/repositories/recruitments.ts

// 特定ユーザーのアクティブな参加レコードを1件取得
getActiveParticipant(db, recruitmentId, userId)
  → recruitmentParticipants レコード | null

// アクティブな待機者をキュー順で取得
listQueuedParticipants(db, recruitmentId)
  → recruitmentParticipants[]  (queuedAt ASC)

// キューの先頭ユーザーを通常参加に繰り上げ
promoteFromQueue(db, recruitmentId)
  → { userId: string } | null
```

---

## ステータス定義

| ステータス | 意味 |
|-----------|------|
| `open` | 空きあり（参加可能） |
| `full` | 定員到達（キュー受付中） |
| `closed` | 手動締め切り |

`autoClose` 廃止により、定員到達時は常に `full` になる（自動で `closed` にならない）。

---

## 参加フロー

```
参加ボタン押下
  ├─ 既に参加中 → ephemeral「既に参加済みです」
  ├─ 既にキュー待機中 → ephemeral「既に待機リストに入っています」
  ├─ closed → ephemeral「この募集は締め切られています」
  ├─ 空きあり (open) → 通常参加、ステータス再計算、投稿更新
  │   ephemeral「✅ 参加しました！（X/Y人）」
  └─ 定員到達 (full) → キューに追加
      ephemeral「✅ 待機リストに追加されました（X番目）」
```

## 退出フロー

```
退出ボタン押下
  ├─ 未参加・未待機 → ephemeral「参加していません」
  ├─ キュー待機中 → キューから除外、投稿更新
  │   ephemeral「✅ 待機リストから外れました」
  └─ 通常参加中 → 退出処理、投稿更新
      ├─ キュー待機者あり → 先頭を繰り上げ（isQueued=false に更新）
      │   ステータスは参加者数を再計算して open/full を決定
      │   チャンネルに「<@promotedUserId> 参加枠が空きました！」送信
      └─ キュー待機者なし → ステータスを open/full に再計算
      ephemeral「✅ 退出しました。（X/Y人）」
```

## 締め切りフロー

```
締切ボタン押下（open / full のときのみ表示）
  ├─ 権限なし → ephemeral「作成者またはサーバー管理者のみが締め切れます」
  └─ 権限あり → status=closed、投稿更新
      ephemeral「✅ 募集を締め切りました」
```

## 再オープンフロー

```
再オープンボタン押下（手動 closed のときのみ表示）
  ├─ 権限なし → ephemeral エラー
  └─ 権限あり → status を参加者数に基づき open/full に戻す、投稿更新
      ephemeral「✅ 募集を再オープンしました」
```

---

## 投稿メッセージUI

```
🎮 募集: タイトル

🟢 募集中  ·  👥 3 / 5

──────────────────
内容テキスト
──────────────────
作成者: <@creatorId>
VC: <#vcId>

参加者:
<@111>
<@222>
<@333>

待機中:
<@444>
<@555>

[➕ 参加] [➖ 退出] [🔒 締切]
```

手動締め切り時：
```
[➕ 参加（disabled）] [➖ 退出] [🔓 再オープン]
```

参加者・待機者が0人のセクションは非表示。

---

## ボタンアクション

| アクション | 変更 |
|-----------|------|
| `join` | 維持 |
| `leave` | 維持 |
| `close` | 維持 |
| `reopen` | **新規追加** |
| `settings` | **削除** |
| `toggle-auto-close` | **削除** |

---

## 新規ロケールキー

| キー | ja | en |
|------|----|----|
| `recruitmentAlreadyJoined` | 既に参加済みです | You've already joined |
| `recruitmentAlreadyQueued` | 既に待機リストに入っています | You're already in the queue |
| `recruitmentQueueJoined` | `(vars: { position }) => \`✅ 待機リストに追加されました（${position}番目）\`` | Added to queue (position X) |
| `recruitmentQueueLeft` | ✅ 待機リストから外れました | ✅ Removed from queue |
| `recruitmentPromoted` | `(vars: { userId }) => \`<@${userId}> 参加枠が空きました！\`` | same |
| `recruitmentButtonReopen` | 🔓 再オープン | 🔓 Reopen |
| `recruitmentReopenedSuccess` | ✅ 募集を再オープンしました | ✅ Recruitment reopened |
| `recruitmentNotJoined` | 参加していません | You haven't joined |

---

## 変更ファイル一覧

| ファイル | 変更種別 |
|---------|---------|
| `packages/db/drizzle/XXXX_recruitment_queue.sql` | 新規マイグレーション |
| `packages/db/src/schema/core.ts` | `recruitments` / `recruitmentParticipants` スキーマ更新 |
| `packages/db/src/repositories/recruitments.ts` | 新規関数追加、`autoClose`関連削除 |
| `packages/db/src/index.ts` | 新規エクスポート追加 |
| `packages/shared/src/locale.ts` | ロケールキー追加・削除 |
| `apps/bot/src/discord/recruitment-channel.ts` | `createRecruitmentPostMessage` 更新、`settings`/`toggle-auto-close` 削除 |
| `apps/bot/src/discord/recruitment-interactions.ts` | 全ハンドラー更新、`handleReopen`追加、`handleSettings`/`handleToggleAutoClose`削除 |
| `apps/bot/src/discord/recruitment-interactions.test.ts` | テスト更新 |
| `apps/bot/src/discord/recruitment-channel.test.ts` | テスト更新 |
| `packages/db/src/repositories/recruitments.test.ts` | テスト更新 |
