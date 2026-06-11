# UserMention Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Discordメンション風の `<UserMention>` コンポーネントを追加し、クリックでアバター・ユーザー名・IDを表示するポップオーバーを出す。

**Architecture:** `@radix-ui/react-popover` でポップオーバーを実装。クリック時に `/api/discord/users/[userId]` をfetchし、Botトークン経由でDiscord APIからユーザー情報を取得。同一ページ内のキャッシュでfetch回数を最小化。純粋なヘルパー関数は `event-display.ts` に追加してテスト。JSXを返す `formatEventDescriptionJSX()` は別ファイルに分離しNode.jsテスト環境から切り離す。

**Tech Stack:** Next.js App Router, Radix UI Popover, Lucide React, Discord REST API v10

---

## ファイル構成

| パス | 役割 |
|------|------|
| `apps/dashboard/src/lib/discord-user.ts` | Discord APIフェッチロジック（純粋関数・テスト可能） |
| `apps/dashboard/src/lib/discord-user.test.ts` | 上記のテスト |
| `apps/dashboard/src/lib/event-display.ts` | `getActorText` / `splitDescriptionOnActor` を追記（既存ファイル） |
| `apps/dashboard/src/lib/event-display.test.ts` | 上記新関数のテストを追記（既存ファイル） |
| `apps/dashboard/src/lib/format-event-jsx.tsx` | `formatEventDescriptionJSX()` JSXヘルパー（テスト対象外・ブラウザのみ） |
| `apps/dashboard/src/components/user-cache.ts` | ページ滞在中のインメモリキャッシュ |
| `apps/dashboard/src/components/user-mention.tsx` | `<UserMention>` コンポーネント |
| `apps/dashboard/src/app/api/discord/users/[userId]/route.ts` | APIルートハンドラ |
| `apps/dashboard/src/app/logs/logs-explorer.tsx` | 接続先（変更） |
| `apps/dashboard/src/app/overview-client.tsx` | 接続先（変更） |
| `apps/dashboard/package.json` | `@radix-ui/react-popover` 追加 |
| `apps/dashboard/tsconfig.test.json` | 新テストファイルを追加 |

---

## Task 1: @radix-ui/react-popover をインストール

**Files:**
- Modify: `apps/dashboard/package.json`

- [ ] **Step 1: package.json の dependencies に追加**

`apps/dashboard/package.json` の `dependencies` に追記:

```json
"@radix-ui/react-popover": "^1.1.6",
```

- [ ] **Step 2: インストール実行**

プロジェクトルートから:

```bash
pnpm install
```

Expected: `node_modules/@radix-ui/react-popover` が存在すること。

- [ ] **Step 3: コミット**

```bash
git add apps/dashboard/package.json pnpm-lock.yaml
git commit -m "feat(dashboard): add @radix-ui/react-popover"
```

---

## Task 2: Discord APIフェッチロジック（テスト付き）

**Files:**
- Create: `apps/dashboard/src/lib/discord-user.ts`
- Create: `apps/dashboard/src/lib/discord-user.test.ts`
- Modify: `apps/dashboard/tsconfig.test.json`
- Modify: `apps/dashboard/package.json` (test script)

- [ ] **Step 1: テストを書く**

`apps/dashboard/src/lib/discord-user.test.ts` を作成:

```typescript
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAvatarUrl, fetchDiscordApiUser } from "./discord-user.js";

describe("buildAvatarUrl", () => {
  it("avatar hash がある場合は CDN URL を返す", () => {
    const url = buildAvatarUrl("123456789012345678", "abc123hash");
    assert.equal(
      url,
      "https://cdn.discordapp.com/avatars/123456789012345678/abc123hash.png?size=80"
    );
  });

  it("avatar hash がない場合はデフォルトアバター URL を返す", () => {
    const url = buildAvatarUrl("123456789012345678", null);
    assert.ok(url.startsWith("https://cdn.discordapp.com/embed/avatars/"));
    assert.ok(url.endsWith(".png"));
  });
});

describe("fetchDiscordApiUser", () => {
  it("404 の場合は null を返す", async () => {
    const mockFetch = async (_url: string, _init?: RequestInit): Promise<Response> =>
      ({ status: 404, ok: false } as Response);
    const result = await fetchDiscordApiUser("123", "token", mockFetch);
    assert.equal(result, null);
  });

  it("429 の場合はエラーを投げる", async () => {
    const mockFetch = async (_url: string, _init?: RequestInit): Promise<Response> =>
      ({ status: 429, ok: false } as Response);
    await assert.rejects(
      () => fetchDiscordApiUser("123", "token", mockFetch),
      /Discord API returned 429/
    );
  });

  it("正常レスポンスの場合はユーザー情報を返す", async () => {
    const mockFetch = async (_url: string, _init?: RequestInit): Promise<Response> =>
      ({
        status: 200,
        ok: true,
        json: async () => ({
          id: "111222333444555666",
          username: "yuzuki",
          global_name: "Yuzuki",
          avatar: "abc123hash",
        }),
      } as Response);
    const result = await fetchDiscordApiUser("111222333444555666", "token", mockFetch);
    assert.equal(result?.id, "111222333444555666");
    assert.equal(result?.username, "yuzuki");
    assert.equal(result?.globalName, "Yuzuki");
    assert.ok(result?.avatarUrl.includes("abc123hash"));
  });

  it("avatar が null の場合はデフォルトアバター URL を返す", async () => {
    const mockFetch = async (_url: string, _init?: RequestInit): Promise<Response> =>
      ({
        status: 200,
        ok: true,
        json: async () => ({
          id: "111222333444555666",
          username: "yuzuki",
          global_name: null,
          avatar: null,
        }),
      } as Response);
    const result = await fetchDiscordApiUser("111222333444555666", "token", mockFetch);
    assert.ok(result?.avatarUrl.startsWith("https://cdn.discordapp.com/embed/avatars/"));
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd apps/dashboard && pnpm exec tsc -p tsconfig.test.json --noEmit
```

Expected: `discord-user.ts` が存在しないためエラーになる（`Cannot find module`）。

- [ ] **Step 3: 実装を書く**

`apps/dashboard/src/lib/discord-user.ts` を作成:

```typescript
export interface DiscordUserResponse {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string;
}

interface DiscordApiUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}

export function buildAvatarUrl(id: string, avatarHash: string | null): string {
  if (avatarHash) {
    return `https://cdn.discordapp.com/avatars/${id}/${avatarHash}.png?size=80`;
  }
  const index = Number(BigInt(id) % 5n);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export async function fetchDiscordApiUser(
  userId: string,
  botToken: string,
  fetcher: (url: string, init?: RequestInit) => Promise<Response> = fetch
): Promise<DiscordUserResponse | null> {
  const response = await fetcher(`https://discord.com/api/v10/users/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Discord API returned ${response.status}`);

  const user = (await response.json()) as DiscordApiUser;
  return {
    id: user.id,
    username: user.username,
    globalName: user.global_name,
    avatarUrl: buildAvatarUrl(user.id, user.avatar),
  };
}
```

- [ ] **Step 4: tsconfig.test.json に追加**

`apps/dashboard/tsconfig.test.json` の `include` 配列末尾に追加:

```json
"src/lib/discord-user.ts",
"src/lib/discord-user.test.ts"
```

- [ ] **Step 5: package.json の test スクリプトに追加**

`apps/dashboard/package.json` の `"test"` スクリプト内 `node --test ...` の末尾にスペース区切りで追加:

```
dist-test/lib/discord-user.test.js
```

- [ ] **Step 6: テストを実行して全て通ることを確認**

```bash
cd apps/dashboard && pnpm exec tsc -p tsconfig.test.json && node --test dist-test/lib/discord-user.test.js
```

Expected: 5 tests pass, 0 failures.

- [ ] **Step 7: コミット**

```bash
git add apps/dashboard/src/lib/discord-user.ts apps/dashboard/src/lib/discord-user.test.ts apps/dashboard/tsconfig.test.json apps/dashboard/package.json
git commit -m "feat(dashboard): add Discord user fetch logic with tests"
```

---

## Task 3: event-display.ts に純粋ヘルパー関数を追加

**Files:**
- Modify: `apps/dashboard/src/lib/event-display.ts`
- Modify: `apps/dashboard/src/lib/event-display.test.ts`

- [ ] **Step 1: テストを追記**

`apps/dashboard/src/lib/event-display.test.ts` の末尾に追記:

```typescript
describe("getActorText", () => {
  it("actorName がある場合は @actorName を返す", () => {
    assert.equal(getActorText({ actorName: "Yuzuki" }), "@Yuzuki");
  });

  it("actorName がなく actorId がある場合は先頭8文字 + … を返す", () => {
    assert.equal(getActorText({ actorId: "123456789012345678" }), "@12345678…");
  });

  it("どちらもない場合は null を返す", () => {
    assert.equal(getActorText({}), null);
  });

  it("actorName が null で actorId がある場合は actorId ベースを返す", () => {
    assert.equal(getActorText({ actorId: "111222333", actorName: null }), "@11122233…");
  });
});

describe("splitDescriptionOnActor", () => {
  it("アクターテキストが含まれる場合に before/after で分割する", () => {
    const result = splitDescriptionOnActor("🎤 @Yuzuki が参加", "@Yuzuki");
    assert.deepEqual(result, { before: "🎤 ", after: " が参加" });
  });

  it("アクターテキストが含まれない場合は null を返す", () => {
    const result = splitDescriptionOnActor("🗑️ メッセージを削除", "@Yuzuki");
    assert.equal(result, null);
  });

  it("先頭にアクターテキストがある場合", () => {
    const result = splitDescriptionOnActor("@Yuzuki がログイン", "@Yuzuki");
    assert.deepEqual(result, { before: "", after: " がログイン" });
  });
});
```

また、ファイル先頭の import に `getActorText` と `splitDescriptionOnActor` を追加:

```typescript
import {
  formatEventDescription,
  getActorText,
  splitDescriptionOnActor,
  getEventColor,
  getEventIcon,
  formatRelativeTime,
} from "./event-display.js";
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd apps/dashboard && pnpm exec tsc -p tsconfig.test.json && node --test dist-test/lib/event-display.test.js
```

Expected: `getActorText` / `splitDescriptionOnActor` が存在しないためエラーになる。

- [ ] **Step 3: event-display.ts に関数を追加**

`apps/dashboard/src/lib/event-display.ts` の末尾（`eventColorClasses` の後）に追加:

```typescript
export function getActorText(vars: EventVars): string | null {
  if (vars.actorName) return `@${vars.actorName}`;
  if (vars.actorId) return `@${vars.actorId.slice(0, 8)}…`;
  return null;
}

export function splitDescriptionOnActor(
  description: string,
  actorText: string
): { before: string; after: string } | null {
  const idx = description.indexOf(actorText);
  if (idx === -1) return null;
  return {
    before: description.slice(0, idx),
    after: description.slice(idx + actorText.length),
  };
}
```

- [ ] **Step 4: テストを実行して全て通ることを確認**

```bash
cd apps/dashboard && pnpm exec tsc -p tsconfig.test.json && node --test dist-test/lib/event-display.test.js
```

Expected: 既存テスト + 新規7テスト、全て pass。

- [ ] **Step 5: コミット**

```bash
git add apps/dashboard/src/lib/event-display.ts apps/dashboard/src/lib/event-display.test.ts
git commit -m "feat(dashboard): export getActorText and splitDescriptionOnActor"
```

---

## Task 4: インメモリキャッシュ

**Files:**
- Create: `apps/dashboard/src/components/user-cache.ts`

- [ ] **Step 1: ファイルを作成**

`apps/dashboard/src/components/user-cache.ts` を作成:

```typescript
export interface CachedDiscordUser {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string;
}

const cache = new Map<string, CachedDiscordUser>();

function defaultAvatarUrl(userId: string): string {
  const index = Number(BigInt(userId) % 5n);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export async function fetchCachedDiscordUser(
  userId: string
): Promise<CachedDiscordUser> {
  const hit = cache.get(userId);
  if (hit) return hit;

  const response = await fetch(`/api/discord/users/${userId}`);
  if (!response.ok) {
    const fallback: CachedDiscordUser = {
      id: userId,
      username: userId,
      globalName: null,
      avatarUrl: defaultAvatarUrl(userId),
    };
    cache.set(userId, fallback);
    return fallback;
  }

  const data = (await response.json()) as CachedDiscordUser;
  cache.set(userId, data);
  return data;
}
```

- [ ] **Step 2: TypeScript エラーがないことを確認**

```bash
cd apps/dashboard && pnpm exec tsc -p tsconfig.json --noEmit
```

Expected: No errors.

- [ ] **Step 3: コミット**

```bash
git add apps/dashboard/src/components/user-cache.ts
git commit -m "feat(dashboard): add user info in-memory cache"
```

---

## Task 5: UserMention コンポーネント

**Files:**
- Create: `apps/dashboard/src/components/user-mention.tsx`

- [ ] **Step 1: コンポーネントを作成**

`apps/dashboard/src/components/user-mention.tsx` を作成:

```tsx
"use client";

import * as Popover from "@radix-ui/react-popover";
import { Copy } from "lucide-react";
import { useState } from "react";
import { fetchCachedDiscordUser, type CachedDiscordUser } from "./user-cache";

interface UserMentionProps {
  userId: string;
  actorName: string | null;
}

export function UserMention({ userId, actorName }: UserMentionProps) {
  const [user, setUser] = useState<CachedDiscordUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleOpenChange(open: boolean) {
    if (!open || user) return;
    setLoading(true);
    setError(false);
    try {
      const data = await fetchCachedDiscordUser(userId);
      setUser(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    void navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const displayName = actorName ?? userId;

  return (
    <Popover.Root onOpenChange={(open) => void handleOpenChange(open)}>
      <Popover.Trigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex cursor-pointer items-center rounded bg-indigo-500/20 px-1 text-indigo-300 hover:bg-indigo-500/30"
        >
          @{displayName}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-64 rounded-lg border border-zinc-700 bg-zinc-800 p-3 shadow-xl"
          sideOffset={6}
          onClick={(e) => e.stopPropagation()}
        >
          {loading && (
            <p className="text-xs text-zinc-500">読み込み中...</p>
          )}
          {error && !loading && (
            <p className="text-xs text-zinc-500">情報を取得できませんでした</p>
          )}
          {user && !loading && (
            <div className="flex gap-3">
              <img
                src={user.avatarUrl}
                alt={user.globalName ?? user.username}
                className="h-10 w-10 shrink-0 rounded-full"
                width={40}
                height={40}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-100">
                  {user.globalName ?? user.username}
                </p>
                <p className="text-xs text-zinc-400">@{user.username}</p>
                <div className="mt-1 flex items-center gap-1">
                  <p className="truncate font-mono text-xs text-zinc-500">
                    {user.id}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="shrink-0 text-zinc-500 hover:text-zinc-300"
                    aria-label="IDをコピー"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                {copied && (
                  <p className="mt-0.5 text-xs text-green-400">コピーしました</p>
                )}
              </div>
            </div>
          )}
          <Popover.Arrow className="fill-zinc-700" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

- [ ] **Step 2: TypeScript エラーがないことを確認**

```bash
cd apps/dashboard && pnpm exec tsc -p tsconfig.json --noEmit
```

Expected: No errors.

- [ ] **Step 3: コミット**

```bash
git add apps/dashboard/src/components/user-mention.tsx
git commit -m "feat(dashboard): add UserMention component with Radix UI popover"
```

---

## Task 6: format-event-jsx.tsx ヘルパー

**Files:**
- Create: `apps/dashboard/src/lib/format-event-jsx.tsx`

- [ ] **Step 1: ファイルを作成**

`apps/dashboard/src/lib/format-event-jsx.tsx` を作成:

```tsx
import type { ReactNode } from "react";
import {
  formatEventDescription,
  getActorText,
  splitDescriptionOnActor,
  type EventVars,
} from "./event-display";
import { UserMention } from "../components/user-mention";

export function formatEventDescriptionJSX(
  eventName: string,
  vars: EventVars
): ReactNode {
  const description = formatEventDescription(eventName, vars);
  const mentionText = getActorText(vars);
  if (!mentionText || !vars.actorId) return description;

  const parts = splitDescriptionOnActor(description, mentionText);
  if (!parts) return description;

  return (
    <>
      {parts.before}
      <UserMention
        userId={vars.actorId}
        actorName={vars.actorName ?? vars.actorId}
      />
      {parts.after}
    </>
  );
}
```

- [ ] **Step 2: TypeScript エラーがないことを確認**

```bash
cd apps/dashboard && pnpm exec tsc -p tsconfig.json --noEmit
```

Expected: No errors.

- [ ] **Step 3: コミット**

```bash
git add apps/dashboard/src/lib/format-event-jsx.tsx
git commit -m "feat(dashboard): add formatEventDescriptionJSX helper"
```

---

## Task 7: APIルートハンドラ

**Files:**
- Create: `apps/dashboard/src/app/api/discord/users/[userId]/route.ts`

- [ ] **Step 1: ファイルを作成**

`apps/dashboard/src/app/api/discord/users/[userId]/route.ts` を作成:

```typescript
import { parseDashboardAuthEnv } from "@discord-bot/config";
import { NextResponse } from "next/server";
import { getDashboardSession } from "../../../../auth";
import { buildAvatarUrl, fetchDiscordApiUser } from "../../../../lib/discord-user";

const env = parseDashboardAuthEnv();

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getDashboardSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  if (!env.DISCORD_BOT_TOKEN) {
    return NextResponse.json(
      { error: "Bot token not configured" },
      { status: 503 }
    );
  }

  try {
    const user = await fetchDiscordApiUser(userId, env.DISCORD_BOT_TOKEN);
    if (!user) {
      return NextResponse.json({
        id: userId,
        username: "Unknown User",
        globalName: null,
        avatarUrl: buildAvatarUrl(userId, null),
      });
    }
    return NextResponse.json(user);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: TypeScript エラーがないことを確認**

```bash
cd apps/dashboard && pnpm exec tsc -p tsconfig.json --noEmit
```

Expected: No errors.

- [ ] **Step 3: コミット**

```bash
git add "apps/dashboard/src/app/api/discord/users/[userId]/route.ts"
git commit -m "feat(dashboard): add GET /api/discord/users/[userId] endpoint"
```

---

## Task 8: logs-explorer.tsx に接続

**Files:**
- Modify: `apps/dashboard/src/app/logs/logs-explorer.tsx`

- [ ] **Step 1: import を変更**

`logs-explorer.tsx` の既存 import を変更。

変更前:
```typescript
import {
  eventColorClasses,
  formatEventDescription,
  formatRelativeTime,
  getEventColor,
} from "../../lib/event-display";
```

変更後:
```typescript
import {
  eventColorClasses,
  formatRelativeTime,
  getEventColor,
} from "../../lib/event-display";
import { formatEventDescriptionJSX } from "../../lib/format-event-jsx";
```

- [ ] **Step 2: description の生成を変更**

`filtered.map` ブロック内の変更前:
```typescript
const description = formatEventDescription(log.eventName, {
  actorId: log.actorId,
  actorName: extractActorName(log.payload),
  channelId: log.channelId,
  channelName: extractChannelName(log.payload),
});
```

変更後:
```typescript
const description = formatEventDescriptionJSX(log.eventName, {
  actorId: log.actorId,
  actorName: extractActorName(log.payload),
  channelId: log.channelId,
  channelName: extractChannelName(log.payload),
});
```

- [ ] **Step 3: TypeScript エラーがないことを確認**

```bash
cd apps/dashboard && pnpm exec tsc -p tsconfig.json --noEmit
```

Expected: No errors.

- [ ] **Step 4: コミット**

```bash
git add apps/dashboard/src/app/logs/logs-explorer.tsx
git commit -m "feat(dashboard): use UserMention in logs feed"
```

---

## Task 9: overview-client.tsx に接続

**Files:**
- Modify: `apps/dashboard/src/app/overview-client.tsx`

- [ ] **Step 1: import を変更**

`overview-client.tsx` の既存 import を変更。

変更前:
```typescript
import {
  eventColorClasses,
  formatEventDescription,
  formatRelativeTime,
  getEventColor,
} from "../lib/event-display";
```

変更後:
```typescript
import {
  eventColorClasses,
  formatRelativeTime,
  getEventColor,
} from "../lib/event-display";
import { formatEventDescriptionJSX } from "../lib/format-event-jsx";
```

- [ ] **Step 2: description の生成を変更**

`recentLogs.slice(0, 10).map` ブロック内の変更前:
```typescript
{formatEventDescription(log.eventName, {
  actorId: log.actorId,
  actorName: extractActorName(log.payload),
  channelId: log.channelId,
  channelName: extractChannelName(log.payload),
})}
```

変更後:
```typescript
{formatEventDescriptionJSX(log.eventName, {
  actorId: log.actorId,
  actorName: extractActorName(log.payload),
  channelId: log.channelId,
  channelName: extractChannelName(log.payload),
})}
```

- [ ] **Step 3: TypeScript エラーがないことを確認**

```bash
cd apps/dashboard && pnpm exec tsc -p tsconfig.json --noEmit
```

Expected: No errors.

- [ ] **Step 4: 全テストを実行**

```bash
cd apps/dashboard && pnpm test
```

Expected: All tests pass.

- [ ] **Step 5: コミット**

```bash
git add apps/dashboard/src/app/overview-client.tsx
git commit -m "feat(dashboard): use UserMention in overview feed"
```

---

## Task 10: 動作確認

- [ ] **Step 1: ダッシュボードをリビルド・起動**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build dashboard
```

- [ ] **Step 2: ブラウザで確認**

`http://localhost` を開き、以下を確認:

1. ログページのイベント説明でアクター名が `@Yuzuki` のようなインジゴ色バッジで表示される
2. バッジをクリックするとポップオーバーが開く（行の展開は発生しない）
3. アバター・表示名・ユーザー名・IDがポップオーバー内に表示される
4. IDのコピーボタンでクリップボードに入り「コピーしました」が表示される
5. 同じユーザーを2回クリックしてもNetworkタブでfetchが1回だけ
6. 画面端近くのメンションでもポップオーバーが画面外にはみ出さない（Radix UI自動対応）
7. 概要ページのフィードでも同様に機能する
