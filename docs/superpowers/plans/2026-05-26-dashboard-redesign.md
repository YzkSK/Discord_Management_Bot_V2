# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the dashboard UI with a dark Operations Console aesthetic, add a Guild selection flow (guild context persisted via cookie/localStorage), and add owner-configurable management roles for dashboard access control.

**Architecture:** DB migration first (new `dashboard_management_role_ids` column) → Discord API utilities → new/updated API routes → CSS + UI components dark theme → layout shell → pages. Guild context flows via browser cookie (`dashboard-guild-id`) set at `/guild` selection page and read server-side in each protected page.

**Tech Stack:** Next.js App Router (server + client components), Tailwind CSS v4, shadcn/cva, socket.io-client, Drizzle ORM (PostgreSQL), NextAuth v4, Node.js test runner (`node:test`).

---

## Style policy constraints (enforced by `dashboard-style-policy.test.ts`)

- **No** `bg-gradient`, `from-`, `via-`, `to-` classes in monitored source files
- **No** `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full` in monitored source files
- Max border-radius: `rounded-lg`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `packages/db/src/schema/core.ts` | Modify | Add `dashboardManagementRoleIds` to `guildConfigs` |
| `packages/db/src/repositories/guilds.ts` | Modify | 4 new query helpers |
| `apps/dashboard/src/discord-api.ts` | Modify | Rename + add `fetchCurrentUserGuilds`, `fetchGuildRoles` |
| `apps/dashboard/src/dashboard-auth.ts` | Modify | Update renamed import |
| `apps/dashboard/src/app/api/guilds/guild-filter.ts` | Create | Testable permission filter pure function |
| `apps/dashboard/src/app/api/guilds/guild-filter.test.ts` | Create | Unit tests for filter |
| `apps/dashboard/src/app/api/guilds/route.ts` | Create | `GET /api/guilds` |
| `apps/dashboard/src/app/api/settings/route.ts` | Modify | Add management roles to GET + PATCH |
| `apps/dashboard/src/app/globals.css` | Modify | Dark body + font |
| `apps/dashboard/src/components/ui/button.tsx` | Modify | Dark variants |
| `apps/dashboard/src/components/ui/card.tsx` | Modify | Dark surface |
| `apps/dashboard/src/components/ui/badge.tsx` | Modify | Dark variants |
| `apps/dashboard/src/components/ui/table.tsx` | Modify | Dark table |
| `apps/dashboard/src/components/ui/input.tsx` | Modify | Dark input |
| `apps/dashboard/src/components/ui/select.tsx` | Modify | Dark select |
| `apps/dashboard/src/app/dashboard-shell.tsx` | Modify | Sidebar + topbar + guild display |
| `apps/dashboard/src/app/auth-status.tsx` | Modify | Dark user pill |
| `apps/dashboard/src/app/login/page.tsx` | Modify | Dark centered login |
| `apps/dashboard/src/app/login/login-actions.tsx` | Modify | Discord-branded button, redirect to `/guild` |
| `apps/dashboard/src/app/guild/page.tsx` | Create | Guild selection page (server) |
| `apps/dashboard/src/app/guild/guild-selector.tsx` | Create | Guild selection list (client) |
| `apps/dashboard/src/app/page.tsx` | Modify | Dark overview |
| `apps/dashboard/src/app/logs/logs-explorer.tsx` | Modify | Dark logs, guild from localStorage, badge colours |
| `apps/dashboard/src/app/settings/settings-panel.tsx` | Modify | Dark settings + Dashboard Access section |
| `apps/dashboard/src/app/dashboard-style-policy.test.ts` | Modify | Add guild-selector to monitored files |
| `apps/dashboard/tsconfig.test.json` | Modify | Add guild-filter test to include list |

---

## Task 1: DB — add `dashboard_management_role_ids`

**Files:**
- Modify: `packages/db/src/schema/core.ts`
- Modify: `packages/db/src/repositories/guilds.ts`

- [ ] **Step 1: Add column to schema**

In `packages/db/src/schema/core.ts`, add one field to `guildConfigs`:

```typescript
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

// inside guildConfigs table definition, after tempVoiceCategoryId:
dashboardManagementRoleIds: text("dashboard_management_role_ids")
  .array()
  .notNull()
  .default(sql`'{}'`),
```

- [ ] **Step 2: Generate and apply the migration**

```bash
pnpm --filter @discord-bot/db run db:generate
pnpm --filter @discord-bot/db run db:migrate
```

Expected: a new migration file in `packages/db/drizzle/` and no errors on migrate.

- [ ] **Step 3: Add repository helpers to `packages/db/src/repositories/guilds.ts`**

Add the four functions below at the end of the file (after `isGuildLogMode`):

```typescript
export async function getKnownGuildIds(
  db: DbClient,
  guildIds: string[]
): Promise<Set<string>> {
  if (guildIds.length === 0) return new Set();
  const rows = await db
    .select({ guildId: guilds.guildId })
    .from(guilds)
    .where(inArray(guilds.guildId, guildIds));
  return new Set(rows.map((r) => r.guildId));
}

export async function getGuildsWithManagementRoles(
  db: DbClient,
  guildIds: string[]
): Promise<string[]> {
  if (guildIds.length === 0) return [];
  const rows = await db
    .select({ guildId: guilds.guildId })
    .from(guilds)
    .innerJoin(guildConfigs, eq(guildConfigs.guildRefId, guilds.id))
    .where(
      and(
        inArray(guilds.guildId, guildIds),
        sql`array_length(${guildConfigs.dashboardManagementRoleIds}, 1) > 0`
      )
    );
  return rows.map((r) => r.guildId);
}

export async function getGuildManagementRoleIds(
  db: DbClient,
  guildId: string
): Promise<string[]> {
  const [row] = await db
    .select({ roleIds: guildConfigs.dashboardManagementRoleIds })
    .from(guilds)
    .innerJoin(guildConfigs, eq(guildConfigs.guildRefId, guilds.id))
    .where(eq(guilds.guildId, guildId))
    .limit(1);
  return row?.roleIds ?? [];
}

export async function updateGuildManagementRoleIds(
  db: DbClient,
  guildId: string,
  roleIds: string[]
): Promise<void> {
  const [guild] = await db
    .select({ id: guilds.id })
    .from(guilds)
    .where(eq(guilds.guildId, guildId))
    .limit(1);
  if (!guild) return;
  await db
    .update(guildConfigs)
    .set({ dashboardManagementRoleIds: roleIds, updatedAt: sql`now()` })
    .where(eq(guildConfigs.guildRefId, guild.id));
}
```

Add `inArray` and `and` to the existing `drizzle-orm` import at the top of the file (they may already be there — check first).

- [ ] **Step 4: Build the DB package**

```bash
pnpm --filter @discord-bot/db run build
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/core.ts packages/db/src/repositories/guilds.ts packages/db/drizzle
git commit -m "feat(db): add dashboard_management_role_ids to guild_configs"
```

---

## Task 2: Discord API utilities

**Files:**
- Modify: `apps/dashboard/src/discord-api.ts`
- Modify: `apps/dashboard/src/dashboard-auth.ts`

- [ ] **Step 1: Rename `fetchCurrentUserGuild` → `fetchCurrentUserGuildById` and add two new functions**

Replace the entire content of `apps/dashboard/src/discord-api.ts`:

```typescript
export interface DiscordOAuthGuild {
  id: string;
  name: string;
  owner: boolean;
  permissions: string;
}

export interface DiscordGuildMember {
  roles: string[];
}

export interface DiscordRole {
  id: string;
  name: string;
}

const discordApiBaseUrl = "https://discord.com/api/v10";

export async function fetchCurrentUserGuilds(
  accessToken: string
): Promise<DiscordOAuthGuild[]> {
  const response = await fetch(`${discordApiBaseUrl}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Failed to load Discord guilds (${response.status}).`);
  }
  return (await response.json()) as DiscordOAuthGuild[];
}

export async function fetchCurrentUserGuildById(
  accessToken: string,
  guildId: string
): Promise<DiscordOAuthGuild | null> {
  const guilds = await fetchCurrentUserGuilds(accessToken);
  return guilds.find((g) => g.id === guildId) ?? null;
}

export async function fetchGuildMemberRoleIds(
  botToken: string,
  guildId: string,
  userId: string
): Promise<string[]> {
  const response = await fetch(
    `${discordApiBaseUrl}/guilds/${guildId}/members/${userId}`,
    {
      headers: { Authorization: `Bot ${botToken}` },
      cache: "no-store"
    }
  );
  if (response.status === 404 || response.status === 403) return [];
  if (!response.ok) {
    throw new Error(
      `Failed to load Discord guild member (${response.status}).`
    );
  }
  const member = (await response.json()) as DiscordGuildMember;
  return member.roles;
}

export async function fetchGuildRoles(
  botToken: string,
  guildId: string
): Promise<DiscordRole[]> {
  const response = await fetch(
    `${discordApiBaseUrl}/guilds/${guildId}/roles`,
    {
      headers: { Authorization: `Bot ${botToken}` },
      cache: "no-store"
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to load guild roles (${response.status}).`);
  }
  const roles = (await response.json()) as DiscordRole[];
  return roles.filter((r) => r.name !== "@everyone");
}
```

- [ ] **Step 2: Update `dashboard-auth.ts` to use renamed function**

In `apps/dashboard/src/dashboard-auth.ts`, change the import and the call site:

```typescript
// Change import:
import {
  fetchCurrentUserGuildById,   // was fetchCurrentUserGuild
  fetchGuildMemberRoleIds
} from "./discord-api";

// Change call (line ~56):
const discordGuild = await fetchCurrentUserGuildById(
  token.discordAccessToken,
  input.guildId
);
```

- [ ] **Step 3: Verify types compile**

```bash
pnpm --filter @discord-bot/dashboard run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/src/discord-api.ts apps/dashboard/src/dashboard-auth.ts
git commit -m "feat(dashboard): add fetchCurrentUserGuilds and fetchGuildRoles, rename fetchCurrentUserGuildById"
```

---

## Task 3: Guild permission filter + `GET /api/guilds`

**Files:**
- Create: `apps/dashboard/src/app/api/guilds/guild-filter.ts`
- Create: `apps/dashboard/src/app/api/guilds/guild-filter.test.ts`
- Create: `apps/dashboard/src/app/api/guilds/route.ts`
- Modify: `apps/dashboard/tsconfig.test.json`

- [ ] **Step 1: Write the failing unit test**

Create `apps/dashboard/src/app/api/guilds/guild-filter.test.ts`:

```typescript
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasDirectManagementPermission } from "./guild-filter.js";
import type { DiscordOAuthGuild } from "../../../discord-api.js";

function guild(override: Partial<DiscordOAuthGuild>): DiscordOAuthGuild {
  return { id: "1", name: "Test", owner: false, permissions: "0", ...override };
}

describe("hasDirectManagementPermission", () => {
  it("returns true when owner", () => {
    assert.equal(hasDirectManagementPermission(guild({ owner: true })), true);
  });

  it("returns true when ADMINISTRATOR bit (0x8) is set", () => {
    assert.equal(
      hasDirectManagementPermission(guild({ permissions: "8" })),
      true
    );
  });

  it("returns true when permissions include ADMINISTRATOR among others", () => {
    assert.equal(
      hasDirectManagementPermission(guild({ permissions: String(0x8 | 0x20) })),
      true
    );
  });

  it("returns false when only MANAGE_GUILD (0x20) without ADMINISTRATOR", () => {
    assert.equal(
      hasDirectManagementPermission(guild({ permissions: "32" })),
      false
    );
  });

  it("returns false when permissions is 0", () => {
    assert.equal(
      hasDirectManagementPermission(guild({ permissions: "0" })),
      false
    );
  });
});
```

- [ ] **Step 2: Add the test to `tsconfig.test.json`**

In `apps/dashboard/tsconfig.test.json`, add to `include`:

```json
"src/app/api/guilds/guild-filter.ts",
"src/app/api/guilds/guild-filter.test.ts"
```

- [ ] **Step 3: Run the test to confirm it fails**

```bash
cd apps/dashboard
pnpm run test
```

Expected: compile error — `guild-filter.ts` does not exist yet.

- [ ] **Step 4: Implement the filter function**

Create `apps/dashboard/src/app/api/guilds/guild-filter.ts`:

```typescript
import type { DiscordOAuthGuild } from "../../../discord-api.js";

const ADMINISTRATOR_BIT = BigInt(0x8);

export function hasDirectManagementPermission(
  guild: DiscordOAuthGuild
): boolean {
  if (guild.owner) return true;
  return (BigInt(guild.permissions) & ADMINISTRATOR_BIT) !== BigInt(0);
}
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
pnpm run test
```

Expected: all 5 assertions pass.

- [ ] **Step 6: Create `GET /api/guilds` route**

Create `apps/dashboard/src/app/api/guilds/route.ts`:

```typescript
import { createDbConnection, getKnownGuildIds, getGuildsWithManagementRoles, getGuildManagementRoleIds } from "@discord-bot/db";
import { parseDashboardAuthEnv } from "@discord-bot/config";
import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

import { authOptions } from "../../../auth";
import { fetchCurrentUserGuilds, fetchGuildMemberRoleIds } from "../../../discord-api";
import { hasDirectManagementPermission } from "./guild-filter";

export const dynamic = "force-dynamic";

const env = parseDashboardAuthEnv();

export async function GET(request: NextRequest) {
  const token = await getToken({
    req: request,
    ...(authOptions.secret ? { secret: authOptions.secret } : {})
  });

  if (!token?.sub || !token.discordAccessToken) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let userGuilds;
  try {
    userGuilds = await fetchCurrentUserGuilds(token.discordAccessToken);
  } catch {
    return NextResponse.json({ error: "Failed to fetch Discord guilds." }, { status: 502 });
  }

  const directPass = userGuilds.filter(hasDirectManagementPermission);
  const directPassIds = new Set(directPass.map((g) => g.id));
  const remaining = userGuilds.filter((g) => !directPassIds.has(g.id));

  const passed = [...directPass];

  const db = createDbConnection();
  try {
    if (remaining.length > 0) {
      const withRoles = await getGuildsWithManagementRoles(
        db.db,
        remaining.map((g) => g.id)
      );

      for (const guildId of withRoles) {
        const guild = remaining.find((g) => g.id === guildId)!;
        const managementRoleIds = await getGuildManagementRoleIds(db.db, guildId);
        if (managementRoleIds.length === 0) continue;

        const userId = token.sub;
        const botToken = env.DISCORD_BOT_TOKEN;
        if (!userId || !botToken) continue;

        const userRoleIds = await fetchGuildMemberRoleIds(botToken, guildId, userId);
        if (userRoleIds.some((r) => managementRoleIds.includes(r))) {
          passed.push(guild);
        }
      }
    }

    const allPassedIds = passed.map((g) => g.id);
    const knownIds = await getKnownGuildIds(db.db, allPassedIds);

    const result = passed
      .filter((g) => knownIds.has(g.id))
      .map((g) => ({ id: g.id, name: g.name }));

    return NextResponse.json({ guilds: result });
  } finally {
    await db.close();
  }
}
```

- [ ] **Step 7: Typecheck**

```bash
pnpm --filter @discord-bot/dashboard run typecheck
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add apps/dashboard/src/app/api/guilds/ apps/dashboard/tsconfig.test.json
git commit -m "feat(dashboard): add GET /api/guilds with 3-condition permission filter"
```

---

## Task 4: Settings API — management roles

**Files:**
- Modify: `apps/dashboard/src/app/api/settings/route.ts`

- [ ] **Step 1: Update `GET /api/settings` to include management role data**

In `apps/dashboard/src/app/api/settings/route.ts`, update the GET handler. Add these imports at the top:

```typescript
import {
  createDbConnection,
  getGuildConfigByGuildId,
  isGuildLogMode,
  updateGuildConfigByGuildId,
  getGuildManagementRoleIds,
  updateGuildManagementRoleIds
} from "@discord-bot/db";
import { parseDashboardAuthEnv } from "@discord-bot/config";
import { fetchGuildRoles } from "../../../discord-api";
```

Add `const env = parseDashboardAuthEnv();` at module level (after existing imports).

Replace the `try` block in the GET handler with:

```typescript
try {
  const config = await getGuildConfigByGuildId(
    dbConnection.db,
    authorization.guild.id
  );

  if (!config) {
    return NextResponse.json(
      { error: "Guild config is not initialized." },
      { status: 404 }
    );
  }

  const managementRoleIds = await getGuildManagementRoleIds(
    dbConnection.db,
    authorization.guild.id
  );

  const availableRoles =
    authorization.guild.owner && env.DISCORD_BOT_TOKEN
      ? await fetchGuildRoles(env.DISCORD_BOT_TOKEN, authorization.guild.id).catch(() => [])
      : undefined;

  return NextResponse.json({
    guildId: config.guildId,
    guildName: config.guildName,
    isActive: config.isActive,
    logMode: config.logMode,
    updatedAt: config.updatedAt.toISOString(),
    accessRole: authorization.role,
    dashboardManagementRoleIds: managementRoleIds,
    ...(availableRoles !== undefined ? { availableRoles } : {})
  });
} finally {
  await dbConnection.close();
}
```

- [ ] **Step 2: Update `PATCH /api/settings` to handle management roles**

In the PATCH handler, add after the existing `logMode` extraction and before `authorizeDashboardApi`:

```typescript
const rawRoleIds =
  typeof body === "object" && body && "dashboardManagementRoleIds" in body
    ? body.dashboardManagementRoleIds
    : undefined;
const dashboardManagementRoleIds: string[] | undefined =
  Array.isArray(rawRoleIds) && rawRoleIds.every((v) => typeof v === "string")
    ? rawRoleIds
    : undefined;
```

After the auth check (`if (!authorization.allowed) ...`), replace the try block:

```typescript
try {
  if (dashboardManagementRoleIds !== undefined) {
    if (!authorization.guild.owner) {
      return NextResponse.json(
        { error: "Only the guild owner can update management roles." },
        { status: 403 }
      );
    }
    await updateGuildManagementRoleIds(
      dbConnection.db,
      authorization.guild.id,
      dashboardManagementRoleIds
    );
    return NextResponse.json({ dashboardManagementRoleIds });
  }

  if (!isGuildLogMode(logMode)) {
    return NextResponse.json({ error: "Invalid logMode." }, { status: 400 });
  }

  const config = await updateGuildConfigByGuildId(dbConnection.db, {
    guildId: authorization.guild.id,
    logMode
  });

  if (!config) {
    return NextResponse.json(
      { error: "Guild config is not initialized." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    guildId: authorization.guild.id,
    logMode: config.logMode,
    updatedAt: config.updatedAt.toISOString(),
    accessRole: authorization.role
  });
} finally {
  await dbConnection.close();
}
```

Note: the `dbConnection` variable in PATCH is currently declared after the auth call — move it before the try block so the finally can close it in both paths.

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @discord-bot/dashboard run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/src/app/api/settings/route.ts
git commit -m "feat(dashboard): add management roles to settings API"
```

---

## Task 5: Global CSS + UI components dark theme

**Files:**
- Modify: `apps/dashboard/src/app/globals.css`
- Modify: `apps/dashboard/src/components/ui/button.tsx`
- Modify: `apps/dashboard/src/components/ui/card.tsx`
- Modify: `apps/dashboard/src/components/ui/badge.tsx`
- Modify: `apps/dashboard/src/components/ui/table.tsx`
- Modify: `apps/dashboard/src/components/ui/input.tsx`
- Modify: `apps/dashboard/src/components/ui/select.tsx`
- Modify: `apps/dashboard/src/app/dashboard-style-policy.test.ts`

- [ ] **Step 1: Update `globals.css`**

Replace the entire file:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}

body {
  margin: 0;
  background: #09090b;
  color: #f4f4f5;
  font-family:
    Inter,
    system-ui,
    sans-serif;
}
```

- [ ] **Step 2: Update `button.tsx`**

```typescript
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50 disabled:pointer-events-none disabled:opacity-40",
  {
    defaultVariants: { size: "default", variant: "default" },
    variants: {
      size: {
        default: "h-9 px-4 py-2",
        icon: "h-9 w-9",
        sm: "h-7 px-3 text-xs"
      },
      variant: {
        default: "bg-green-500 text-black hover:bg-green-400",
        destructive: "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30",
        ghost: "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
        outline: "border border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100",
        secondary: "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
      }
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, size, variant, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ className, size, variant }))}
      {...props}
    />
  );
}

export { buttonVariants };
```

- [ ] **Step 3: Update `card.tsx`**

```typescript
import * as React from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-zinc-800 bg-zinc-900", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-base font-semibold text-zinc-100", className)} {...props} />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm text-zinc-500", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-2", className)} {...props} />;
}
```

- [ ] **Step 4: Update `badge.tsx`**

```typescript
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
  {
    defaultVariants: { variant: "default" },
    variants: {
      variant: {
        default: "bg-zinc-700 text-zinc-200",
        outline: "border border-zinc-700 text-zinc-400",
        success: "border border-green-500/30 bg-green-500/10 text-green-400"
      }
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ className, variant }))} {...props} />;
}
```

- [ ] **Step 5: Update `table.tsx`**

```typescript
import * as React from "react";
import { cn } from "../../lib/utils";

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full caption-bottom text-sm", className)} {...props} />;
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("border-b border-zinc-800", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("border-b border-zinc-800 hover:bg-zinc-800/50", className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-10 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wider text-zinc-500",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-middle text-zinc-300", className)} {...props} />;
}
```

- [ ] **Step 6: Update `input.tsx`**

```typescript
import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      className={cn(
        "flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      type={type}
      {...props}
    />
  )
);
Input.displayName = "Input";
```

- [ ] **Step 7: Update `select.tsx`**

```typescript
import * as React from "react";
import { cn } from "../../lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => (
    <select
      className={cn(
        "flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Select.displayName = "Select";
```

- [ ] **Step 8: Update style policy test to add guild-selector to monitored files**

In `apps/dashboard/src/app/dashboard-style-policy.test.ts`, add to the `sourceFiles` array:

```typescript
"src/app/guild/guild-selector.tsx"
```

- [ ] **Step 9: Run style policy test**

```bash
pnpm --filter @discord-bot/dashboard run test
```

Expected: all tests pass (no gradients, no oversized rounded classes in the monitored files).

- [ ] **Step 10: Commit**

```bash
git add apps/dashboard/src/app/globals.css apps/dashboard/src/components/ui/ apps/dashboard/src/app/dashboard-style-policy.test.ts
git commit -m "feat(dashboard): dark theme for globals and UI components"
```

---

## Task 6: DashboardShell + AuthStatus

**Files:**
- Modify: `apps/dashboard/src/app/dashboard-shell.tsx`
- Modify: `apps/dashboard/src/app/auth-status.tsx`

- [ ] **Step 1: Rewrite `dashboard-shell.tsx`**

```typescript
import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { LayoutDashboard, ScrollText, Settings } from "lucide-react";

import { AuthStatus } from "./auth-status";
import { getDashboardNavItems } from "./dashboard-ui";

interface DashboardShellProps {
  actions?: ReactNode;
  children: ReactNode;
  currentPath: string;
  description?: string;
  guildId: string;
  guildName: string | null;
  session: Session | null;
  title: string;
}

export function DashboardShell({
  actions,
  children,
  currentPath,
  description,
  guildId,
  guildName,
  session,
  title
}: DashboardShellProps) {
  const navItems = getDashboardNavItems();
  const icons: Record<string, ReactNode> = {
    "/": <LayoutDashboard className="h-4 w-4" />,
    "/logs": <ScrollText className="h-4 w-4" />,
    "/settings": <Settings className="h-4 w-4" />
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[240px_1fr]">
        <aside className="flex flex-col border-b border-zinc-800 bg-zinc-900 px-4 py-5 lg:border-b-0 lg:border-r">
          <a className="flex items-center gap-2" href="/">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-500/10">
              <LayoutDashboard className="h-4 w-4 text-green-400" />
            </div>
            <span className="text-sm font-semibold text-zinc-100">Discord Bot</span>
          </a>

          <div className="mt-4 rounded-md border border-zinc-700 bg-zinc-800/40 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Guild
            </p>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-zinc-200">
                {guildName ?? guildId}
              </p>
              <a
                className="shrink-0 text-xs text-zinc-500 hover:text-green-400"
                href="/guild"
              >
                change
              </a>
            </div>
          </div>

          <nav className="mt-4 flex flex-col gap-0.5">
            {navItems.map((item) => {
              const active = item.href === currentPath;
              return (
                <a
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "flex items-center gap-2.5 rounded-md border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm font-medium text-green-400"
                      : "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  }
                  href={item.href}
                  key={item.href}
                >
                  {icons[item.href]}
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="mt-auto pt-6">
            <AuthStatus session={session} />
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-6 py-4 backdrop-blur-sm">
            <div>
              <h1 className="text-base font-semibold text-zinc-100">{title}</h1>
              {description && (
                <p className="text-xs text-zinc-500">{description}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </header>
          <div className="flex-1 px-6 py-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Rewrite `auth-status.tsx`**

```typescript
"use client";

import type { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

import { Button, buttonVariants } from "../components/ui/button";
import { cn } from "../lib/utils";

export function AuthStatus({ session }: { session: Session | null }) {
  if (!session?.user) {
    return (
      <a className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href="/login">
        Sign in
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-zinc-300">
          {session.user.name ?? "Signed in"}
        </p>
        <p className="truncate text-[10px] text-zinc-600">
          {session.user.id}
        </p>
      </div>
      <Button
        onClick={() => void signOut({ callbackUrl: "/login" })}
        size="sm"
        type="button"
        variant="ghost"
      >
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @discord-bot/dashboard run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/src/app/dashboard-shell.tsx apps/dashboard/src/app/auth-status.tsx
git commit -m "feat(dashboard): redesign DashboardShell with dark sidebar and topbar"
```

---

## Task 7: Login page

**Files:**
- Modify: `apps/dashboard/src/app/login/page.tsx`
- Modify: `apps/dashboard/src/app/login/login-actions.tsx`

- [ ] **Step 1: Rewrite `login/page.tsx`**

```typescript
import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";

import { getDashboardSession } from "../../auth";
import { Card, CardContent } from "../../components/ui/card";
import { LoginActions } from "./login-actions";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getDashboardSession();
  if (session?.user) redirect("/guild");

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-500/10">
            <LayoutDashboard className="h-5 w-5 text-green-400" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-zinc-100">Discord Bot Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-500">Sign in with your Discord account to continue</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-5">
            <LoginActions />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Update `login-actions.tsx` (redirect to `/guild` after sign-in)**

```typescript
"use client";

import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";

import { Button } from "../../components/ui/button";

export function LoginActions() {
  return (
    <Button
      className="w-full bg-[#5865f2] text-white hover:bg-[#4752c4]"
      onClick={() => void signIn("discord", { callbackUrl: "/guild" })}
      type="button"
      variant="default"
    >
      <LogIn className="h-4 w-4" />
      Sign in with Discord
    </Button>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/src/app/login/
git commit -m "feat(dashboard): redesign login page with dark theme"
```

---

## Task 8: Guild selection page

**Files:**
- Create: `apps/dashboard/src/app/guild/page.tsx`
- Create: `apps/dashboard/src/app/guild/guild-selector.tsx`

- [ ] **Step 1: Create `guild/page.tsx`**

```typescript
import { redirect } from "next/navigation";
import { Server } from "lucide-react";

import { getDashboardSession } from "../../auth";
import { GuildSelector } from "./guild-selector";

export const dynamic = "force-dynamic";

export default async function GuildPage() {
  const session = await getDashboardSession();
  if (!session?.user) redirect("/login");

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-green-500/10">
            <Server className="h-4 w-4 text-green-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Select a Guild</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Only servers where you have management permissions and this bot is installed are shown.
            </p>
          </div>
        </div>
        <GuildSelector />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create `guild/guild-selector.tsx`**

```typescript
"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Search } from "lucide-react";

import { Input } from "../../components/ui/input";
import { dashboardGuildStorageKey } from "../dashboard-ui";

interface GuildItem {
  id: string;
  name: string;
}

export function GuildSelector() {
  const [guilds, setGuilds] = useState<GuildItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/guilds", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        const data = (await r.json()) as { guilds: GuildItem[] };
        setGuilds(data.guilds);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load guilds.");
      })
      .finally(() => setLoading(false));
  }, []);

  function selectGuild(guild: GuildItem) {
    const maxAge = 60 * 60 * 24 * 30; // 30 days
    document.cookie = `dashboard-guild-id=${guild.id}; path=/; max-age=${maxAge}`;
    document.cookie = `dashboard-guild-name=${encodeURIComponent(guild.name)}; path=/; max-age=${maxAge}`;
    localStorage.setItem(dashboardGuildStorageKey, guild.id);
    window.location.href = "/";
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading guilds...</p>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {error}
      </div>
    );
  }

  const filtered =
    search.trim() === ""
      ? guilds
      : guilds.filter(
          (g) =>
            g.name.toLowerCase().includes(search.toLowerCase()) ||
            g.id.includes(search)
        );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <Input
          className="pl-9"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or ID"
          value={search}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-500">No guilds found.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map((guild) => (
            <button
              className="flex items-center justify-between rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-left transition-colors hover:border-green-500/40 hover:bg-zinc-800"
              key={guild.id}
              onClick={() => selectGuild(guild)}
              type="button"
            >
              <div>
                <p className="text-sm font-medium text-zinc-100">{guild.name}</p>
                <p className="font-mono text-xs text-zinc-500">{guild.id}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @discord-bot/dashboard run typecheck
```

- [ ] **Step 4: Run style policy test**

```bash
pnpm --filter @discord-bot/dashboard run test
```

Expected: all pass (guild-selector.tsx is now monitored — verify it has no gradients or oversized rounded).

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/app/guild/
git commit -m "feat(dashboard): add guild selection page"
```

---

## Task 9: Overview page

**Files:**
- Modify: `apps/dashboard/src/app/page.tsx`

- [ ] **Step 1: Rewrite `page.tsx`**

```typescript
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CheckSquare, ChevronRight, ScrollText, Settings } from "lucide-react";
import type { ReactNode } from "react";

import { getDashboardSession } from "../auth";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { DashboardShell } from "./dashboard-shell";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getDashboardSession();
  if (!session?.user) redirect("/login");

  const cookieStore = await cookies();
  const guildId = cookieStore.get("dashboard-guild-id")?.value;
  const guildName = cookieStore.get("dashboard-guild-name")?.value
    ? decodeURIComponent(cookieStore.get("dashboard-guild-name")!.value)
    : null;

  if (!guildId) redirect("/guild");

  return (
    <DashboardShell
      currentPath="/"
      description="Verification workflow and quick navigation"
      guildId={guildId}
      guildName={guildName}
      session={session}
      title="Overview"
    >
      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-green-400" />
              Verification Flow
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <OverviewStep
              body="Run /setup logs, /setup temp-vc, and /setup recruitment from Discord when you need fresh test targets."
              index="1"
              title="Prepare Discord"
            />
            <OverviewStep
              body="Use Logs presets to inspect message, voice, audit, Temp VC, and recruitment events."
              index="2"
              title="Inspect Events"
            />
            <OverviewStep
              body="Open Settings with the same guild to confirm access and logging configuration."
              index="3"
              title="Confirm Settings"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-zinc-400" />
              Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <QuickAction
              body="Search events, switch presets, and inspect payload summaries."
              href="/logs"
              icon={<ScrollText className="h-4 w-4" />}
              title="Logs"
            />
            <QuickAction
              body="View and update access roles and log mode for the selected guild."
              href="/settings"
              icon={<Settings className="h-4 w-4" />}
              title="Settings"
            />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

function OverviewStep({ body, index, title }: { body: string; index: string; title: string }) {
  return (
    <div className="grid grid-cols-[28px_1fr] gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-500/10 text-xs font-bold text-green-400">
        {index}
      </div>
      <div>
        <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
        <p className="mt-0.5 text-xs leading-5 text-zinc-500">{body}</p>
      </div>
    </div>
  );
}

function QuickAction({
  body,
  href,
  icon,
  title
}: {
  body: string;
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <a
      className="flex items-start gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-3 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
      href={href}
    >
      <div className="mt-0.5 text-zinc-400">{icon}</div>
      <div>
        <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
        <p className="mt-0.5 text-xs leading-5 text-zinc-500">{body}</p>
      </div>
    </a>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/src/app/page.tsx
git commit -m "feat(dashboard): redesign overview page with dark theme and cookie guild context"
```

---

## Task 10: Logs Explorer

**Files:**
- Modify: `apps/dashboard/src/app/logs/logs-explorer.tsx`
- Modify: `apps/dashboard/src/app/logs/page.tsx`

- [ ] **Step 1: Update `logs/page.tsx` to add guild context and pass to shell**

Read the current `apps/dashboard/src/app/logs/page.tsx` first, then replace:

```typescript
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getDashboardSession } from "../../auth";
import { DashboardShell } from "../dashboard-shell";
import { LogsExplorer } from "./logs-explorer";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const session = await getDashboardSession();
  if (!session?.user) redirect("/login");

  const cookieStore = await cookies();
  const guildId = cookieStore.get("dashboard-guild-id")?.value;
  const guildName = cookieStore.get("dashboard-guild-name")?.value
    ? decodeURIComponent(cookieStore.get("dashboard-guild-name")!.value)
    : null;

  if (!guildId) redirect("/guild");

  return (
    <DashboardShell
      currentPath="/logs"
      description="Search and filter bot events in real time"
      guildId={guildId}
      guildName={guildName}
      session={session}
      title="Logs"
    >
      <LogsExplorer />
    </DashboardShell>
  );
}
```

- [ ] **Step 2: Rewrite `logs-explorer.tsx`**

This is the largest client component. Replace the full file:

```typescript
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { io } from "socket.io-client";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../../components/ui/table";
import {
  realtimeErrorEventName,
  realtimeLogsEventName,
  realtimeLogsSubscribeEventName
} from "../../realtime-events";
import {
  countActiveFilters,
  dashboardGuildStorageKey,
  getDashboardEventPresets,
  normalizeGuildId
} from "../dashboard-ui";

interface LogItem {
  id: string;
  eventName: string;
  guildId: string | null;
  actorId: string | null;
  channelId: string | null;
  messageId: string | null;
  eventTimestamp: string;
  receivedAt: string;
  realtimeEnabled: boolean;
  payload: unknown;
}

interface LogsResponse {
  items: LogItem[];
  nextCursor: string | null;
}

interface LogFilters {
  search: string;
  guildId: string;
  eventName: string;
  actorId: string;
}

const initialFilters: LogFilters = { actorId: "", eventName: "", guildId: "", search: "" };
const eventPresets = getDashboardEventPresets();

function eventBadgeClass(name: string) {
  if (name.startsWith("message")) return "border border-blue-500/20 bg-blue-500/10 text-blue-400";
  if (name.startsWith("voice")) return "border border-purple-500/20 bg-purple-500/10 text-purple-400";
  if (name.startsWith("temp_vc")) return "border border-teal-500/20 bg-teal-500/10 text-teal-400";
  if (name.startsWith("recruitment")) return "border border-green-500/20 bg-green-500/10 text-green-400";
  if (name.startsWith("audit")) return "border border-orange-500/20 bg-orange-500/10 text-orange-400";
  return "border border-zinc-700 bg-zinc-800 text-zinc-400";
}

export function LogsExplorer() {
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState("idle");

  useEffect(() => {
    const storedGuildId = window.localStorage.getItem(dashboardGuildStorageKey);
    if (storedGuildId) {
      const next = { ...initialFilters, guildId: storedGuildId };
      setFilters(next);
      setAppliedFilters(next);
    }
  }, []);

  useEffect(() => {
    if (normalizeGuildId(appliedFilters.guildId)) {
      void loadLogs(appliedFilters);
    }
  }, [appliedFilters]);

  useEffect(() => {
    const guildId = normalizeGuildId(appliedFilters.guildId);
    if (!guildId) { setRealtimeStatus("idle"); return; }

    const socket = io({ path: "/socket.io" });
    setRealtimeStatus("connecting");

    socket.on("connect", () => {
      setRealtimeStatus("live");
      socket.emit(realtimeLogsSubscribeEventName, { guildId });
    });
    socket.on(realtimeLogsEventName, (event: LogItem) => {
      setLogs((cur) => {
        if (cur.some((l) => l.id === event.id)) return cur;
        return [event, ...cur].slice(0, 100);
      });
    });
    socket.on(realtimeErrorEventName, (payload: { error?: string }) => {
      setRealtimeStatus("error");
      setError(payload.error ?? "Realtime logs failed.");
    });
    socket.on("disconnect", () => setRealtimeStatus("offline"));

    return () => { socket.disconnect(); };
  }, [appliedFilters.guildId]);

  const activeFilterCount = useMemo(() => countActiveFilters(appliedFilters), [appliedFilters]);

  async function loadLogs(next: LogFilters) {
    if (!normalizeGuildId(next.guildId)) {
      setLogs([]); setNextCursor(null); setError("No guild selected."); setLoading(false);
      return;
    }
    setLoading(true); setError(null); setExpandedId(null);
    window.localStorage.setItem(dashboardGuildStorageKey, normalizeGuildId(next.guildId));
    try {
      const data = await fetchLogs(next);
      setLogs(data.items); setNextCursor(data.nextCursor);
    } catch (e) { setError(toErrorMessage(e)); } finally { setLoading(false); }
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true); setError(null);
    try {
      const data = await fetchLogs(appliedFilters, nextCursor);
      setLogs((cur) => [...cur, ...data.items]); setNextCursor(data.nextCursor);
    } catch (e) { setError(toErrorMessage(e)); } finally { setLoadingMore(false); }
  }

  function submitFilters(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAppliedFilters({ ...filters, guildId: normalizeGuildId(filters.guildId) });
  }

  function resetFilters() {
    const next = { ...initialFilters, guildId: filters.guildId };
    setFilters(next); setAppliedFilters(next);
  }

  function applyPreset(eventName: string) {
    const next = { ...filters, eventName };
    setFilters(next);
    setAppliedFilters({ ...next, guildId: normalizeGuildId(next.guildId) });
  }

  const isLive = realtimeStatus === "live";

  return (
    <section className="flex max-w-7xl flex-col gap-3">
      {/* Filter bar */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <form onSubmit={submitFilters}>
          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_auto_auto]">
            <FilterInput
              label="Search"
              onChange={(v) => setFilters({ ...filters, search: v })}
              placeholder="content, channel, payload text"
              value={filters.search}
            />
            <FilterInput
              label="Event"
              onChange={(v) => setFilters({ ...filters, eventName: v })}
              placeholder="event prefix"
              value={filters.eventName}
            />
            <FilterInput
              label="Actor"
              onChange={(v) => setFilters({ ...filters, actorId: v })}
              placeholder="actor id"
              value={filters.actorId}
            />
            <Button className="h-9 self-end" type="submit">
              <Search className="h-3.5 w-3.5" />
              Search
            </Button>
            <Button
              className="h-9 self-end"
              onClick={resetFilters}
              type="button"
              variant="outline"
            >
              <X className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-3">
          {eventPresets.map((preset) => (
            <button
              className={
                filters.eventName === preset.eventName
                  ? "rounded px-2.5 py-1 text-xs font-medium border border-green-500/30 bg-green-500/10 text-green-400"
                  : "rounded px-2.5 py-1 text-xs font-medium border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              }
              key={preset.label}
              onClick={() => applyPreset(preset.eventName)}
              title={preset.description}
              type="button"
            >
              {preset.label}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-zinc-500">{logs.length} rows</span>
            {activeFilterCount > 0 && (
              <span className="text-xs text-zinc-500">{activeFilterCount} filters</span>
            )}
            <div className={`flex items-center gap-1.5 text-xs ${isLive ? "text-green-400" : "text-zinc-500"}`}>
              <span className={`inline-block h-1.5 w-1.5 rounded ${isLive ? "bg-green-400 animate-pulse" : "bg-zinc-600"}`} />
              {realtimeStatus}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Received</TableHead>
                <TableHead className="w-52">Event</TableHead>
                <TableHead className="w-40">Actor</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead className="w-20">Raw</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <LoadingRows />}
              {!loading && logs.length === 0 && <EmptyRow />}
              {!loading &&
                logs.map((log) => (
                  <LogRow
                    expanded={expandedId === log.id}
                    key={log.id}
                    log={log}
                    onToggle={() =>
                      setExpandedId(expandedId === log.id ? null : log.id)
                    }
                  />
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {nextCursor && (
        <div className="flex justify-end">
          <Button
            disabled={loadingMore}
            onClick={loadMore}
            type="button"
            variant="outline"
          >
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </section>
  );
}

function FilterInput({
  label,
  onChange,
  placeholder,
  value
}: {
  label: string;
  onChange: (v: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
      {label}
      <Input
        className="normal-case"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function LogRow({
  expanded,
  log,
  onToggle
}: {
  expanded: boolean;
  log: LogItem;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow>
        <TableCell className="text-xs text-zinc-500">{formatDate(log.receivedAt)}</TableCell>
        <TableCell>
          <span className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-xs ${eventBadgeClass(log.eventName)}`}>
            {log.eventName}
          </span>
        </TableCell>
        <TableCell className="font-mono text-xs text-zinc-500">{log.actorId ?? "—"}</TableCell>
        <TableCell className="text-xs text-zinc-400">{formatPayloadSummary(log)}</TableCell>
        <TableCell>
          <button
            className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
            onClick={onToggle}
            type="button"
          >
            {expanded ? "Hide" : "View"}
          </button>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-zinc-950">
          <TableCell colSpan={5}>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border border-zinc-800 bg-zinc-900 p-3 text-xs leading-5 text-zinc-300">
              {JSON.stringify(log.payload, null, 2)}
            </pre>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function LoadingRows() {
  return Array.from({ length: 5 }, (_, i) => (
    <TableRow key={i}>
      <TableCell className="text-zinc-600" colSpan={5}>Loading…</TableCell>
    </TableRow>
  ));
}

function EmptyRow() {
  return (
    <TableRow>
      <TableCell className="py-10 text-center text-zinc-600" colSpan={5}>
        No logs found for this guild.
      </TableCell>
    </TableRow>
  );
}

async function fetchLogs(filters: LogFilters, before?: string) {
  const query = new URLSearchParams();
  query.set("limit", "50");
  if (filters.search.trim()) query.set("search", filters.search.trim());
  if (filters.guildId.trim()) query.set("guildId", filters.guildId.trim());
  if (filters.eventName.trim()) query.set("eventName", filters.eventName.trim());
  if (filters.actorId.trim()) query.set("actorId", filters.actorId.trim());
  if (before) query.set("before", before);

  const r = await fetch(`/api/logs?${query.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed to load logs (${r.status})`);
  return (await r.json()) as LogsResponse;
}

function formatPayloadSummary(log: LogItem) {
  const payload = isRecord(log.payload) ? log.payload : {};
  const parts = [
    pickString(payload, "summary"),
    pickString(payload, "content"),
    pickString(payload, "channelName"),
    pickString(payload, "tempVoiceChannelName"),
    pickString(payload, "stableChannelKey"),
    pickString(payload, "sessionKey"),
    log.messageId ? `message ${log.messageId}` : null,
    log.channelId ? `channel ${log.channelId}` : null
  ].filter(Boolean);
  return parts.slice(0, 3).join(" / ") || "—";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pickString(src: Record<string, unknown>, key: string) {
  const v = src[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "medium" }).format(
    new Date(value)
  );
}

function toErrorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Failed to load logs";
}
```

- [ ] **Step 3: Run style policy test**

```bash
pnpm --filter @discord-bot/dashboard run test
```

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @discord-bot/dashboard run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/app/logs/
git commit -m "feat(dashboard): redesign logs explorer with dark theme and event badge colours"
```

---

## Task 11: Settings Panel + Dashboard Access section

**Files:**
- Modify: `apps/dashboard/src/app/settings/settings-panel.tsx`
- Modify: `apps/dashboard/src/app/settings/page.tsx`

- [ ] **Step 1: Update `settings/page.tsx`**

```typescript
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getDashboardSession } from "../../auth";
import { DashboardShell } from "../dashboard-shell";
import { SettingsPanel } from "./settings-panel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getDashboardSession();
  if (!session?.user) redirect("/login");

  const cookieStore = await cookies();
  const guildId = cookieStore.get("dashboard-guild-id")?.value;
  const guildName = cookieStore.get("dashboard-guild-name")?.value
    ? decodeURIComponent(cookieStore.get("dashboard-guild-name")!.value)
    : null;

  if (!guildId) redirect("/guild");

  return (
    <DashboardShell
      currentPath="/settings"
      description="Log mode, access control, and guild configuration"
      guildId={guildId}
      guildName={guildName}
      session={session}
      title="Settings"
    >
      <SettingsPanel guildId={guildId} />
    </DashboardShell>
  );
}
```

- [ ] **Step 2: Rewrite `settings-panel.tsx`**

```typescript
"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Select } from "../../components/ui/select";

interface DiscordRole {
  id: string;
  name: string;
}

interface SettingsResponse {
  guildId: string;
  guildName: string | null;
  isActive?: boolean;
  logMode: string;
  updatedAt: string;
  accessRole: string;
  dashboardManagementRoleIds: string[];
  availableRoles?: DiscordRole[];
}

const logModeOptions = [
  { label: "Full", value: "full" },
  { label: "Metadata Only", value: "metadata_only" },
  { label: "Disabled", value: "disabled" }
];

export function SettingsPanel({ guildId }: { guildId: string }) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [logMode, setLogMode] = useState("full");
  const [managementRoleIds, setManagementRoleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings(guildId)
      .then((data) => {
        setSettings(data);
        setLogMode(data.logMode);
        setManagementRoleIds(data.dashboardManagementRoleIds);
      })
      .catch((e: unknown) => setError(toErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [guildId]);

  async function saveLogMode() {
    if (!settings) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const data = await updateSettings(settings.guildId, logMode);
      setSettings((s) => (s ? { ...s, ...data } : s));
      setMessage("Settings saved.");
    } catch (e) { setError(toErrorMessage(e)); } finally { setSaving(false); }
  }

  async function saveManagementRoles() {
    if (!settings) return;
    setSavingRoles(true); setError(null); setMessage(null);
    try {
      await updateManagementRoles(settings.guildId, managementRoleIds);
      setMessage("Access roles updated.");
    } catch (e) { setError(toErrorMessage(e)); } finally { setSavingRoles(false); }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading settings…</p>;
  }

  if (!settings) {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {error ?? "Failed to load settings."}
      </div>
    );
  }

  const isOwner = settings.accessRole === "owner";

  return (
    <section className="grid max-w-4xl gap-4 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Guild Info</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <ReadOnlyValue label="Guild ID" value={settings.guildId} />
            <ReadOnlyValue label="Guild Name" value={settings.guildName ?? "—"} />
            <ReadOnlyValue label="Access Role" value={settings.accessRole} />
            <ReadOnlyValue label="Updated" value={formatDate(settings.updatedAt)} />
          </div>

          <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Log Mode
            <Select onChange={(e) => setLogMode(e.target.value)} value={logMode}>
              {logModeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </label>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
              {message}
            </div>
          )}

          <div className="flex justify-end">
            <Button disabled={saving} onClick={saveLogMode} type="button" size="sm">
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isOwner && settings.availableRoles !== undefined && (
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Access</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs text-zinc-500">
              Roles that can access the dashboard in addition to server owner and administrators.
            </p>
            <div className="flex flex-col gap-1.5">
              {settings.availableRoles.map((role) => (
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-zinc-800 px-3 py-2 hover:border-zinc-700"
                  key={role.id}
                >
                  <input
                    checked={managementRoleIds.includes(role.id)}
                    className="h-4 w-4 accent-green-500"
                    onChange={(e) => {
                      setManagementRoleIds(
                        e.target.checked
                          ? [...managementRoleIds, role.id]
                          : managementRoleIds.filter((id) => id !== role.id)
                      );
                    }}
                    type="checkbox"
                  />
                  <span className="text-sm text-zinc-300">{role.name}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end">
              <Button disabled={savingRoles} onClick={saveManagementRoles} size="sm" type="button">
                <Save className="h-3.5 w-3.5" />
                {savingRoles ? "Saving…" : "Save Roles"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-0.5 break-all font-mono text-xs text-zinc-300">{value}</p>
    </div>
  );
}

async function fetchSettings(guildId: string): Promise<SettingsResponse> {
  const query = new URLSearchParams({ guildId });
  const r = await fetch(`/api/settings?${query.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed to load settings (${r.status})`);
  return (await r.json()) as SettingsResponse;
}

async function updateSettings(guildId: string, logMode: string) {
  const r = await fetch("/api/settings", {
    body: JSON.stringify({ guildId, logMode }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  if (!r.ok) throw new Error(`Failed to save settings (${r.status})`);
  return (await r.json()) as SettingsResponse;
}

async function updateManagementRoles(guildId: string, roleIds: string[]) {
  const r = await fetch("/api/settings", {
    body: JSON.stringify({ guildId, dashboardManagementRoleIds: roleIds }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  if (!r.ok) throw new Error(`Failed to save roles (${r.status})`);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "medium" }).format(
    new Date(value)
  );
}

function toErrorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Settings request failed";
}
```

Note: `SettingsPanel` now accepts `guildId` as a prop (from the page server component's cookie) instead of reading from localStorage. No guild ID input form needed.

- [ ] **Step 3: Run all tests**

```bash
pnpm --filter @discord-bot/dashboard run test
```

Expected: all pass.

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @discord-bot/dashboard run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/app/settings/ apps/dashboard/src/app/dashboard-style-policy.test.ts apps/dashboard/tsconfig.test.json
git commit -m "feat(dashboard): redesign settings panel with dark theme and dashboard access roles"
```

---

## Final check

- [ ] Run full test suite: `pnpm --filter @discord-bot/dashboard run test`
- [ ] Typecheck: `pnpm --filter @discord-bot/dashboard run typecheck`
- [ ] Start dev server: `pnpm --filter @discord-bot/dashboard run dev`
- [ ] Manually verify: login → guild select → overview → logs → settings (including Dashboard Access section as owner)
