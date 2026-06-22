# 募集の締切・再オープン（ダッシュボード）

**日付:** 2026-06-22
**ブランチ:** feat/dashboard-ux

## 概要

Webダッシュボードから募集の締切（close）と再オープン（reopen）ができるようにする。  
admin/owner は他人が作成した募集を含むすべての操作が可能。  
操作時は DB 更新と Discord メッセージの PATCH を両方行う。

## 権限マトリクス

| ロール  | 自分の募集 | 他人の募集 |
|---------|-----------|-----------|
| viewer  | ○         | ✗         |
| admin   | ○         | ○         |
| owner   | ○         | ○         |

## API

### `PATCH /api/recruitments/[id]`

**新規ファイル:** `apps/dashboard/src/app/api/recruitments/[id]/route.ts`

**リクエスト body:**
```json
{ "action": "close" | "reopen", "guildId": "string" }
```

**レスポンス（成功）:**
```json
{ "recruitment": { ...updatedFields } }
```

**権限チェックの順序:**
1. `authorizeDashboardApi({ requiredRole: "viewer" })` — JWT/セッション検証
2. `getRecruitmentById(id)` で取得 → `recruitment.guildId === authorization.guild.id` を検証
3. viewer の場合のみ `recruitment.creatorId === authorization.userId` をチェック（admin/owner はスキップ）

**close フロー:**
1. `recruitment.status === "closed"` → 400 `{ error: "already closed" }`
2. `closeRecruitment(db, { recruitmentId })` で DB 更新
3. Discord メッセージが存在する場合（`messageId` が非 null）、`buildRecruitmentUpdatePayload` でペイロード生成 → `PATCH /channels/{channelId}/messages/{messageId}`

**reopen フロー:**
1. `recruitment.status !== "closed"` → 400 `{ error: "not closed" }`
2. `listActiveRecruitmentParticipants` でカウントを取得
3. `status = activeCount >= capacity ? "full" : "open"`
4. `reopenRecruitment(db, { recruitmentId, status, deadlineAt: now + REOPEN_DEADLINE_HOURS })` で DB 更新
5. Discord メッセージを PATCH

**Discord メッセージ更新 (`buildRecruitmentUpdatePayload`):**
- `listActiveRecruitmentParticipants` と `listQueuedParticipants` を並列取得
- Bot の `createRecruitmentPostMessage` と同等のペイロードを生成（raw 整数定数を使用、discord.js 不使用）
- 文言は `getLocale` を使用（guildConfig の language に従う）
- close 後は close ボタン → reopen ボタンに切替、join ボタンは disabled
- reopen 後は reopen ボタン → close ボタンに切替、join ボタンは enabled

## UI

### viewer ロール：`MyRecruitmentRow` の変更

`apps/dashboard/src/app/recruitment/recruitment-dashboard.tsx`

- 行の右端にボタンを追加
- open/full の場合：「締め切る」ボタン（`variant="ghost"` + 赤テキスト）
- closed の場合：「再オープン」ボタン（`variant="ghost"`）
- `onAction(id, action)` コールバックを props で受け取る

### admin/owner ロール：`RecruitmentCard` の変更

- `CapacityBar` の下にボタンを追加
- open/full：「締め切る」ボタン
- closed：「再オープン」ボタン
- `onAction(id, action)` コールバックを props で受け取る

### `RecruitmentDashboard` の変更

- `closingId: string | null` の state を追加（処理中の募集 ID を管理）
- `handleAction(id, action)` 関数を定義
  1. `setClosingId(id)`
  2. `PATCH /api/recruitments/{id}` を呼ぶ
  3. 成功 → `reload()` → `setClosingId(null)`
  4. 失敗 → エラーを表示 → `setClosingId(null)`
- `handleAction` と `closingId` を `RecruitmentCard` / `MyRecruitmentRow` に props として渡す

### エラー表示

- 行/カード内のインライン表示は実装コストが高いため、ダッシュボード上部の `ErrorAlert` を再利用
- `actionError: string | null` state を追加し、操作失敗時にセット

## 影響範囲

| ファイル | 変更種別 |
|---------|---------|
| `apps/dashboard/src/app/api/recruitments/[id]/route.ts` | 新規作成 |
| `apps/dashboard/src/app/recruitment/recruitment-dashboard.tsx` | 変更（UI追加） |

DB マイグレーション不要（`closeRecruitment` / `reopenRecruitment` は既存）。  
`@discord-bot/db` の追加エクスポート不要（`listQueuedParticipants` は既にエクスポート済み）。
