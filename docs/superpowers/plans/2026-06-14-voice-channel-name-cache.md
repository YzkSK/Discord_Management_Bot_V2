# Voice Channel Name Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** チャンネル名をDBにキャッシュし、bot の `channelUpdate` イベントで自動更新することで、ダッシュボードのボイスセッション一覧に常に最新のチャンネル名を表示する。

**Architecture:** `discord_channels` テーブルを新設し、bot は VoiceStateUpdate と ChannelUpdate イベントで `(channelId, guildId, name)` を upsert する。ダッシュボードの voice API は Discord REST API を使わず、このテーブルを LEFT JOIN して名前を取得する。

**Tech Stack:** Drizzle ORM (PostgreSQL), discord.js Events, Next.js API route

---

## File Map

| 操作 | ファイル | 内容 |
|---|---|---|
| Modify | `packages/db/src/schema/core.ts` | `discordChannels` テーブル定義追加 |
| Generate | `packages/db/drizzle/0013_*.sql` | Drizzle migration (自動生成) |
| Create | `packages/db/src/repositories/discord-channels.ts` | `upsertDiscordChannel` / `listDiscordChannelNamesByIds` |
| Modify | `packages/db/src/index.ts` | 新リポジトリのエクスポート追加 |
| Create | `apps/bot/src/discord/channel-names.ts` | `installChannelNameHandlers` |
| Modify | `apps/bot/src/runtime.ts` | ハンドラーのインストール |
| Modify | `packages/db/src/repositories/voice-dashboard.ts` | `discordChannels` LEFT JOIN でチャンネル名取得 |
| Modify | `apps/dashboard/src/app/api/voice/route.ts` | Discord REST API 呼び出しの削除 |

---

### Task 1: DB スキーマに `discordChannels` テーブルを追加

**Files:**
- Modify: `packages/db/src/schema/core.ts`

- [ ] **Step 1: `discordChannels` テーブルを schema に追加**

`packages/db/src/schema/core.ts` の末尾（`recruitmentParticipants` テーブルの後、`ttsDictionaryEntries` の前）に追加:

```ts
export const discordChannels = pgTable(
  "discord_channels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    channelId: text("channel_id").notNull(),
    guildId: text("guild_id").notNull(),
    name: text("name").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => ({
    discordChannelsChannelIdIdx: uniqueIndex("discord_channels_channel_id_idx").on(
      table.channelId
    ),
    discordChannelsGuildIdx: index("discord_channels_guild_id_idx").on(
      table.guildId
    )
  })
);
```

- [ ] **Step 2: 型チェック**

```bash
cd packages/db && pnpm typecheck
```

Expected: エラーなし

- [ ] **Step 3: migration を生成**

```bash
cd packages/db && pnpm db:generate
```

Expected: `packages/db/drizzle/0013_*.sql` が生成され、`CREATE TABLE discord_channels` が含まれる

- [ ] **Step 4: migration を適用**

```bash
cd packages/db && pnpm db:migrate
```

Expected: `discord_channels` テーブルが DB に作成される

- [ ] **Step 5: commit**

```bash
git add packages/db/src/schema/core.ts packages/db/drizzle/
git commit -m "feat(db): add discord_channels table for channel name cache"
```

---

### Task 2: `discord-channels` リポジトリを作成

**Files:**
- Create: `packages/db/src/repositories/discord-channels.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: リポジトリファイルを作成**

`packages/db/src/repositories/discord-channels.ts`:

```ts
import { eq, inArray, sql } from "drizzle-orm";

import type { DbClient } from "../client.js";
import { discordChannels } from "../schema/index.js";

export async function upsertDiscordChannel(
  db: DbClient,
  input: { channelId: string; guildId: string; name: string }
) {
  await db
    .insert(discordChannels)
    .values({
      channelId: input.channelId,
      guildId: input.guildId,
      name: input.name
    })
    .onConflictDoUpdate({
      target: discordChannels.channelId,
      set: {
        name: sql`excluded.name`,
        updatedAt: sql`now()`
      }
    });
}

export async function listDiscordChannelNamesByIds(
  db: DbClient,
  channelIds: string[]
): Promise<Map<string, string>> {
  if (channelIds.length === 0) return new Map();

  const rows = await db
    .select({ channelId: discordChannels.channelId, name: discordChannels.name })
    .from(discordChannels)
    .where(inArray(discordChannels.channelId, channelIds));

  return new Map(rows.map((r) => [r.channelId, r.name]));
}
```

- [ ] **Step 2: `index.ts` にエクスポートを追加**

`packages/db/src/index.ts` に以下を追加（既存エクスポートのアルファベット順に合わせて挿入）:

```ts
export * from "./repositories/discord-channels.js";
```

`repositories/call-sessions.js` の後に挿入する。

- [ ] **Step 3: 型チェック**

```bash
cd packages/db && pnpm typecheck
```

Expected: エラーなし

- [ ] **Step 4: commit**

```bash
git add packages/db/src/repositories/discord-channels.ts packages/db/src/index.ts
git commit -m "feat(db): add discord-channels repository"
```

---

### Task 3: bot にチャンネル名ハンドラーをインストール

**Files:**
- Create: `apps/bot/src/discord/channel-names.ts`
- Modify: `apps/bot/src/runtime.ts`

- [ ] **Step 1: `channel-names.ts` を作成**

`apps/bot/src/discord/channel-names.ts`:

```ts
import { upsertDiscordChannel } from "@discord-bot/db";
import { Events, type Client } from "discord.js";

import type { DbClient } from "@discord-bot/db";

export function installChannelNameHandlers(client: Client, db: DbClient) {
  // 誰かが VC に参加/退出するたびにチャンネル名をキャプチャ
  client.on(Events.VoiceStateUpdate, (_oldState, newState) => {
    const channel = newState.channel;
    if (!channel || !("name" in channel) || typeof channel.name !== "string") {
      return;
    }
    void upsertDiscordChannel(db, {
      channelId: channel.id,
      guildId: newState.guild.id,
      name: channel.name
    }).catch((error: unknown) => {
      console.warn("failed to upsert channel name on voice update", error);
    });
  });

  // チャンネルがリネームされたときに更新
  client.on(Events.ChannelUpdate, (_oldChannel, newChannel) => {
    if (
      !("guildId" in newChannel) ||
      !("name" in newChannel) ||
      typeof newChannel.name !== "string" ||
      typeof newChannel.guildId !== "string"
    ) {
      return;
    }
    void upsertDiscordChannel(db, {
      channelId: newChannel.id,
      guildId: newChannel.guildId,
      name: newChannel.name
    }).catch((error: unknown) => {
      console.warn("failed to upsert channel name on channel update", error);
    });
  });
}
```

- [ ] **Step 2: `runtime.ts` にハンドラーをインストール**

`apps/bot/src/runtime.ts` の import セクションに追加:

```ts
import { installChannelNameHandlers } from "./discord/channel-names.js";
```

`installHandlers` 関数内の末尾（`installTtsMessageReader` の後）に追加:

```ts
installChannelNameHandlers(discordClient, db.db);
```

- [ ] **Step 3: 型チェック**

```bash
cd apps/bot && pnpm typecheck 2>/dev/null || npx tsc --noEmit
```

Expected: エラーなし

- [ ] **Step 4: commit**

```bash
git add apps/bot/src/discord/channel-names.ts apps/bot/src/runtime.ts
git commit -m "feat(bot): cache channel names on voice activity and channel rename"
```

---

### Task 4: voice-dashboard リポジトリに JOIN を追加

**Files:**
- Modify: `packages/db/src/repositories/voice-dashboard.ts`

- [ ] **Step 1: `discordChannels` を import に追加**

`packages/db/src/repositories/voice-dashboard.ts` の import を修正:

```ts
import { and, desc, eq, isNull, sql } from "drizzle-orm";

import type { DbClient } from "../client.js";
import {
  callSessionMembers,
  callSessions,
  discordChannels,
  tempVoiceChannels
} from "../schema/index.js";
```

- [ ] **Step 2: セッションクエリに `channelName` フィールドを追加**

`listVoiceDashboardState` のセッションクエリ（`.select({...})` 部分）を修正:

```ts
  const sessionRows = await db
    .select({
      channelId: callSessions.channelId,
      channelName: discordChannels.name,
      endedAt: callSessions.endedAt,
      id: callSessions.id,
      memberCount: sql<number>`count(${callSessionMembers.id})::int`,
      startedAt: callSessions.startedAt,
      status: callSessions.status
    })
    .from(callSessions)
    .leftJoin(
      callSessionMembers,
      and(
        eq(callSessionMembers.callSessionId, callSessions.id),
        isNull(callSessionMembers.leftAt)
      )
    )
    .leftJoin(
      discordChannels,
      eq(discordChannels.channelId, callSessions.channelId)
    )
    .where(eq(callSessions.guildId, input.guildId))
    .groupBy(
      callSessions.id,
      callSessions.channelId,
      callSessions.endedAt,
      callSessions.startedAt,
      callSessions.status,
      discordChannels.name
    )
    .orderBy(desc(callSessions.startedAt))
    .limit(clampRecentLimit(input.recentLimit));
```

- [ ] **Step 3: tempVoiceChannels クエリにも `channelName` を追加**

```ts
  const tempVoiceRows = await db
    .select({
      channelId: tempVoiceChannels.channelId,
      channelName: discordChannels.name,
      controlChannelId: tempVoiceChannels.controlChannelId,
      creationChannelId: tempVoiceChannels.creationChannelId,
      deleteScheduledAt: tempVoiceChannels.deleteScheduledAt,
      ownerId: tempVoiceChannels.ownerId
    })
    .from(tempVoiceChannels)
    .leftJoin(
      discordChannels,
      eq(discordChannels.channelId, tempVoiceChannels.channelId)
    )
    .where(eq(tempVoiceChannels.guildId, input.guildId))
    .orderBy(desc(tempVoiceChannels.createdAt));
```

- [ ] **Step 4: `sessions.map` で `channelName` を伝搬**

`return` ブロックの `sessions` のマップ処理を修正:

```ts
  return {
    sessions: sessionRows.map((session) => ({
      ...session,
      channelName: session.channelName ?? undefined,
      status: session.status === "ended" ? ("ended" as const) : ("active" as const)
    })),
    tempVoiceChannels: tempVoiceRows.map((vc) => ({
      ...vc,
      channelName: vc.channelName ?? undefined
    }))
  };
```

- [ ] **Step 5: 型チェック**

```bash
cd packages/db && pnpm typecheck
```

Expected: エラーなし

- [ ] **Step 6: commit**

```bash
git add packages/db/src/repositories/voice-dashboard.ts
git commit -m "feat(db): join discord_channels in voice dashboard query"
```

---

### Task 5: voice API route から Discord REST 呼び出しを削除

**Files:**
- Modify: `apps/dashboard/src/app/api/voice/route.ts`
- Modify: `apps/dashboard/src/app/api/voice/summary.ts`

- [ ] **Step 1: `route.ts` を整理**

`apps/dashboard/src/app/api/voice/route.ts` を以下に置き換え:

```ts
import {
  createDbConnection,
  listVoiceDashboardState
} from "@discord-bot/db";
import { NextResponse, type NextRequest } from "next/server";

import { authorizeDashboardApi } from "../../../dashboard-auth";
import { buildVoiceSummary } from "./summary";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guildId = optionalParam(request.nextUrl.searchParams, "guildId");
  const authorization = await authorizeDashboardApi({
    request,
    guildId,
    requiredRole: "viewer"
  });

  if (!authorization.allowed) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status }
    );
  }

  const dbConnection = createDbConnection();

  try {
    const state = await listVoiceDashboardState(dbConnection.db, {
      guildId: authorization.guild.id
    });

    return NextResponse.json({
      accessRole: authorization.role,
      guildId: authorization.guild.id,
      ...buildVoiceSummary(state)
    });
  } finally {
    await dbConnection.close();
  }
}

function optionalParam(query: URLSearchParams, key: string) {
  const value = query.get(key)?.trim();
  return value ? value : undefined;
}
```

- [ ] **Step 2: `summary.ts` の `channelNames` 引数を削除**

`buildVoiceSummary` のシグネチャと実装から `channelNames?: Map<string, string>` 引数を削除し、`session.channelName` を直接使う形に修正:

```ts
export function buildVoiceSummary(input: VoiceSummaryInput): VoiceSummary {
  const tempVoiceByChannelId = new Map(
    input.tempVoiceChannels.map((tempVoice) => [tempVoice.channelId, tempVoice])
  );

  const sessions = input.sessions.map((session) => {
    const tempVoice = tempVoiceByChannelId.get(session.channelId);
    return {
      channelId: session.channelId,
      ...(session.channelName !== undefined ? { channelName: session.channelName } : {}),
      durationSeconds: getDurationSeconds(session, input.now),
      ...(session.endedAt ? { endedAt: session.endedAt.toISOString() } : {}),
      id: session.id,
      memberCount: session.memberCount,
      startedAt: session.startedAt.toISOString(),
      status: session.status,
      tempVoice: tempVoice
        ? {
            controlChannelId: tempVoice.controlChannelId,
            creationChannelId: tempVoice.creationChannelId,
            deleteScheduledAt: tempVoice.deleteScheduledAt?.toISOString() ?? null,
            ownerId: tempVoice.ownerId
          }
        : null
    } satisfies VoiceSummarySession;
  });

  return {
    activeSessions: sessions.filter((session) => session.status === "active"),
    recentSessions: sessions.filter((session) => session.status === "ended"),
    tempVoiceChannels: input.tempVoiceChannels.map((tempVoice) => {
      return {
        ...tempVoice,
        deleteScheduledAt: tempVoice.deleteScheduledAt?.toISOString() ?? null
      };
    })
  };
}
```

- [ ] **Step 3: `VoiceSummarySessionInput` と `VoiceSummaryTempVoiceInput` に `channelName` を追加**

```ts
export interface VoiceSummarySessionInput {
  channelId: string;
  channelName?: string;
  endedAt: Date | null;
  id: string;
  memberCount: number;
  startedAt: Date;
  status: "active" | "ended";
}

export interface VoiceSummaryTempVoiceInput {
  channelId: string;
  channelName?: string;
  controlChannelId: string | null;
  creationChannelId: string;
  deleteScheduledAt: Date | null;
  ownerId: string;
}
```

また `VoiceSummary.tempVoiceChannels` の型も `channelName?` を引き継ぐように確認:

```ts
export interface VoiceSummary {
  activeSessions: VoiceSummarySession[];
  recentSessions: VoiceSummarySession[];
  tempVoiceChannels: Array<VoiceSummaryTempVoice & { channelId: string; channelName?: string }>;
}
```

`buildVoiceSummary` の `tempVoiceChannels` マップも:

```ts
    tempVoiceChannels: input.tempVoiceChannels.map((tempVoice) => ({
      ...tempVoice,
      deleteScheduledAt: tempVoice.deleteScheduledAt?.toISOString() ?? null
    }))
```

- [ ] **Step 4: 型チェック**

```bash
npx tsc --noEmit -p apps/dashboard/tsconfig.json
```

Expected: エラーなし

- [ ] **Step 5: commit**

```bash
git add apps/dashboard/src/app/api/voice/route.ts apps/dashboard/src/app/api/voice/summary.ts
git commit -m "refactor(dashboard): remove Discord REST API channel name fetch, use DB cache"
```

---

## Self-Review

**Spec coverage:**
- ✅ チャンネル名を DB にキャッシュ → Task 1-2
- ✅ VC 参加時にチャンネル名を upsert → Task 3 (VoiceStateUpdate)
- ✅ チャンネルリネーム時に更新 → Task 3 (ChannelUpdate)
- ✅ ダッシュボードに名前表示 → Task 4 (LEFT JOIN)
- ✅ Discord REST API 依存の削除 → Task 5

**Placeholder scan:** なし。全ステップにコードあり。

**Type consistency:**
- `discordChannels` — Task 1 で定義、Task 2,4 で参照
- `upsertDiscordChannel` — Task 2 で定義、Task 3 で使用
- `channelName?: string` — Task 4 の `voice-dashboard.ts` から Task 5 の `summary.ts` まで一貫
