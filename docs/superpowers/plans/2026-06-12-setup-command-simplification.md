# Setup Command Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/setup tts` と `/setup recruitment` を削除し、募集チャンネルをDB管理に移行、ダッシュボードのチャンネル設定欄をドロップダウンに改善する。

**Architecture:** `guild_configs` に `recruitment_channel_id` カラムを追加してチャンネルをDB管理へ移行する。`/recruitment create` はDBチャンネルID → コマンドチャンネルの順でフォールバック。ダッシュボードは Discord API からチャンネル一覧を取得してドロップダウン表示する。

**Tech Stack:** Drizzle ORM (PostgreSQL), discord.js, Next.js App Router, TypeScript, node:test

---

## File Map

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `packages/db/src/schema/core.ts` | Modify | `guildConfigs` に `recruitmentChannelId` カラム追加 |
| `packages/db/drizzle/0010_*.sql` | Create (generated) | マイグレーション |
| `packages/db/src/schema/core.test.ts` | Modify | 新カラムのテスト追加 |
| `packages/db/src/repositories/guilds.ts` | Modify | `getGuildConfigByGuildId` 返却値追加 + `updateGuildRecruitmentConfigByGuildId` 追加 |
| `packages/shared/src/settings.ts` | Modify | `DashboardSettingsFeatureInput` + `DashboardSettingsFeatures.recruitment` 変更 |
| `packages/shared/src/settings.test.ts` | Modify | `recruitmentChannelId` 対応テスト更新 |
| `apps/bot/src/commands/recruitment.ts` | Modify | `resolveRecruitmentChannel` 追加、ハンドラ更新 |
| `apps/bot/src/commands/recruitment.test.ts` | Create | `resolveRecruitmentChannel` のユニットテスト |
| `apps/bot/package.json` | Modify | テストスクリプトに新テストファイル追加 |
| `apps/bot/src/commands/setup.ts` | Modify | `tts` / `recruitment` サブコマンド削除 |
| `apps/bot/src/commands/setup.test.ts` | Modify | 削除したサブコマンドのテスト削除 |
| `apps/dashboard/src/discord-api.ts` | Modify | `fetchGuildChannels` 追加 |
| `apps/dashboard/src/app/api/settings/route.ts` | Modify | GET にチャンネル一覧追加、PATCH に `recruitment` セクション追加 |
| `apps/dashboard/src/app/api/settings/validation.ts` | Modify | `recruitment` セクションのパース追加 |
| `apps/dashboard/src/app/api/settings/validation.test.ts` | Modify | `recruitment` セクションテスト更新 |
| `apps/dashboard/src/app/settings/settings-panel.tsx` | Modify | チャンネルドロップダウン + 募集タブ追加 |

---

## Task 1: DB スキーマに `recruitment_channel_id` を追加

**Files:**
- Modify: `packages/db/src/schema/core.ts`
- Modify: `packages/db/src/schema/core.test.ts`

- [ ] **Step 1: `guildConfigs` テーブルに新カラムを追加**

`packages/db/src/schema/core.ts` の `guildConfigs` テーブル定義で `ttsTextChannelId` の直後に1行追加する：

```ts
    ttsTextChannelId: text("tts_text_channel_id"),
    recruitmentChannelId: text("recruitment_channel_id"),  // ← 追加
    language: text("language").notNull().default("en"),
```

- [ ] **Step 2: スキーマのテストに新カラムの確認を追加**

`packages/db/src/schema/core.test.ts` の `guildConfigs schema` describe ブロックに追加：

```ts
  it("exposes a recruitment channel id column", () => {
    const columns = guildConfigs as unknown as Record<string, unknown>;
    assert.notEqual(columns.recruitmentChannelId, undefined);
  });
```

- [ ] **Step 3: ビルドしてテストを実行（失敗確認）**

```
cd packages/db && pnpm build && node --test dist/src/schema/core.test.js
```

Expected: `recruitment channel id` テストが FAIL する。

- [ ] **Step 4: マイグレーションを生成**

```
cd packages/db && pnpm db:generate
```

`packages/db/drizzle/` に `0010_*.sql` が生成される。内容を確認：

```sql
ALTER TABLE "guild_configs" ADD COLUMN "recruitment_channel_id" text;
```

- [ ] **Step 5: マイグレーションを適用**

```
cd packages/db && pnpm db:migrate
```

Expected: `0010_*.sql` が適用される。

- [ ] **Step 6: テスト再実行（パス確認）**

```
cd packages/db && node --test dist/src/schema/core.test.js
```

Expected: すべて PASS。

- [ ] **Step 7: コミット**

```bash
git add packages/db/src/schema/core.ts packages/db/src/schema/core.test.ts packages/db/drizzle/
git commit -m "feat(db): add recruitment_channel_id column to guild_configs"
```

---

## Task 2: DB リポジトリを更新

**Files:**
- Modify: `packages/db/src/repositories/guilds.ts`

- [ ] **Step 1: `getGuildConfigByGuildId` の SELECT に `recruitmentChannelId` を追加**

`packages/db/src/repositories/guilds.ts` の `getGuildConfigByGuildId` 内の `.select({...})` ブロックで `ttsTextChannelId` の直後に追加：

```ts
      ttsTextChannelId: guildConfigs.ttsTextChannelId,
      recruitmentChannelId: guildConfigs.recruitmentChannelId,  // ← 追加
      updatedAt: guildConfigs.updatedAt
```

- [ ] **Step 2: `updateGuildRecruitmentConfigByGuildId` 関数を追加**

`packages/db/src/repositories/guilds.ts` のファイル末尾（`isGuildLogMode` 関数の前）に追加：

```ts
export async function updateGuildRecruitmentConfigByGuildId(
  db: DbClient,
  input: {
    guildId: string;
    recruitmentChannelId?: string | null;
  }
) {
  const [guild] = await db
    .select({ id: guilds.id })
    .from(guilds)
    .where(eq(guilds.guildId, input.guildId))
    .limit(1);

  if (!guild) {
    return null;
  }

  const [config] = await db
    .insert(guildConfigs)
    .values({
      guildRefId: guild.id,
      ...(input.recruitmentChannelId !== undefined
        ? { recruitmentChannelId: input.recruitmentChannelId }
        : {})
    })
    .onConflictDoUpdate({
      target: guildConfigs.guildRefId,
      set: {
        ...(input.recruitmentChannelId !== undefined
          ? { recruitmentChannelId: input.recruitmentChannelId }
          : {}),
        updatedAt: sql`now()`
      }
    })
    .returning();

  return config ?? null;
}
```

- [ ] **Step 3: ビルドして型エラーがないか確認**

```
cd packages/db && pnpm build
```

Expected: エラーなし。

- [ ] **Step 4: コミット**

```bash
git add packages/db/src/repositories/guilds.ts
git commit -m "feat(db): add recruitmentChannelId to guild config query and update function"
```

---

## Task 3: shared/settings の型とビルダーを更新

**Files:**
- Modify: `packages/shared/src/settings.ts`
- Modify: `packages/shared/src/settings.test.ts`

- [ ] **Step 1: `DashboardSettingsFeatureInput` に `recruitmentChannelId` を追加**

`packages/shared/src/settings.ts` の `DashboardSettingsFeatureInput` インターフェースに追加：

```ts
export interface DashboardSettingsFeatureInput {
  logMode: string;
  language: string;
  tempVoiceCreateChannelId: string | null;
  tempVoiceCategoryId: string | null;
  ttsTextChannelId: string | null;
  recruitmentChannelId: string | null;  // ← 追加
}
```

- [ ] **Step 2: `DashboardSettingsFeatures.recruitment` を `channelId` ベースに変更**

同ファイルの `DashboardSettingsFeatures` インターフェースの `recruitment` フィールドを変更：

```ts
  recruitment: {
    channelId: string | null;  // channelMarker から変更
    configured: boolean;
  };
```

- [ ] **Step 3: `buildDashboardSettingsFeatures` を更新**

同ファイルの `buildDashboardSettingsFeatures` 関数内の `recruitment` を変更：

```ts
    recruitment: {
      channelId: input.recruitmentChannelId,
      configured: Boolean(input.recruitmentChannelId)
    },
```

- [ ] **Step 4: テストを更新**

`packages/shared/src/settings.test.ts` を以下に置き換える：

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildDashboardSettingsFeatures } from "./settings.js";

describe("buildDashboardSettingsFeatures", () => {
  it("groups guild config settings by feature domain", () => {
    assert.deepEqual(
      buildDashboardSettingsFeatures({
        logMode: "metadata_only",
        language: "ja",
        tempVoiceCreateChannelId: "voice-create-1",
        tempVoiceCategoryId: "category-1",
        ttsTextChannelId: "tts-text-1",
        recruitmentChannelId: "recruit-ch-1"
      }),
      {
        logs: {
          logMode: "metadata_only",
          language: "ja"
        },
        tempVc: {
          createChannelId: "voice-create-1",
          categoryId: "category-1",
          configured: true
        },
        recruitment: {
          channelId: "recruit-ch-1",
          configured: true
        },
        tts: {
          textChannelId: "tts-text-1",
          configured: true
        }
      }
    );
  });

  it("marks optional feature settings as unconfigured when ids are missing", () => {
    const features = buildDashboardSettingsFeatures({
      logMode: "full",
      language: "en",
      tempVoiceCreateChannelId: null,
      tempVoiceCategoryId: null,
      ttsTextChannelId: null,
      recruitmentChannelId: null
    });

    assert.equal(features.tempVc.configured, false);
    assert.equal(features.tts.configured, false);
    assert.equal(features.recruitment.configured, false);
    assert.equal(features.recruitment.channelId, null);
  });
});
```

- [ ] **Step 5: ビルドしてテストを実行（失敗確認）**

```
cd packages/shared && pnpm build && node --test dist/settings.test.js
```

Expected: FAIL（インターフェース変更前なので型エラーかテスト失敗）。

- [ ] **Step 6: テスト再実行（パス確認）**

```
cd packages/shared && pnpm build && node --test dist/settings.test.js
```

Expected: すべて PASS。

- [ ] **Step 7: コミット**

```bash
git add packages/shared/src/settings.ts packages/shared/src/settings.test.ts
git commit -m "feat(shared): update recruitment settings to use channelId instead of channelMarker"
```

---

## Task 4: Bot - `/recruitment create` の投稿先ロジック変更

**Files:**
- Modify: `apps/bot/src/commands/recruitment.ts`
- Create: `apps/bot/src/commands/recruitment.test.ts`
- Modify: `apps/bot/package.json`

- [ ] **Step 1: テストファイルを作成（失敗確認用）**

`apps/bot/src/commands/recruitment.test.ts` を作成：

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ChannelType } from "discord.js";

import { resolveRecruitmentChannel } from "./recruitment.js";

describe("resolveRecruitmentChannel", () => {
  it("returns configured channel when recruitmentChannelId is set and channel exists", async () => {
    const fakeChannel = { id: "recruitment-ch", type: ChannelType.GuildText };

    const result = await resolveRecruitmentChannel({
      guildId: "guild-1",
      guild: {
        channels: { fetch: async (_id: string) => fakeChannel }
      } as never,
      interactionChannel: null,
      loadChannelId: async () => "recruitment-ch"
    });

    assert.equal(result?.id, "recruitment-ch");
  });

  it("falls back to interaction channel when no channelId is configured", async () => {
    const interactionChannel = { id: "cmd-channel", type: ChannelType.GuildText };

    const result = await resolveRecruitmentChannel({
      guildId: "guild-1",
      guild: { channels: { fetch: async () => null } } as never,
      interactionChannel: interactionChannel as never,
      loadChannelId: async () => null
    });

    assert.equal(result?.id, "cmd-channel");
  });

  it("falls back to interaction channel when configured channel has been deleted", async () => {
    const interactionChannel = { id: "cmd-channel", type: ChannelType.GuildText };

    const result = await resolveRecruitmentChannel({
      guildId: "guild-1",
      guild: { channels: { fetch: async () => null } } as never,
      interactionChannel: interactionChannel as never,
      loadChannelId: async () => "deleted-channel-id"
    });

    assert.equal(result?.id, "cmd-channel");
  });

  it("returns null when neither configured channel nor interaction channel is available", async () => {
    const result = await resolveRecruitmentChannel({
      guildId: "guild-1",
      guild: { channels: { fetch: async () => null } } as never,
      interactionChannel: null,
      loadChannelId: async () => null
    });

    assert.equal(result, null);
  });
});
```

- [ ] **Step 2: `package.json` のテストスクリプトに新テストファイルを追加**

`apps/bot/package.json` の `"test"` スクリプトで `dist/commands/setup.test.js` の直後に追加：

```json
"test": "tsc -p tsconfig.json && node --test dist/commands/setup.test.js dist/commands/recruitment.test.js dist/commands/tts.test.js ..."
```

（`dist/commands/setup.test.js` の直後に `dist/commands/recruitment.test.js` を挿入する）

- [ ] **Step 3: `recruitment.ts` を更新**

`apps/bot/src/commands/recruitment.ts` を以下の内容に変更する：

インポート部分を変更（`findMarkedRecruitmentChannel` を削除し、`getGuildConfigByGuildId` を追加）：

```ts
import {
  ChannelType,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type TextBasedChannel,
  type TextChannel,
  type Guild,
  type VoiceChannel
} from "discord.js";
import type { DbClient } from "@discord-bot/db";
import {
  createRecruitment,
  getGuildConfigByGuildId,
  setRecruitmentMessageId
} from "@discord-bot/db";
import { getLocale, isGuildLanguage, type GuildLanguage } from "@discord-bot/shared";

import { createComponentsV2TextMessage, EVENT_COLORS } from "../discord/components-v2.js";
import {
  createRecruitmentPostMessage
} from "../discord/recruitment-channel.js";
import type { DiscordLogWriter } from "../discord/log-writer.js";
import { writeRecruitmentLifecycleLog } from "../discord/recruitment-logs.js";
```

`RecruitmentCommandContext` インターフェースに `loadRecruitmentChannelId` を追加：

```ts
export interface RecruitmentCommandContext {
  db: DbClient;
  logWriter?: DiscordLogWriter;
  loadRecruitmentChannelId?: (guildId: string) => Promise<string | null>;
}
```

`resolveRecruitmentChannel` をエクスポートする新関数として追加（`resolveGuildLocale` の直後に挿入）：

```ts
export async function resolveRecruitmentChannel(input: {
  guildId: string;
  guild: Guild;
  interactionChannel: TextBasedChannel | null;
  loadChannelId: (guildId: string) => Promise<string | null>;
}): Promise<TextChannel | null> {
  const configuredId = await input.loadChannelId(input.guildId);

  if (configuredId) {
    const fetched = await input.guild.channels.fetch(configuredId).catch(() => null);
    if (fetched?.type === ChannelType.GuildText) {
      return fetched as TextChannel;
    }
  }

  if (input.interactionChannel?.type === ChannelType.GuildText) {
    return input.interactionChannel as TextChannel;
  }

  return null;
}
```

`handleRecruitmentCreate` 関数を更新（`findMarkedRecruitmentChannel` の呼び出しを削除し `resolveRecruitmentChannel` に置き換え）：

```ts
async function handleRecruitmentCreate(
  interaction: ChatInputCommandInteraction,
  context: RecruitmentCommandContext,
  loc: Loc
) {
  if (!interaction.guildId || !interaction.guild) {
    return;
  }

  const loadChannelId = context.loadRecruitmentChannelId ??
    ((guildId: string) =>
      getGuildConfigByGuildId(context.db, guildId)
        .then((c) => c?.recruitmentChannelId ?? null)
        .catch(() => null));

  const recruitmentChannel = await resolveRecruitmentChannel({
    guildId: interaction.guildId,
    guild: interaction.guild,
    interactionChannel: interaction.channel,
    loadChannelId
  });

  if (!recruitmentChannel) {
    await interaction.reply({
      ...createComponentsV2TextMessage({
        title: loc.recruitmentFailed,
        lines: [loc.notInGuild],
        accentColor: EVENT_COLORS.red,
        privateResponse: true
      })
    });
    return;
  }

  const voiceChannel = interaction.options.getChannel("vc") as VoiceChannel | null;
  const recruitment = await createRecruitment(context.db, {
    guildId: interaction.guildId,
    channelId: recruitmentChannel.id,
    creatorId: interaction.user.id,
    genre: interaction.options.getString("genre", true),
    capacity: interaction.options.getInteger("capacity", true),
    content: interaction.options.getString("content", true),
    voiceChannelId: voiceChannel?.id ?? null,
    autoClose: interaction.options.getBoolean("auto-close") ?? true
  });
  const message = await recruitmentChannel.send(
    createRecruitmentPostMessage(recruitment, loc)
  );

  const recruitmentWithMessage =
    (await setRecruitmentMessageId(context.db, {
      recruitmentId: recruitment.id,
      messageId: message.id
    })) ?? recruitment;

  if (context.logWriter) {
    writeRecruitmentLifecycleLog(context.logWriter, "recruitment.created", {
      recruitment: recruitmentWithMessage,
      actorId: interaction.user.id,
      participantCount: 0,
      reason: "created"
    });
  }

  await interaction.reply({
    ...createComponentsV2TextMessage({
      title: loc.recruitmentCreated,
      lines: [loc.recruitmentPostLink({ url: message.url })],
      accentColor: EVENT_COLORS.teal,
      privateResponse: true
    })
  });
}
```

- [ ] **Step 4: ビルドしてテストを実行（失敗確認）**

```
cd apps/bot && pnpm build && node --test dist/commands/recruitment.test.js
```

Expected: FAIL（`resolveRecruitmentChannel` がまだエクスポートされていないため）。

- [ ] **Step 5: テスト再実行（パス確認）**

```
cd apps/bot && pnpm build && node --test dist/commands/recruitment.test.js
```

Expected: 4テストすべて PASS。

- [ ] **Step 6: コミット**

```bash
git add apps/bot/src/commands/recruitment.ts apps/bot/src/commands/recruitment.test.ts apps/bot/package.json
git commit -m "feat(bot): replace setup-based recruitment channel with DB config + interaction channel fallback"
```

---

## Task 5: Bot - `/setup tts` と `/setup recruitment` サブコマンドを削除

**Files:**
- Modify: `apps/bot/src/commands/setup.ts`
- Modify: `apps/bot/src/commands/setup.test.ts`

- [ ] **Step 1: `setup.ts` から `tts` サブコマンドを削除**

`apps/bot/src/commands/setup.ts` で以下を削除：

1. `.addSubcommand(...)` ブロック（`setName("tts")` のもの、行95〜104）を削除
2. `handleSetupCommand` 内の `case "tts":` ブロックを削除
3. `handleTtsSetup` 関数全体（行337〜378）を削除
4. インポートから `updateGuildTtsConfigByGuildId` を削除

- [ ] **Step 2: `setup.ts` から `recruitment` サブコマンドを削除**

1. `.addSubcommand(...)` ブロック（`setName("recruitment")` のもの、行75〜89）を削除
2. `handleSetupCommand` 内の `case "recruitment":` ブロックを削除
3. `handleRecruitmentSetup` 関数全体（行298〜335）を削除
4. インポートから `markRecruitmentChannel`, `recruitmentChannelTopicMarker` を削除

- [ ] **Step 3: `setup.test.ts` を更新**

`apps/bot/src/commands/setup.test.ts` を以下に置き換える：

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { setupCommand } from "./setup.js";

describe("setupCommand", () => {
  it("includes temp-vc setup subcommand", () => {
    const payload = setupCommand.toJSON();
    const subcommandNames = payload.options?.map((option) => option.name);
    assert.ok(subcommandNames?.includes("temp-vc"));
  });

  it("includes logs setup subcommand", () => {
    const payload = setupCommand.toJSON();
    const subcommandNames = payload.options?.map((option) => option.name);
    assert.ok(subcommandNames?.includes("logs"));
  });

  it("includes voice-status setup subcommand", () => {
    const payload = setupCommand.toJSON();
    const subcommandNames = payload.options?.map((option) => option.name);
    assert.ok(subcommandNames?.includes("voice-status"));
  });

  it("does not include tts setup subcommand", () => {
    const payload = setupCommand.toJSON();
    const subcommandNames = payload.options?.map((option) => option.name);
    assert.ok(!subcommandNames?.includes("tts"));
  });

  it("does not include recruitment setup subcommand", () => {
    const payload = setupCommand.toJSON();
    const subcommandNames = payload.options?.map((option) => option.name);
    assert.ok(!subcommandNames?.includes("recruitment"));
  });
});
```

- [ ] **Step 4: ビルドしてテストを実行**

```
cd apps/bot && pnpm build && node --test dist/commands/setup.test.js
```

Expected: すべて PASS。

- [ ] **Step 5: コミット**

```bash
git add apps/bot/src/commands/setup.ts apps/bot/src/commands/setup.test.ts
git commit -m "feat(bot): remove /setup tts and /setup recruitment subcommands"
```

---

## Task 6: Dashboard - `fetchGuildChannels` を追加

**Files:**
- Modify: `apps/dashboard/src/discord-api.ts`

- [ ] **Step 1: `DiscordChannel` インターフェースと `fetchGuildChannels` 関数を追加**

`apps/dashboard/src/discord-api.ts` の `DiscordRole` インターフェースの直後に追加：

```ts
export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}
```

`fetchGuildRoles` 関数の直後にファイル末尾に追加：

```ts
export async function fetchGuildChannels(
  botToken: string,
  guildId: string
): Promise<DiscordChannel[]> {
  const response = await fetch(
    `${discordApiBaseUrl}/guilds/${guildId}/channels`,
    {
      headers: { Authorization: `Bot ${botToken}` },
      cache: "no-store"
    }
  );
  if (!response.ok) {
    throw new DiscordApiError(
      `Failed to load guild channels (${response.status}).`,
      response.status
    );
  }
  return (await response.json()) as DiscordChannel[];
}
```

- [ ] **Step 2: 型チェック**

```
cd apps/dashboard && pnpm lint
```

Expected: エラーなし。

- [ ] **Step 3: コミット**

```bash
git add apps/dashboard/src/discord-api.ts
git commit -m "feat(dashboard): add fetchGuildChannels to discord API client"
```

---

## Task 7: Dashboard Settings API を更新

**Files:**
- Modify: `apps/dashboard/src/app/api/settings/validation.ts`
- Modify: `apps/dashboard/src/app/api/settings/validation.test.ts`
- Modify: `apps/dashboard/src/app/api/settings/route.ts`

- [ ] **Step 1: `validation.ts` に `recruitment` セクションを追加**

`apps/dashboard/src/app/api/settings/validation.ts` で変更：

1. `SettingsPatchValue` 型の union に `recruitment` を追加：

```ts
  | {
      guildId: string;
      section: "recruitment";
      values: {
        channelId?: string | null;
      };
    };
```

2. `parseSettingsPatchBody` 内の `if (section === "recruitment")` ブロックを更新：

```ts
  if (section === "recruitment") {
    const valuesPatch = omitUndefined({
      channelId: readOptionalNullableString(values.channelId)
    });

    return {
      ok: true,
      value: {
        guildId: guildId.value,
        section,
        values: valuesPatch
      }
    };
  }
```

- [ ] **Step 2: `validation.test.ts` を更新**

`apps/dashboard/src/app/api/settings/validation.test.ts` の「rejects unsupported recruitment writes」テストを新しいテストに置き換え：

```ts
  it("accepts a recruitment channel settings payload", () => {
    assert.deepEqual(
      parseSettingsPatchBody({
        guildId: "guild-1",
        section: "recruitment",
        values: {
          channelId: "recruit-ch-1"
        }
      }),
      {
        ok: true,
        value: {
          guildId: "guild-1",
          section: "recruitment",
          values: {
            channelId: "recruit-ch-1"
          }
        }
      }
    );
  });

  it("accepts null channelId to clear recruitment channel", () => {
    assert.deepEqual(
      parseSettingsPatchBody({
        guildId: "guild-1",
        section: "recruitment",
        values: {
          channelId: null
        }
      }),
      {
        ok: true,
        value: {
          guildId: "guild-1",
          section: "recruitment",
          values: {
            channelId: null
          }
        }
      }
    );
  });
```

- [ ] **Step 3: ビルドしてテストを実行（失敗確認）**

```
cd apps/dashboard && pnpm test
```

Expected: `validation.test.js` の recruitment テストが FAIL。

- [ ] **Step 4: `route.ts` を更新 — GET にチャンネル一覧を追加**

`apps/dashboard/src/app/api/settings/route.ts` で変更：

インポートに `fetchGuildChannels` を追加：

```ts
import { fetchGuildRoles, fetchGuildChannels } from "../../../discord-api";
```

GET ハンドラの `availableRoles` の取得直後に追加：

```ts
    const channelsData = env.DISCORD_BOT_TOKEN
      ? await fetchGuildChannels(env.DISCORD_BOT_TOKEN, authorization.guild.id).catch(() => [])
      : [];

    const availableTextChannels = channelsData
      .filter((ch) => ch.type === 0)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ id, name }) => ({ id, name }));

    const availableVoiceChannels = channelsData
      .filter((ch) => ch.type === 2)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ id, name }) => ({ id, name }));

    const availableCategories = channelsData
      .filter((ch) => ch.type === 4)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ id, name }) => ({ id, name }));
```

`return NextResponse.json({...})` を更新（チャンネルリストを追加）：

```ts
    return NextResponse.json({
      ...toSettingsResponse(config),
      accessRole: authorization.role,
      dashboardManagementRoleIds: managementRoleIds,
      ...(availableRoles !== undefined ? { availableRoles } : {}),
      availableTextChannels,
      availableVoiceChannels,
      availableCategories
    });
```

- [ ] **Step 5: `route.ts` を更新 — PATCH に `recruitment` セクションを追加**

同ファイルの `updateSettingsSection` 関数に `recruitment` ブランチを追加：

```ts
  if (input.patch.section === "recruitment") {
    return updateGuildRecruitmentConfigByGuildId(db, {
      guildId: input.guildId,
      ...("channelId" in input.patch.values
        ? { recruitmentChannelId: input.patch.values.channelId }
        : {})
    });
  }
```

インポートに `updateGuildRecruitmentConfigByGuildId` を追加：

```ts
import {
  createDbConnection,
  getGuildConfigByGuildId,
  getGuildManagementRoleIds,
  updateGuildTempVoiceConfigByGuildId,
  updateGuildTtsConfigByGuildId,
  updateGuildRecruitmentConfigByGuildId,
  updateGuildConfigByGuildId,
  updateGuildManagementRoleIds
} from "@discord-bot/db";
```

- [ ] **Step 6: テストを実行（パス確認）**

```
cd apps/dashboard && pnpm test
```

Expected: すべて PASS。

- [ ] **Step 7: コミット**

```bash
git add apps/dashboard/src/app/api/settings/
git commit -m "feat(dashboard): add recruitment channel to settings API and include guild channel lists in GET response"
```

---

## Task 8: Dashboard UI — チャンネルドロップダウンと募集タブ

**Files:**
- Modify: `apps/dashboard/src/app/settings/settings-panel.tsx`

- [ ] **Step 1: `SettingsResponse` の型を更新**

`apps/dashboard/src/app/settings/settings-panel.tsx` の `SettingsResponse` インターフェースに追加：

```ts
interface DiscordChannel {
  id: string;
  name: string;
}

interface SettingsResponse {
  // ... 既存フィールド ...
  availableTextChannels?: DiscordChannel[];
  availableVoiceChannels?: DiscordChannel[];
  availableCategories?: DiscordChannel[];
}
```

- [ ] **Step 2: state と dirty 判定に `recruitmentChannelId` を追加**

state 変数を追加（`ttsTextChannelId` の直後）：

```ts
  const [recruitmentChannelId, setRecruitmentChannelId] = useState("");
```

`useEffect` 内で settings ロード時に初期化（`setTtsTextChannelId` の直後）：

```ts
        setRecruitmentChannelId(data.features.recruitment.channelId ?? "");
```

`dirtyCount` の useMemo 配列に追加：

```ts
      recruitmentChannelId !== (settings.features.recruitment.channelId ?? ""),
```

- [ ] **Step 3: `saveAllChanges` と `cancelChanges` を更新**

`saveAllChanges` 内に追加（`ttsChannelDirty` の直後）：

```ts
      const recruitmentDirty =
        recruitmentChannelId !== (settings.features.recruitment.channelId ?? "");
```

`Promise.all` の配列に追加：

```ts
        recruitmentDirty
          ? updateRecruitmentSettings(settings.guildId, recruitmentChannelId)
          : null,
```

`setSettings` のマージロジックはそのまま機能する（`...update` で上書きされる）。

`cancelChanges` に追加：

```ts
    setRecruitmentChannelId(settings.features.recruitment.channelId ?? "");
```

- [ ] **Step 4: `ChannelSelect` ヘルパーコンポーネントを追加**

ファイル末尾（`toErrorMessage` 関数の直前）に追加：

```tsx
function ChannelSelect({
  available,
  value,
  onChange,
  disabled
}: {
  available: DiscordChannel[] | undefined;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  if (available) {
    return (
      <Select disabled={disabled} onChange={(e) => onChange(e.target.value)} value={value}>
        <option value="">未設定</option>
        {available.map((ch) => (
          <option key={ch.id} value={ch.id}>
            {ch.name}
          </option>
        ))}
      </Select>
    );
  }
  return (
    <Input
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      value={value}
    />
  );
}
```

- [ ] **Step 5: temp-vc タブと TTS タブのチャンネル入力をドロップダウンに変更**

「音声タブ」内の temp-vc 作成チャンネル入力欄：

```tsx
              <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {loc.tempVcCreateChannelId}
                <ChannelSelect
                  available={settings.availableVoiceChannels}
                  value={tempVcCreateChannelId}
                  onChange={setTempVcCreateChannelId}
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {loc.tempVcCategoryId}
                <ChannelSelect
                  available={settings.availableCategories}
                  value={tempVcCategoryId}
                  onChange={setTempVcCategoryId}
                />
              </label>
```

「TTS タブ」内の TTS テキストチャンネル入力欄：

```tsx
              <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {loc.ttsTextChannelId}
                <ChannelSelect
                  available={settings.availableTextChannels}
                  value={ttsTextChannelId}
                  onChange={setTtsTextChannelId}
                />
              </label>
```

- [ ] **Step 6: 募集タブを追加**

`tabDefs` 配列に追加：

```tsx
  const tabDefs = [
    { key: "logs",        label: "ログ設定" },
    { key: "voice",       label: "音声" },
    { key: "tts",         label: "TTS" },
    { key: "recruitment", label: "募集" },
    { key: "access",      label: "アクセス管理" },
  ] as const;
```

`activeTab` の型を更新：

```tsx
  const [activeTab, setActiveTab] = useState<"logs" | "voice" | "tts" | "recruitment" | "access">("logs");
```

アクセス管理タブの直前に募集タブのコンテンツを追加：

```tsx
        {/* 募集タブ */}
        {activeTab === "recruitment" && (
          <Card>
            <CardHeader>
              <CardTitle>募集設定</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <FeatureStatus
                configured={settings.features.recruitment.configured}
                label="募集チャンネル"
                loc={loc}
              />
              <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                募集投稿チャンネル
                <ChannelSelect
                  available={settings.availableTextChannels}
                  value={recruitmentChannelId}
                  onChange={setRecruitmentChannelId}
                />
              </label>
              <p className="text-xs text-zinc-500">
                未設定の場合、/recruitment create を実行したチャンネルに投稿されます。
              </p>
            </CardContent>
          </Card>
        )}
```

- [ ] **Step 7: `updateRecruitmentSettings` API 関数を追加**

ファイル末尾（`updateTtsSettings` の直後）に追加：

```ts
async function updateRecruitmentSettings(guildId: string, channelId: string) {
  const r = await fetch("/api/settings", {
    body: JSON.stringify({
      guildId,
      section: "recruitment",
      values: {
        channelId: channelId || null
      }
    }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  if (!r.ok) throw new Error(`Failed to save recruitment settings (${r.status})`);
  return (await r.json()) as SettingsResponse;
}
```

- [ ] **Step 8: 型チェック**

```
cd apps/dashboard && pnpm lint
```

Expected: エラーなし。

- [ ] **Step 9: コミット**

```bash
git add apps/dashboard/src/app/settings/settings-panel.tsx
git commit -m "feat(dashboard): add channel dropdowns and recruitment settings tab"
```

---

## Self-Review チェックリスト

- [x] **スペックカバレッジ:** 全8変更レイヤーがタスクに対応済み
- [x] **プレースホルダー:** なし
- [x] **型の一貫性:**
  - `recruitmentChannelId` は DB → shared → dashboard で一貫して `string | null`
  - `resolveRecruitmentChannel` の引数型はテストと実装で一致
  - `SettingsPatchValue` の `recruitment` セクションは validation と route で一致
