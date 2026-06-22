# Recruitment Close/Reopen from Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add close/reopen buttons to the recruitment dashboard; viewer can operate their own recruitments, admin/owner can operate any; Discord messages are updated via REST API PATCH.

**Architecture:** A new `PATCH /api/recruitments/[id]` route handles auth, DB updates (`closeRecruitment`/`reopenRecruitment` already exist in `@discord-bot/db`), and Discord message PATCH. The message payload builder is extracted to a pure function for testability. UI adds buttons to `RecruitmentCard` (admin/owner) and `MyRecruitmentRow` (viewer), wired through a `handleAction` callback on `RecruitmentDashboard`.

**Tech Stack:** Next.js App Router API routes, TypeScript, `@discord-bot/db`, `@discord-bot/shared`, Discord REST API v10, React (client component, `useState`)

## Global Constraints

- Discord REST API endpoint: `https://discord.com/api/v10`
- Use `getLocale` (not `getDashboardLocale`) for Discord message text — locale comes from `guildConfig.language`
- `REOPEN_DEADLINE_HOURS = 24` from `@discord-bot/shared`
- Test runner: `node --test` on compiled `.js` files in `dist-test/`
- New test files must be added to both `apps/dashboard/tsconfig.test.json` (include list) and the `test` script in `apps/dashboard/package.json`
- Ownership check: `authorization.role === "viewer"` AND `recruitment.creatorId !== authorization.userId` → 403
- `authorization.userId` is the Discord user ID string (from JWT `token.sub`)

---

### Task 1: `buildRecruitmentUpdatePayload` pure function + test

**Files:**
- Create: `apps/dashboard/src/app/api/recruitments/[id]/message.ts`
- Create: `apps/dashboard/src/app/api/recruitments/[id]/message.test.ts`
- Modify: `apps/dashboard/tsconfig.test.json` (add both files to `include`)
- Modify: `apps/dashboard/package.json` (add test file to `test` script)

**Interfaces:**
- Produces: `buildRecruitmentUpdatePayload(input: RecruitmentUpdateInput): object` — used by Task 2

- [ ] **Step 1: Write the failing test**

Create `apps/dashboard/src/app/api/recruitments/[id]/message.test.ts`:

```typescript
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getLocale } from "@discord-bot/shared";
import { buildRecruitmentUpdatePayload } from "./message.js";

const loc = getLocale("en");

const BASE_RECRUITMENT = {
  id: "r-1",
  genre: "Apex",
  content: "Ranked tonight",
  creatorId: "user-1",
  voiceChannelId: null,
  capacity: 4,
  deadlineAt: null,
} as const;

describe("buildRecruitmentUpdatePayload", () => {
  it("open: join enabled, close button, no deadline when deadlineAt is null", () => {
    const payload = buildRecruitmentUpdatePayload({
      recruitment: { ...BASE_RECRUITMENT, status: "open" },
      participantIds: ["user-a", "user-b"],
      queuedIds: [],
      loc,
    });

    // flags
    assert.equal((payload as { flags: number }).flags, 1 << 15);

    const actionRow = (payload as { components: unknown[] }).components[1] as {
      components: { custom_id?: string; disabled?: boolean; style: number }[];
    };
    const [joinBtn, , closeOrReopenBtn] = actionRow.components;

    assert.equal(joinBtn.disabled, false, "join should be enabled when open");
    assert.equal(
      closeOrReopenBtn.custom_id,
      "recruitment:close:r-1",
      "should show close button when open"
    );
    assert.equal(closeOrReopenBtn.style, 4, "close button style should be DANGER (4)");
  });

  it("closed: join disabled, reopen button shown", () => {
    const payload = buildRecruitmentUpdatePayload({
      recruitment: { ...BASE_RECRUITMENT, status: "closed" },
      participantIds: [],
      queuedIds: [],
      loc,
    });

    const actionRow = (payload as { components: unknown[] }).components[1] as {
      components: { custom_id?: string; disabled?: boolean; style: number }[];
    };
    const [joinBtn, , closeOrReopenBtn] = actionRow.components;

    assert.equal(joinBtn.disabled, true, "join should be disabled when closed");
    assert.equal(
      closeOrReopenBtn.custom_id,
      "recruitment:reopen:r-1",
      "should show reopen button when closed"
    );
    assert.equal(closeOrReopenBtn.style, 3, "reopen button style should be SUCCESS (3)");
  });

  it("closed: no deadline text in container", () => {
    const payload = buildRecruitmentUpdatePayload({
      recruitment: {
        ...BASE_RECRUITMENT,
        status: "closed",
        deadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      participantIds: [],
      queuedIds: [],
      loc,
    });

    const container = (payload as { components: unknown[] }).components[0] as {
      components: { content?: string }[];
    };
    const hasDeadline = container.components.some(
      (c) => c.content?.includes("Closes") || c.content?.includes("Deadline")
    );
    assert.equal(hasDeadline, false, "closed recruitment should not show deadline");
  });

  it("expired deadline shows 'Expired' text", () => {
    const payload = buildRecruitmentUpdatePayload({
      recruitment: {
        ...BASE_RECRUITMENT,
        status: "open",
        deadlineAt: new Date(0), // far past
      },
      participantIds: [],
      queuedIds: [],
      loc,
    });

    const container = (payload as { components: unknown[] }).components[0] as {
      components: { content?: string }[];
    };
    const hasExpired = container.components.some((c) => c.content === loc.recruitmentPostExpired);
    assert.equal(hasExpired, true, "expired deadline should show expired text");
  });

  it("participants and queue are rendered in content", () => {
    const payload = buildRecruitmentUpdatePayload({
      recruitment: { ...BASE_RECRUITMENT, status: "open" },
      participantIds: ["user-a"],
      queuedIds: ["user-b"],
      loc,
    });

    const container = (payload as { components: unknown[] }).components[0] as {
      components: { content?: string }[];
    };
    const texts = container.components.map((c) => c.content ?? "").join("\n");
    assert.ok(texts.includes("<@user-a>"), "participants should be listed");
    assert.ok(texts.includes("<@user-b>"), "queued users should be listed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
cd apps/dashboard && npm test
```

Expected: compilation error — `./message.js` not found.

- [ ] **Step 3: Implement `message.ts`**

Create `apps/dashboard/src/app/api/recruitments/[id]/message.ts`:

```typescript
import {
  getLocale,
  COUNTDOWN_THRESHOLD_24H_MS,
  COUNTDOWN_THRESHOLD_1H_MS,
} from "@discord-bot/shared";
import type { RecruitmentStatus } from "@discord-bot/db";

const COMPONENT_TYPE_ACTION_ROW = 1;
const COMPONENT_TYPE_BUTTON = 2;
const COMPONENT_TYPE_TEXT_DISPLAY = 10;
const COMPONENT_TYPE_SEPARATOR = 14;
const COMPONENT_TYPE_CONTAINER = 17;
const BUTTON_STYLE_PRIMARY = 1;
const BUTTON_STYLE_SECONDARY = 2;
const BUTTON_STYLE_SUCCESS = 3;
const BUTTON_STYLE_DANGER = 4;
const MESSAGE_FLAG_IS_COMPONENTS_V2 = 1 << 15;
const TEAL_COLOR = 0x1abc9c;

export interface RecruitmentUpdateInput {
  recruitment: {
    id: string;
    genre: string;
    content: string;
    creatorId: string;
    voiceChannelId: string | null;
    status: RecruitmentStatus;
    capacity: number;
    deadlineAt: Date | null;
  };
  participantIds: string[];
  queuedIds: string[];
  loc: ReturnType<typeof getLocale>;
}

function localizeStatus(status: string, loc: ReturnType<typeof getLocale>): string {
  if (status === "open") return loc.recruitmentStatusOpen;
  if (status === "full") return loc.recruitmentStatusFull;
  return loc.recruitmentStatusClosed;
}

function formatDeadlineText(
  deadlineAt: Date | null,
  loc: ReturnType<typeof getLocale>
): string | null {
  if (!deadlineAt) return null;

  const msLeft = deadlineAt.getTime() - Date.now();

  if (msLeft <= 0) return loc.recruitmentPostExpired;

  if (msLeft > COUNTDOWN_THRESHOLD_24H_MS) {
    return loc.recruitmentPostDeadlineAbsolute({
      timestamp: Math.floor(deadlineAt.getTime() / 1000),
    });
  }

  if (msLeft > COUNTDOWN_THRESHOLD_1H_MS) {
    const hours = Math.floor(msLeft / COUNTDOWN_THRESHOLD_1H_MS);
    const minutes = Math.floor((msLeft % COUNTDOWN_THRESHOLD_1H_MS) / 60_000);
    return loc.recruitmentPostDeadlineHours({ hours, minutes });
  }

  const minutes = Math.max(1, Math.floor(msLeft / 60_000));
  return loc.recruitmentPostDeadlineMinutes({ minutes });
}

export function buildRecruitmentUpdatePayload(input: RecruitmentUpdateInput) {
  const { recruitment, participantIds, queuedIds, loc } = input;
  const isClosed = recruitment.status === "closed";

  const vcText = recruitment.voiceChannelId
    ? loc.recruitmentPostVc({ id: recruitment.voiceChannelId })
    : loc.recruitmentPostNoVc;

  const deadlineText = isClosed
    ? null
    : formatDeadlineText(recruitment.deadlineAt, loc);

  const participantText =
    participantIds.length > 0
      ? `${loc.recruitmentParticipantsLabel}\n${participantIds.map((id) => `<@${id}>`).join("\n")}`
      : loc.recruitmentNoParticipants;

  const queueText =
    queuedIds.length > 0
      ? `${loc.recruitmentQueueLabel}\n${queuedIds.map((id) => `<@${id}>`).join("\n")}`
      : null;

  const closeOrReopenButton = isClosed
    ? {
        type: COMPONENT_TYPE_BUTTON,
        custom_id: `recruitment:reopen:${recruitment.id}`,
        label: loc.recruitmentButtonReopen,
        style: BUTTON_STYLE_SUCCESS,
      }
    : {
        type: COMPONENT_TYPE_BUTTON,
        custom_id: `recruitment:close:${recruitment.id}`,
        label: loc.recruitmentButtonClose,
        style: BUTTON_STYLE_DANGER,
      };

  const containerComponents = [
    {
      type: COMPONENT_TYPE_TEXT_DISPLAY,
      content: `## ${loc.recruitmentPostTitle({ title: recruitment.genre })}`,
    },
    {
      type: COMPONENT_TYPE_TEXT_DISPLAY,
      content: `${localizeStatus(recruitment.status, loc)}  ·  👥 ${participantIds.length} / ${recruitment.capacity}`,
    },
    { type: COMPONENT_TYPE_SEPARATOR },
    { type: COMPONENT_TYPE_TEXT_DISPLAY, content: recruitment.content },
    { type: COMPONENT_TYPE_SEPARATOR },
    {
      type: COMPONENT_TYPE_TEXT_DISPLAY,
      content: loc.recruitmentPostCreator({ id: recruitment.creatorId }),
    },
    { type: COMPONENT_TYPE_TEXT_DISPLAY, content: vcText },
    ...(deadlineText
      ? [{ type: COMPONENT_TYPE_TEXT_DISPLAY, content: deadlineText }]
      : []),
    { type: COMPONENT_TYPE_TEXT_DISPLAY, content: participantText },
    ...(queueText
      ? [{ type: COMPONENT_TYPE_TEXT_DISPLAY, content: queueText }]
      : []),
  ];

  return {
    flags: MESSAGE_FLAG_IS_COMPONENTS_V2,
    components: [
      {
        type: COMPONENT_TYPE_CONTAINER,
        accent_color: TEAL_COLOR,
        components: containerComponents,
      },
      {
        type: COMPONENT_TYPE_ACTION_ROW,
        components: [
          {
            type: COMPONENT_TYPE_BUTTON,
            custom_id: `recruitment:join:${recruitment.id}`,
            label: loc.recruitmentButtonJoin,
            style: BUTTON_STYLE_PRIMARY,
            disabled: isClosed,
          },
          {
            type: COMPONENT_TYPE_BUTTON,
            custom_id: `recruitment:leave:${recruitment.id}`,
            label: loc.recruitmentButtonLeave,
            style: BUTTON_STYLE_SECONDARY,
          },
          closeOrReopenButton,
        ],
      },
    ],
  };
}
```

- [ ] **Step 4: Register test file in `tsconfig.test.json`**

In `apps/dashboard/tsconfig.test.json`, add to `include`:
```json
"src/app/api/recruitments/[id]/message.ts",
"src/app/api/recruitments/[id]/message.test.ts"
```

- [ ] **Step 5: Register test file in `package.json`**

In `apps/dashboard/package.json`, append to the `test` script (after the last `.js` entry, before the closing `"`):
```
dist-test/app/api/recruitments/[id]/message.test.js
```

- [ ] **Step 6: Run test to verify it passes**

```
cd apps/dashboard && npm test
```

Expected: all tests pass including the 5 new `buildRecruitmentUpdatePayload` tests.

- [ ] **Step 7: Commit**

```bash
git add apps/dashboard/src/app/api/recruitments/[id]/message.ts \
        apps/dashboard/src/app/api/recruitments/[id]/message.test.ts \
        apps/dashboard/tsconfig.test.json \
        apps/dashboard/package.json
git commit -m "feat(dashboard): add buildRecruitmentUpdatePayload for Discord message PATCH"
```

---

### Task 2: PATCH `/api/recruitments/[id]` route

**Files:**
- Create: `apps/dashboard/src/app/api/recruitments/[id]/route.ts`

**Interfaces:**
- Consumes: `buildRecruitmentUpdatePayload` from `./message.js` (Task 1)
- Consumes from `@discord-bot/db`: `getRecruitmentById`, `closeRecruitment`, `reopenRecruitment`, `listActiveRecruitmentParticipants`, `listQueuedParticipants`, `getGuildConfigByGuildId`, `createDbConnection`
- Consumes from `@discord-bot/shared`: `getLocale`, `isGuildLanguage`, `REOPEN_DEADLINE_HOURS`
- Consumes: `authorizeDashboardApi` from `../../../../dashboard-auth`
- Consumes: `parseDashboardAuthEnv` from `@discord-bot/config`
- Produces: `PATCH /api/recruitments/[id]` HTTP handler

- [ ] **Step 1: Create the route file**

Create `apps/dashboard/src/app/api/recruitments/[id]/route.ts`:

```typescript
import {
  createDbConnection,
  closeRecruitment,
  reopenRecruitment,
  getRecruitmentById,
  getGuildConfigByGuildId,
  listActiveRecruitmentParticipants,
  listQueuedParticipants,
} from "@discord-bot/db";
import {
  getLocale,
  isGuildLanguage,
  REOPEN_DEADLINE_HOURS,
} from "@discord-bot/shared";
import { parseDashboardAuthEnv } from "@discord-bot/config";
import { NextResponse, type NextRequest } from "next/server";

import { authorizeDashboardApi } from "../../../../dashboard-auth";
import { buildRecruitmentUpdatePayload } from "./message";

export const dynamic = "force-dynamic";

let _env: ReturnType<typeof parseDashboardAuthEnv> | undefined;
function getEnv() {
  return (_env ??= parseDashboardAuthEnv());
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: recruitmentId } = await params;
  const body = await request.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : null;
  const guildId =
    typeof body?.guildId === "string" ? body.guildId.trim() : undefined;

  if (action !== "close" && action !== "reopen") {
    return NextResponse.json(
      { error: "action must be 'close' or 'reopen'" },
      { status: 400 }
    );
  }

  const authorization = await authorizeDashboardApi({
    request,
    guildId,
    requiredRole: "viewer",
  });

  if (!authorization.allowed) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status }
    );
  }

  const dbConnection = createDbConnection();
  try {
    const recruitment = await getRecruitmentById(dbConnection.db, recruitmentId);

    if (!recruitment || recruitment.guildId !== authorization.guild.id) {
      return NextResponse.json(
        { error: "Recruitment not found." },
        { status: 404 }
      );
    }

    if (
      authorization.role === "viewer" &&
      recruitment.creatorId !== authorization.userId
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const guildConfig = await getGuildConfigByGuildId(
      dbConnection.db,
      authorization.guild.id
    );
    const rawLang = guildConfig?.language;
    const lang = rawLang && isGuildLanguage(rawLang) ? rawLang : "ja";
    const loc = getLocale(lang);

    if (action === "close") {
      if (recruitment.status === "closed") {
        return NextResponse.json(
          { error: "Already closed." },
          { status: 400 }
        );
      }

      const updated = await closeRecruitment(dbConnection.db, {
        recruitmentId: recruitment.id,
      });

      await patchDiscordMessage(dbConnection.db, updated ?? recruitment, loc);

      return NextResponse.json({ recruitment: updated });
    }

    // reopen
    if (recruitment.status !== "closed") {
      return NextResponse.json(
        { error: "Not closed." },
        { status: 400 }
      );
    }

    const activeParticipants = await listActiveRecruitmentParticipants(
      dbConnection.db,
      recruitment.id
    );
    const nextStatus =
      activeParticipants.length >= recruitment.capacity ? "full" : "open";
    const deadlineAt = new Date(
      Date.now() + REOPEN_DEADLINE_HOURS * 60 * 60 * 1000
    );

    const updated = await reopenRecruitment(dbConnection.db, {
      recruitmentId: recruitment.id,
      status: nextStatus,
      deadlineAt,
    });

    await patchDiscordMessage(dbConnection.db, updated ?? recruitment, loc);

    return NextResponse.json({ recruitment: updated });
  } finally {
    await dbConnection.close();
  }
}

async function patchDiscordMessage(
  db: ReturnType<typeof createDbConnection>["db"],
  recruitment: {
    id: string;
    channelId: string;
    messageId: string | null;
    genre: string;
    content: string;
    creatorId: string;
    voiceChannelId: string | null;
    status: string;
    capacity: number;
    deadlineAt: Date | null;
  },
  loc: ReturnType<typeof getLocale>
) {
  const botToken = getEnv().DISCORD_BOT_TOKEN;
  if (!botToken || !recruitment.messageId) return;

  const [participants, queued] = await Promise.all([
    listActiveRecruitmentParticipants(db, recruitment.id),
    listQueuedParticipants(db, recruitment.id),
  ]);

  const payload = buildRecruitmentUpdatePayload({
    recruitment: {
      ...recruitment,
      status: recruitment.status as "open" | "full" | "closed",
    },
    participantIds: participants.map((p) => p.userId),
    queuedIds: queued.map((p) => p.userId),
    loc,
  });

  const res = await fetch(
    `https://discord.com/api/v10/channels/${recruitment.channelId}/messages/${recruitment.messageId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    console.error("failed to patch recruitment message", {
      recruitmentId: recruitment.id,
      status: res.status,
    });
  }
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```
cd apps/dashboard && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/src/app/api/recruitments/[id]/route.ts
git commit -m "feat(dashboard): add PATCH /api/recruitments/[id] for close/reopen"
```

---

### Task 3: UI — close/reopen buttons in `RecruitmentDashboard`

**Files:**
- Modify: `apps/dashboard/src/app/recruitment/recruitment-dashboard.tsx`

**Interfaces:**
- Consumes: `PATCH /api/recruitments/{id}` from Task 2

- [ ] **Step 1: Add `onAction` prop to `RecruitmentCard`**

In `recruitment-dashboard.tsx`, replace the `RecruitmentCard` function signature and body:

Find:
```tsx
function RecruitmentCard({ r }: { r: RecruitmentItem }) {
  const borderClass = STATUS_BORDER[r.status];
  return (
    <div className={`rounded-xl border border-[#1e1f22] border-l-2 ${borderClass} bg-[#2b2d31] shadow-sm p-3`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-lg leading-none">{titleEmoji(r.genre)}</span>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-[#dbdee1]">{r.genre}</p>
          {r.content && (
            <p className="mt-0.5 line-clamp-2 text-xs text-[#b5bac1]">{r.content}</p>
          )}
          <p className="mt-0.5 text-xs text-[#80848e]">
            {formatRelativeTime(new Date(r.createdAt))} 作成
          </p>
          {r.status !== "closed" && (
            <div className="mt-0.5">
              <DeadlineText deadlineAt={r.deadlineAt} />
            </div>
          )}
        </div>
      </div>
      <CapacityBar current={r.activeParticipantCount} max={r.capacity} />
    </div>
  );
}
```

Replace with:
```tsx
function RecruitmentCard({
  r,
  closingId,
  onAction,
}: {
  r: RecruitmentItem;
  closingId: string | null;
  onAction: (id: string, action: "close" | "reopen") => void;
}) {
  const borderClass = STATUS_BORDER[r.status];
  const isClosing = closingId === r.id;
  return (
    <div className={`rounded-xl border border-[#1e1f22] border-l-2 ${borderClass} bg-[#2b2d31] shadow-sm p-3`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-lg leading-none">{titleEmoji(r.genre)}</span>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-[#dbdee1]">{r.genre}</p>
          {r.content && (
            <p className="mt-0.5 line-clamp-2 text-xs text-[#b5bac1]">{r.content}</p>
          )}
          <p className="mt-0.5 text-xs text-[#80848e]">
            {formatRelativeTime(new Date(r.createdAt))} 作成
          </p>
          {r.status !== "closed" && (
            <div className="mt-0.5">
              <DeadlineText deadlineAt={r.deadlineAt} />
            </div>
          )}
        </div>
      </div>
      <CapacityBar current={r.activeParticipantCount} max={r.capacity} />
      <div className="mt-2 flex justify-end">
        {r.status === "closed" ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={isClosing}
            onClick={() => onAction(r.id, "reopen")}
          >
            {isClosing ? "処理中..." : "再オープン"}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            disabled={isClosing}
            className="text-red-400 hover:text-red-300"
            onClick={() => onAction(r.id, "close")}
          >
            {isClosing ? "処理中..." : "締め切る"}
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `onAction` prop to `MyRecruitmentRow`**

Find:
```tsx
function MyRecruitmentRow({ r }: { r: RecruitmentItem }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#1e1f22] bg-[#2b2d31] px-4 py-3">
      <span className="text-base leading-none">{titleEmoji(r.genre)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[#dbdee1]">{r.genre}</p>
          <Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABELS[r.status]}</Badge>
        </div>
        {r.content && (
          <p className="mt-0.5 truncate text-xs text-[#b5bac1]">{r.content}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-[#dbdee1]">
          {r.activeParticipantCount}/{r.capacity}人
        </p>
        {r.status !== "closed" && <DeadlineText deadlineAt={r.deadlineAt} />}
      </div>
    </div>
  );
}
```

Replace with:
```tsx
function MyRecruitmentRow({
  r,
  closingId,
  onAction,
}: {
  r: RecruitmentItem;
  closingId: string | null;
  onAction: (id: string, action: "close" | "reopen") => void;
}) {
  const isClosing = closingId === r.id;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#1e1f22] bg-[#2b2d31] px-4 py-3">
      <span className="text-base leading-none">{titleEmoji(r.genre)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[#dbdee1]">{r.genre}</p>
          <Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABELS[r.status]}</Badge>
        </div>
        {r.content && (
          <p className="mt-0.5 truncate text-xs text-[#b5bac1]">{r.content}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-[#dbdee1]">
          {r.activeParticipantCount}/{r.capacity}人
        </p>
        {r.status !== "closed" && <DeadlineText deadlineAt={r.deadlineAt} />}
      </div>
      {r.status === "closed" ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={isClosing}
          onClick={() => onAction(r.id, "reopen")}
        >
          {isClosing ? "処理中..." : "再オープン"}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          disabled={isClosing}
          className="text-red-400 hover:text-red-300"
          onClick={() => onAction(r.id, "close")}
        >
          {isClosing ? "処理中..." : "締め切る"}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add state and `handleAction` to `RecruitmentDashboard`**

In the `RecruitmentDashboard` function, after the existing `const isViewer = role === "viewer";` line, add:

```tsx
const [closingId, setClosingId] = useState<string | null>(null);
const [actionError, setActionError] = useState<string | null>(null);

async function handleAction(id: string, action: "close" | "reopen") {
  setClosingId(id);
  setActionError(null);
  try {
    const res = await fetch(`/api/recruitments/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, guildId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({} as { error?: string })) as { error?: string };
      setActionError(body.error ?? "操作に失敗しました");
      return;
    }
    reload();
  } catch {
    setActionError("操作に失敗しました");
  } finally {
    setClosingId(null);
  }
}
```

- [ ] **Step 4: Wire `handleAction` into the viewer branch**

Find the viewer return block. Change `<MyRecruitmentRow key={r.id} r={r} />` to:

```tsx
<MyRecruitmentRow
  key={r.id}
  r={r}
  closingId={closingId}
  onAction={(id, action) => void handleAction(id, action)}
/>
```

Also add the error alert inside the viewer return, right after the opening `<div className="flex max-w-3xl flex-col gap-4">`:

```tsx
{actionError && (
  <ErrorAlert message={actionError} onRetry={() => setActionError(null)} />
)}
```

- [ ] **Step 5: Wire `handleAction` into the admin/owner branch**

In the 3-column grid section, change `<RecruitmentCard key={r.id} r={r} />` to:

```tsx
<RecruitmentCard
  key={r.id}
  r={r}
  closingId={closingId}
  onAction={(id, action) => void handleAction(id, action)}
/>
```

Also add the error alert at the top of the admin/owner return, right after the opening `<div className="flex max-w-6xl flex-col gap-6">`:

```tsx
{actionError && (
  <ErrorAlert message={actionError} onRetry={() => setActionError(null)} />
)}
```

- [ ] **Step 6: Verify TypeScript compilation**

```
cd apps/dashboard && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Run full test suite**

```
cd apps/dashboard && npm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/dashboard/src/app/recruitment/recruitment-dashboard.tsx
git commit -m "feat(dashboard): add close/reopen buttons to recruitment cards and rows"
```
