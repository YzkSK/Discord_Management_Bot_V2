# Setup Command Simplification Design

**Date:** 2026-06-12
**Status:** Approved

## Overview

`/setup` コマンドから不要なサブコマンドを削除し、募集チャンネルをDB管理に移行する。あわせてダッシュボードのチャンネル設定欄をテキスト入力からチャンネル名ドロップダウンに改善する。

## Scope

### 削除するもの

- `/setup tts` サブコマンド（TTS はダッシュボードで設定可能、かつ未設定でも動作する）
- `/setup recruitment` サブコマンド（DB + フォールバック方式に置き換え）
- `markRecruitmentChannel` の bot コマンドからの使用（チャンネルトピックマーカー書き込みが不要になる）

### 変更するもの

- 募集チャンネルをチャンネルトピックマーカースキャンからDB設定に移行
- `/recruitment create` の投稿先ロジック変更
- ダッシュボードの全チャンネル入力欄をドロップダウンに変更

### 変更しないもの

- `/setup logs`（ログチャンネルはトピックマーカー方式を維持）
- `/setup temp-vc`（temp-vc はダッシュボードでも設定可能だが、チャンネルピッカーUIのあるコマンドとして残す）
- `/setup voice-status`（同上）
- `recruitment-channel.ts` 内のユーティリティ関数（既存の募集投稿を持つサーバーの後方互換のため残す）

## Architecture

### DB Layer

**スキーマ変更（`packages/db/src/schema/core.ts`）:**

```ts
// guildConfigs テーブルに追加
recruitmentChannelId: text("recruitment_channel_id")
```

**マイグレーション（`packages/db/drizzle/0010_*.sql`）:**

```sql
ALTER TABLE "guild_configs" ADD COLUMN "recruitment_channel_id" text;
```

**リポジトリ変更（`packages/db/src/repositories/guilds.ts`）:**

- `getGuildConfigByGuildId` の返却値に `recruitmentChannelId` を追加
- `updateGuildRecruitmentConfigByGuildId(db, { guildId, recruitmentChannelId })` を追加

### Shared Package

**`packages/shared/src/settings.ts`:**

`DashboardSettingsFeatureInput` に `recruitmentChannelId: string | null` を追加。

`DashboardSettingsFeatures.recruitment` を変更:

```ts
// Before
recruitment: {
  channelMarker: string;
  configured: boolean;
}

// After
recruitment: {
  channelId: string | null;
  configured: boolean;
}
```

`buildDashboardSettingsFeatures` を対応して更新。

### Bot: `/recruitment create` の投稿先ロジック

```
1. DB から recruitmentChannelId を取得
2. 設定済み → そのチャンネルに投稿
3. 未設定 → interaction.channel（コマンドを打ったチャンネル）に投稿
```

エラーで止まらず、常に動作する。`findMarkedRecruitmentChannel` の呼び出しを削除。

### Bot: `/setup` コマンド

`tts` と `recruitment` サブコマンドを `setupCommand` ビルダーおよびハンドラから削除。対応する import も削除。

### Dashboard API

**`apps/dashboard/src/discord-api.ts`:**

```ts
export interface DiscordChannel {
  id: string;
  name: string;
  type: number; // Discord channel type
}

export async function fetchGuildChannels(
  botToken: string,
  guildId: string
): Promise<DiscordChannel[]>
```

Discord API の `GET /guilds/{guildId}/channels` を呼び出し。

**`apps/dashboard/src/app/api/settings/route.ts` — GET:**

settings レスポンスに以下を追加（`availableRoles` と同パターン、Bot Token が設定されている場合のみ）:

```ts
availableTextChannels?: { id: string; name: string }[]   // type 0
availableVoiceChannels?: { id: string; name: string }[]  // type 2
availableCategories?: { id: string; name: string }[]     // type 4
```

**`apps/dashboard/src/app/api/settings/validation.ts` + route.ts — PATCH:**

`recruitment` セクションを追加:

```ts
{ section: "recruitment", values: { channelId: string | null } }
```

### Dashboard UI

**`apps/dashboard/src/app/settings/settings-panel.tsx`:**

- `SettingsResponse` に `availableTextChannels`, `availableVoiceChannels`, `availableCategories` を追加
- `recruitmentChannelId` state を追加、dirty 判定に含める
- `saveAllChanges` に recruitment セクション更新を追加
- チャンネル入力欄をドロップダウンに変更:
  - temp-vc 作成チャンネル → `availableVoiceChannels` から選択
  - temp-vc カテゴリ → `availableCategories` から選択
  - TTS テキストチャンネル → `availableTextChannels` から選択
  - 募集チャンネル → `availableTextChannels` から選択（新規、「募集」タブに配置）
- 未取得時（`undefined`）は従来通りテキスト入力にフォールバック

## Data Flow

```
Settings GET
  └─ Discord API /guilds/{id}/channels → availableTextChannels / VoiceChannels / Categories
  └─ DB getGuildConfigByGuildId → recruitmentChannelId など

Settings PATCH (recruitment)
  └─ updateGuildRecruitmentConfigByGuildId → guild_configs.recruitment_channel_id

/recruitment create
  └─ getGuildConfigByGuildId → recruitmentChannelId
       ├─ 設定済み: guild.channels.cache.get(recruitmentChannelId)
       └─ 未設定: interaction.channel
```

## Error Handling

- Discord API のチャンネル取得失敗 → `availableTextChannels` を `undefined` にして UI はテキスト入力にフォールバック（既存の raw ID 入力と同じ）
- `recruitmentChannelId` が設定済みだが対象チャンネルが削除済み → `interaction.channel` にフォールバック

## Testing

- `handleRecruitmentCommand`: DB設定あり・なし両ケースのユニットテスト
- `updateGuildRecruitmentConfigByGuildId`: DBリポジトリのユニットテスト
- `buildDashboardSettingsFeatures`: `recruitmentChannelId` の入出力テスト
- settings PATCH バリデーション: `recruitment` セクションのテスト
