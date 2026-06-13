# Bot UX Improvements — Design Spec

**Date:** 2026-06-13  
**Scope:** Discord Bot コマンド UX + Dashboard UX + LLM 機能削除  
**Target user:** 一般サーバーメンバー（主）、サーバー管理者（副）

---

## 0. 事前作業 — Git 整頓

UX 改善作業を始める前に、未コミットの変更を論理的な単位に分けてコミットする。

### 現在の未コミット変更（ブランチ: `feat/bot-ui-ux`）

```
M  apps/bot/src/discord/tts-announce.ts         ← staged
 M apps/bot/src/discord/tts-session.ts
 M apps/bot/src/runtime.ts
 M apps/dashboard/src/app/health/health-dashboard.tsx
 M apps/dashboard/src/app/logs/logs-explorer.tsx
 M apps/dashboard/src/app/recruitment/recruitment-dashboard.tsx
 M apps/dashboard/src/app/tts/tts-dashboard.tsx
 M apps/dashboard/src/app/voice/voice-dashboard.tsx
 M docker-compose.yml
 M packages/config/src/env.ts
?? docs/superpowers/plans/2026-06-12-tts-ollama-llm-normalizer.md
```

### 分割コミット方針

`git diff` の内容を確認し、以下の論理グループに分けてコミットする。

| コミット | 対象ファイル候補 | 想定メッセージ例 |
|---------|----------------|----------------|
| Bot TTS 変更 | `tts-announce.ts`, `tts-session.ts`, `runtime.ts` | `feat/fix(bot): ...` |
| Dashboard 変更 | `health-dashboard.tsx`, `logs-explorer.tsx`, `recruitment-dashboard.tsx`, `tts-dashboard.tsx`, `voice-dashboard.tsx` | `feat/fix(dashboard): ...` |
| Config / Infra | `docker-compose.yml`, `packages/config/src/env.ts` | `chore(config): ...` |
| Docs | `docs/superpowers/plans/2026-06-12-tts-ollama-llm-normalizer.md` | `docs: add llm normalizer plan` |

> 実際の diff を見てグループが変わる場合はその内容に従って分割する。関連する変更は 1 コミットにまとめ、無関係な変更は分ける。

---

## Context

直近の機能追加（LLM 正規化、Temp VC リデザイン、TTS ポリッシュ）を経て、ユーザーが感じうる使いづらさを総点検した。問題は大きく「フィードバック不足」「状態の不可視性」「設定の不透明性」「UI の不統一」の 4 種類に分類できる。また Ollama LLM 正規化機能は不要と判断し、関連コードを完全削除する。

---

## 共通実装制約

- **メッセージ**: `createComponentsV2TextMessage({ title, lines, accentColor, privateResponse })` を必ず使用（`apps/bot/src/discord/components-v2.ts`）
- **文言**: `packages/shared/src/locale.ts` に EN + JA キーを追加（既存の `Locale` 型を拡張）
- **色**: `EVENT_COLORS` 定数から選択（`components-v2.ts` で定義済み）
- **数値定数**: インラインリテラルは使わず、ファイルスコープの `const` として名前を付ける
- Temp VC コントロールパネルは `ComponentType.Container` を直接組み立てる既存パターンを維持

---

## 1. TTS フィードバック層の追加

### 1-A. レート制限通知

**問題:** メッセージがスキップされても無音  
**変更:** `tts-message-reader.ts` の `skipReason === 'rate-limited'` ブロックでユーザーへ ephemeral 通知

```
title: loc.ttsRateLimited
lines: [loc.ttsRateLimitedHint]
accentColor: EVENT_COLORS.yellow
privateResponse: true
```

**連続抑制:** 同一ユーザーへの通知クールダウンを `const RATE_LIMIT_NOTIFY_COOLDOWN_MS` として定義し `Map<userId, timestamp>` で管理する。既存の `TtsMessageRateLimiter` が持つ `windowMs`/`maxMessages` の値はそのまま参照する（再定義しない）。

**新規ロケールキー:** `ttsRateLimited`, `ttsRateLimitedHint`

**影響ファイル:**
- `apps/bot/src/discord/tts-message-reader.ts`
- `packages/shared/src/locale.ts`

### 1-B. `/join` 成功レスポンスに `//` ヒント追加

**問題:** `//` でミュートになる仕様が説明なし  
**変更:** 既存の green embed の `lines` 末尾に `loc.ttsTipMutePrefix` を追加

**新規ロケールキー:** `ttsTipMutePrefix`

**影響ファイル:**
- `apps/bot/src/commands/tts.ts` (`handleJoinCommand`)
- `packages/shared/src/locale.ts`

---

## 2. `/force-join` に現在チャンネル表示

**問題:** 「別チャンネルに接続中」と表示されるが、どのチャンネルかが分からない

**変更:** `createForceJoinConfirmation` のシグネチャに `currentVoiceChannelId: string` を追加し、`lines` 先頭に `loc.ttsForceJoinCurrentChannel({ id: currentVoiceChannelId })` を挿入する。`currentVoiceChannelId` は custom ID には含めない（表示用途のみ）。

**新規ロケールキー:** `ttsForceJoinCurrentChannel`

**影響ファイル:**
- `apps/bot/src/commands/tts.ts` (`handleForceJoinCommand`, `createForceJoinConfirmation`)
- `packages/shared/src/locale.ts`

---

## 3. Temp VC コントロールパネル — 状態トグル化

**問題:** 「🔒 ロック」と「🔓 解除」が常に両方表示され、現在の状態が分からない

### `createTempVoiceControlMessage` の引数拡張

```typescript
interface TempVoiceControlMessageInput {
  ownerId: string;
  tempVoiceChannelId: string;
  allowedUserIds?: string[];
  deniedUserIds?: string[];
  isLocked: boolean;  // 追加
  isHidden: boolean;  // 追加
}
```

### ボタンのトグル化

- `isLocked === true` → 「🔓 解除」ボタンのみ表示、「🔒 ロック」は非表示
- `isLocked === false` → 「🔒 ロック」ボタンのみ表示
- `isHidden` も同様に「🙈 非表示」/「👁️ 表示」をトグル

### ヘッダーへの状態行追加

コントロールパネルの info セクションに現在の状態を表示する。表示文字列は locale キーを使わず UI 固定文字列（絵文字+状態名）で表現する（管理操作専用 UI のため）。

### 呼び出し側での状態判定

VC チャンネルの `permissionOverwrites.cache` を走査:
- `isLocked`: `@everyone` ロールの `Connect` が deny されているか
- `isHidden`: `@everyone` ロールの `ViewChannel` が deny されているか

既存の `getChannelUserPermissions` と同じ overwrite 走査パターンを参考にする。

**影響ファイル:**
- `apps/bot/src/discord/temp-voice-controls.ts`
- Temp VC 作成・更新でコントロールメッセージを生成している呼び出し箇所

---

## 4. Recruitment — auto-close 明示化 + 作成者通知

### 4-A. 作成成功レスポンスに設定値を表示

**変更:** 作成成功 embed の `lines` に `loc.recruitmentAutoCloseStatus({ enabled: boolean })` を追加

**新規ロケールキー:** `recruitmentAutoCloseStatus`

### 4-B. クローズ・再オープン時に作成者へ通知

自動クローズ発火時と参加者退出による再オープン時に、作成チャンネルへ `createComponentsV2TextMessage` でメッセージを送信する。

- クローズ通知: `accentColor: EVENT_COLORS.gray`
- 再オープン通知: `accentColor: EVENT_COLORS.green`

**新規ロケールキー:** `recruitmentClosedTitle`, `recruitmentClosedHint`, `recruitmentReopenedTitle`

**影響ファイル:**
- `apps/bot/src/commands/recruitment.ts`
- `apps/bot/src/discord/recruitment-interactions.ts`（または `recruitment-channel.ts`）
- `packages/shared/src/locale.ts`

---

## 5. `/setup status` サブコマンド追加

**問題:** 現在の設定チャンネルを Bot コマンドで確認できない

**変更:** `setupCommand` に `status` サブコマンドを追加（既存の `ManageGuild` 権限チェックを継承）

レスポンス:
```
title: loc.setupStatusTitle
accentColor: EVENT_COLORS.gray
privateResponse: true
lines: [
  loc.setupStatusTempVc({ id: string | null }),
  loc.setupStatusLogs({ id: string | null }),
  loc.setupStatusVoiceStatus({ id: string | null }),
]
```

`id` が `null` の場合は `loc.setupStatusNotConfigured` を表示。DB アクセスは既存の `getGuildConfigByGuildId(db, guildId)` を再利用する。

**新規ロケールキー:** `setupStatusTitle`, `setupStatusTempVc`, `setupStatusLogs`, `setupStatusVoiceStatus`, `setupStatusNotConfigured`

**影響ファイル:**
- `apps/bot/src/commands/setup.ts`
- `packages/shared/src/locale.ts`

---

## 6. Dashboard 言語統一 (英語化)

**問題:** サイドバーに「概要」「ログ」（日本語）と「Voice」「TTS」（英語）が混在

**変更:** Overview ページと Logs ページのメタデータ、およびサイドナビゲーション定義を英語に統一する。

- Overview: `title: "Overview"`, `description: "Server activity and KPIs"`
- Logs: `title: "Logs"`, `description: "Event history and real-time notifications"`

**影響ファイル:**
- `apps/dashboard/src/app/` 内 Overview・Logs の page ファイル（metadata）
- サイドナビゲーション定義ファイル

---

## 7. LLM 完全削除

**理由:** Ollama LLM 正規化機能は不要と判断

### 削除するファイル

- `apps/bot/src/discord/tts-llm-normalizer.ts`
- `apps/bot/src/discord/tts-llm-normalizer.test.ts`
- `apps/bot/src/commands/tts-llm.ts`

### コード変更

- `apps/bot/src/discord/tts-message-reader.ts`: `normalizeWithLlm()` 呼び出しとインポートを除去
- `apps/bot/src/runtime.ts`: `/tts-llm` コマンド登録を除去
- `packages/config/src/env.ts`: `OLLAMA_URL`, `OLLAMA_MODEL` 定義を除去

### DB

- `guild_configs.tts_llm_enabled` カラムを DROP するマイグレーションを追加
- DB パッケージの `getGuildTtsLlmEnabled`, `setGuildTtsLlmEnabled` 関数を削除

### インフラ

- `docker-compose.yml`: Ollama サービスを除去（存在する場合）
- 環境変数のサンプル・ドキュメントから `OLLAMA_*` を除去

---

## Verification

1. `/join` — VC 未参加で実行 → 赤エラー。VC 参加後に実行 → 緑成功 + `//` ヒントが lines に表示
2. TTS でメッセージを短時間に連投 → ephemeral 黄色警告が出る（連続送信しても通知が重複しない）
3. `/force-join` — Bot が別チャンネルにいる状態で実行 → 確認ダイアログに現在の接続チャンネルが表示
4. Temp VC 作成 → コントロールパネルに現在のロック/表示状態が表示される。ロックボタン押下後 → 「🔒 ロック」が消え「🔓 解除」に切り替わる
5. `/recruitment create` → 成功メッセージに auto-close の ON/OFF が表示される。定員到達時に作成チャンネルへ通知
6. `/setup status` — ManageGuild 権限で実行 → 設定チャンネル一覧が gray embed で返る
7. Dashboard サイドバーが全て英語（Overview, Voice, Recruitment, TTS, Health, Logs, Settings）
8. `/tts-llm` コマンドが Discord 上で存在しない（slash command リストに未表示）
9. `docker-compose up` で Ollama サービスが起動しない
10. DB マイグレーション後 `guild_configs` に `tts_llm_enabled` カラムがない
