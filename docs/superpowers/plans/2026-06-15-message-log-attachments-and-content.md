# Message Log: Attachment Display & Content Inclusion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show image/video attachments inline (MediaGallery) in log channel entries, and fix message content display for create/update/delete events.

**Architecture:** Four layered changes — locale key → component helper → normalizer → log formatter. Each layer is independently testable. No new files.

**Tech Stack:** TypeScript, discord.js 14.26.4, Node.js `node:test`

---

## File Map

| File | Change |
|------|--------|
| `packages/shared/src/locale.ts` | Add `logContentChange` type + EN/JA implementations |
| `packages/shared/src/locale.test.ts` | Add 2 tests for `logContentChange` |
| `apps/bot/src/discord/components-v2.ts` | Add `mediaUrls` input field; push MediaGallery component (type 12) |
| `apps/bot/src/discord/components-v2.test.ts` | Add 3 tests for MediaGallery behaviour |
| `packages/discord-core/src/adapters/message.ts` | Add `attachmentPayload` helper; add `attachments` to payload |
| `apps/bot/src/discord/log-channel.ts` | Restructure `formatLogPayload`; extract mediaUrls in `sendEventToConfiguredLogChannel` |
| `apps/bot/src/discord/log-channel.test.ts` | Add 2 new tests; update existing content test |

---

## Task 1: Add `logContentChange` locale key

**Files:**
- Modify: `packages/shared/src/locale.ts`
- Test: `packages/shared/src/locale.test.ts`

- [ ] **Step 1.1: Write the failing tests**

Open `packages/shared/src/locale.test.ts`. Add at the end of the file:

```ts
describe("logContentChange", () => {
  it("formats before/after content in English", () => {
    const loc = getLocale("en");
    assert.equal(
      loc.logContentChange({ before: "old text", after: "new text" }),
      "Content: old text → new text"
    );
  });

  it("formats before/after content in Japanese", () => {
    const loc = getLocale("ja");
    assert.equal(
      loc.logContentChange({ before: "旧テキスト", after: "新テキスト" }),
      "内容: 旧テキスト → 新テキスト"
    );
  });
});
```

- [ ] **Step 1.2: Run tests to confirm they fail**

```
pnpm --filter @discord-bot/shared test
```

Expected: TypeScript compile error — `Property 'logContentChange' does not exist on type ...`

- [ ] **Step 1.3: Add type definition**

In `packages/shared/src/locale.ts`, find the `logChangeField` line (around line 128):
```ts
  logChangeField: (vars: { label: string; before: string; after: string }) => string;
```

Add after it:
```ts
  logContentChange: (vars: { before: string; after: string }) => string;
```

- [ ] **Step 1.4: Add English implementation**

Find the EN `logChangeField` implementation (search for `logChangeField: ({ label, before, after }) => \`${label}: ${before} → ${after}\``):

Add after it:
```ts
    logContentChange: ({ before, after }) => `Content: ${before} → ${after}`,
```

- [ ] **Step 1.5: Add Japanese implementation**

Find the JA `logChangeField` implementation (same pattern but in Japanese block, search for second `logChangeField:`):

Add after it:
```ts
    logContentChange: ({ before, after }) => `内容: ${before} → ${after}`,
```

- [ ] **Step 1.6: Run tests to confirm they pass**

```
pnpm --filter @discord-bot/shared test
```

Expected: all tests pass

- [ ] **Step 1.7: Commit**

```bash
git add packages/shared/src/locale.ts packages/shared/src/locale.test.ts
git commit -m "feat(shared): add logContentChange locale key for message update display"
```

---

## Task 2: Add `mediaUrls` / MediaGallery to `createComponentsV2TextMessage`

**Files:**
- Modify: `apps/bot/src/discord/components-v2.ts`
- Test: `apps/bot/src/discord/components-v2.test.ts`

- [ ] **Step 2.1: Write the failing tests**

Open `apps/bot/src/discord/components-v2.test.ts`. Add after the existing `createComponentsV2TextMessage` describe block (after line 63, before `describe("discordTimestamp"...)`):

```ts
describe("createComponentsV2TextMessage with mediaUrls", () => {
  it("appends a MediaGallery component when mediaUrls are provided", () => {
    const url = "https://cdn.discordapp.com/attachments/1/2/image.png";
    const message = createComponentsV2TextMessage({
      title: "Test",
      lines: ["line 1"],
      mediaUrls: [url]
    });

    const container = message.components?.[0] as unknown as Record<string, unknown>;
    const components = container.components as unknown[];
    assert.equal(components.length, 3); // title TextDisplay + line TextDisplay + MediaGallery
    const gallery = components[2] as Record<string, unknown>;
    assert.equal(gallery.type, 12);
    assert.deepEqual(gallery.items, [{ media: { url } }]);
  });

  it("caps MediaGallery at 10 items when more than 10 URLs are given", () => {
    const urls = Array.from({ length: 12 }, (_, i) => `https://cdn.discordapp.com/img${i}.png`);
    const message = createComponentsV2TextMessage({ title: "Test", mediaUrls: urls });

    const container = message.components?.[0] as unknown as Record<string, unknown>;
    const components = container.components as unknown[];
    const gallery = components[1] as Record<string, unknown>;
    const items = gallery.items as unknown[];
    assert.equal(items.length, 10);
  });

  it("does not add a MediaGallery when mediaUrls is empty", () => {
    const message = createComponentsV2TextMessage({ title: "Test", lines: ["x"], mediaUrls: [] });

    const container = message.components?.[0] as unknown as Record<string, unknown>;
    const components = container.components as unknown[];
    assert.equal(components.length, 2); // title + line only, no gallery
  });
});
```

- [ ] **Step 2.2: Run tests to confirm they fail**

```
pnpm --filter @discord-bot/bot test
```

Expected: TypeScript compile error — `Object literal may only specify known properties, and 'mediaUrls' does not exist ...`

- [ ] **Step 2.3: Add `mediaUrls` field and MediaGallery rendering**

Replace the entire `components-v2.ts` content with:

```ts
import {
  ComponentType,
  MessageFlags,
  type InteractionReplyOptions,
  type MessageCreateOptions,
  type TopLevelComponentData
} from "discord.js";

export interface ComponentsV2TextMessageInput {
  title: string;
  lines?: readonly string[];
  accentColor?: number;
  privateResponse?: boolean;
  mediaUrls?: readonly string[];
}

export const EVENT_COLORS = {
  purple: 0x9B59B6,
  blue:   0x5865F2,
  teal:   0x1ABC9C,
  green:  0x57F287,
  red:    0xED4245,
  yellow: 0xFEE75C,
  gray:   0x99AAB5,
} as const;

export function discordTimestamp(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:f>`;
}

export function discordRelative(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

export function createComponentsV2TextMessage(
  input: ComponentsV2TextMessageInput
): InteractionReplyOptions & MessageCreateOptions {
  const components: unknown[] = [
    {
      type: ComponentType.TextDisplay,
      content: `## ${input.title}`
    },
    ...(input.lines ?? []).map((line) => ({
      type: ComponentType.TextDisplay,
      content: line
    }))
  ];

  if (input.mediaUrls && input.mediaUrls.length > 0) {
    const capped = input.mediaUrls.slice(0, 10);
    components.push({
      type: 12, // MediaGallery — not yet in ComponentType enum for discord-api-types@0.38.47
      items: capped.map(url => ({ media: { url } }))
    });
  }

  const container: Record<string, unknown> = {
    type: ComponentType.Container,
    components
  };

  if (input.accentColor !== undefined) {
    container.accent_color = input.accentColor;
  }

  return {
    components: [container as unknown as TopLevelComponentData],
    flags:
      MessageFlags.IsComponentsV2 |
      (input.privateResponse ? MessageFlags.Ephemeral : 0)
  };
}
```

- [ ] **Step 2.4: Run tests to confirm they pass**

```
pnpm --filter @discord-bot/bot test
```

Expected: all tests pass (including the 3 new ones)

- [ ] **Step 2.5: Commit**

```bash
git add apps/bot/src/discord/components-v2.ts apps/bot/src/discord/components-v2.test.ts
git commit -m "feat(bot): add mediaUrls / MediaGallery support to createComponentsV2TextMessage"
```

---

## Task 3: Add `attachments` to message event payload

**Files:**
- Modify: `packages/discord-core/src/adapters/message.ts`

No test file exists for this package yet. Correctness is verified by TypeScript compilation and by the log-channel integration in Task 4.

- [ ] **Step 3.1: Add `attachmentPayload` helper and update `normalizeMessageEvent`**

Replace the entire `packages/discord-core/src/adapters/message.ts` with:

```ts
import type { Message, PartialMessage } from "discord.js";

import type { NormalizedEvent } from "@discord-bot/shared";

type AnyMessage = Message | PartialMessage;

export function normalizeMessageCreate(message: Message): NormalizedEvent {
  const channelName =
    message.channel && "name" in message.channel
      ? (message.channel as { name: string }).name
      : null;

  return normalizeMessageEvent("message.create", message, message.createdAt, {
    author: message.author
      ? {
          id: message.author.id,
          username: message.author.username,
          globalName: message.author.globalName,
        }
      : null,
    channel: channelName ? { name: channelName } : null,
  });
}

export function normalizeMessageUpdate(
  oldMessage: AnyMessage,
  newMessage: AnyMessage
): NormalizedEvent {
  const eventTimestamp = newMessage.editedAt ?? newMessage.createdAt ?? new Date();

  return normalizeMessageEvent("message.update", newMessage, eventTimestamp, {
    oldContent: oldMessage.content ?? null,
    newContent: newMessage.content ?? null
  });
}

export function normalizeMessageDelete(message: AnyMessage): NormalizedEvent {
  return normalizeMessageEvent(
    "message.delete",
    message,
    message.createdAt ?? new Date()
  );
}

function attachmentPayload(
  message: AnyMessage
): Array<{ url: string; name: string; contentType: string | null }> {
  return [...(message.attachments?.values() ?? [])]
    .filter(a => a.contentType?.startsWith("image/") || a.contentType?.startsWith("video/"))
    .map(a => ({ url: a.url, name: a.name, contentType: a.contentType ?? null }));
}

function normalizeMessageEvent(
  eventName: string,
  message: AnyMessage,
  eventTimestamp: Date,
  extraPayload: Record<string, unknown> = {}
): NormalizedEvent {
  return {
    eventName,
    eventTimestamp,
    receivedAt: new Date(),
    guildId: message.guildId,
    actorId: message.author?.id ?? null,
    channelId: message.channelId,
    messageId: message.id,
    payload: {
      content: message.content ?? null,
      attachments: attachmentPayload(message),
      createdTimestamp: message.createdTimestamp ?? null,
      partial: message.partial,
      ...extraPayload
    }
  };
}
```

- [ ] **Step 3.2: Build to confirm no TypeScript errors**

```
pnpm --filter @discord-bot/discord-core build
```

Expected: exit 0, no errors

- [ ] **Step 3.3: Commit**

```bash
git add packages/discord-core/src/adapters/message.ts
git commit -m "feat(discord-core): capture image/video attachments in message event payload"
```

---

## Task 4: Fix `formatLogPayload` and wire up `mediaUrls` in log channel

**Files:**
- Modify: `apps/bot/src/discord/log-channel.ts`
- Test: `apps/bot/src/discord/log-channel.test.ts`

- [ ] **Step 4.1: Write the failing tests**

Open `apps/bot/src/discord/log-channel.test.ts`. Add inside the `describe("log event formatting (en)")` block, after the existing tests:

```ts
  it("shows (empty) for message.create with no text content", () => {
    const event: NormalizedEvent = {
      eventName: "message.create",
      eventTimestamp: new Date("2026-05-12T00:00:00.000Z"),
      receivedAt: new Date("2026-05-12T00:00:01.000Z"),
      guildId: "guild-1",
      actorId: "user-1",
      channelId: "channel-1",
      messageId: "message-1",
      payload: { content: "" }
    };

    assert.deepEqual(formatLogEventLines(event, enLoc), [
      "Actor: <@user-1>",
      "Channel: <#channel-1>",
      "Message ID: message-1",
      "Event time: <t:1778544000:f>",
      "Content: (empty)"
    ]);
  });

  it("shows before/after for message.update", () => {
    const event: NormalizedEvent = {
      eventName: "message.update",
      eventTimestamp: new Date("2026-05-12T00:00:00.000Z"),
      receivedAt: new Date("2026-05-12T00:00:01.000Z"),
      guildId: "guild-1",
      actorId: "user-1",
      channelId: "channel-1",
      messageId: "message-1",
      payload: { content: "new text", oldContent: "old text", newContent: "new text" }
    };

    assert.deepEqual(formatLogEventLines(event, enLoc), [
      "Actor: <@user-1>",
      "Channel: <#channel-1>",
      "Message ID: message-1",
      "Event time: <t:1778544000:f>",
      "Content: old text → new text"
    ]);
  });
```

- [ ] **Step 4.2: Run tests to confirm they fail**

```
pnpm --filter @discord-bot/bot test
```

Expected: 2 new tests FAIL — `"Content: (empty)"` not matched (gets no content line), `"Content: old text → new text"` not matched (gets `"Content: new text"` instead).

- [ ] **Step 4.3: Restructure `formatLogPayload` and update `sendEventToConfiguredLogChannel`**

Replace `apps/bot/src/discord/log-channel.ts` with:

```ts
import {
  ChannelType,
  type Client,
  type Guild,
  type TextChannel
} from "discord.js";
import type { NormalizedEvent } from "@discord-bot/shared";
import { getLocale, isGuildLanguage, type GuildLanguage } from "@discord-bot/shared";
import type { DbClient } from "@discord-bot/db";
import { getGuildConfigByGuildId } from "@discord-bot/db";

import {
  createComponentsV2TextMessage,
  EVENT_COLORS,
  discordTimestamp
} from "./components-v2.js";

export const logChannelTopicMarker = "[discord-management-bot:logs]";

function getEventAccentColor(eventName: string): number {
  if (eventName.startsWith("voice.session.") || eventName.startsWith("call.")) return EVENT_COLORS.purple;
  if (eventName.startsWith("voice.temp.")) return EVENT_COLORS.teal;
  if (eventName.startsWith("message.")) return EVENT_COLORS.blue;
  if (eventName.startsWith("member.") || eventName.startsWith("guild.")) return EVENT_COLORS.yellow;
  if (eventName.startsWith("recruitment.")) return EVENT_COLORS.green;
  if (eventName.startsWith("tts.")) return EVENT_COLORS.blue;
  if (eventName.startsWith("system.") && (eventName.includes("error") || eventName.includes("crashed") || eventName.includes("failed"))) return EVENT_COLORS.red;
  if (eventName.startsWith("system.")) return EVENT_COLORS.yellow;
  return EVENT_COLORS.gray;
}

type Locale = ReturnType<typeof getLocale>;

export function hasLogChannelMarker(topic: string | null | undefined) {
  return topic?.includes(logChannelTopicMarker) === true;
}

export function appendLogChannelMarker(topic: string | null | undefined) {
  const normalizedTopic = topic?.trim();

  if (hasLogChannelMarker(normalizedTopic)) {
    return normalizedTopic ?? logChannelTopicMarker;
  }

  return [normalizedTopic, logChannelTopicMarker].filter(Boolean).join("\n");
}

export async function markLogChannel(channel: TextChannel) {
  if (hasLogChannelMarker(channel.topic)) {
    return;
  }

  await channel.setTopic(
    appendLogChannelMarker(channel.topic),
    "Configured as the bot log channel."
  );
}

export async function sendEventToConfiguredLogChannel(
  client: Client,
  event: NormalizedEvent,
  db: DbClient
) {
  if (!event.guildId) {
    return;
  }

  const guild = client.guilds.cache.get(event.guildId);

  if (!guild) {
    return;
  }

  const channel = await findMarkedLogChannel(guild);

  if (!channel) {
    return;
  }

  const config = await getGuildConfigByGuildId(db, event.guildId).catch((error: unknown) => {
    console.warn("failed to fetch guild config for log channel locale", error);
    return null;
  });
  const lang: GuildLanguage =
    config?.language && isGuildLanguage(config.language)
      ? config.language
      : "en";
  const loc = getLocale(lang);

  const rawAttachments = event.payload.attachments;
  const mediaUrls: string[] = Array.isArray(rawAttachments)
    ? rawAttachments
        .filter((a): a is { url: string } =>
          typeof a === "object" && a !== null &&
          typeof (a as Record<string, unknown>).url === "string")
        .map(a => a.url)
    : [];

  await channel.send({
    ...createComponentsV2TextMessage({
      title: formatLogEventTitle(event.eventName, loc),
      lines: formatLogEventLines(event, loc),
      accentColor: getEventAccentColor(event.eventName),
      ...(mediaUrls.length > 0 ? { mediaUrls } : {})
    }),
    allowedMentions: { parse: [] }
  });
}

export async function findMarkedLogChannel(guild: Guild) {
  const channels = await guild.channels.fetch();

  return (
    channels.find(
      (channel): channel is TextChannel =>
        channel?.type === ChannelType.GuildText &&
        hasLogChannelMarker(channel.topic)
    ) ?? null
  );
}

export function formatLogEventTitle(eventName: string, loc: Locale) {
  return loc.logEventTitle({ eventName });
}

export function formatLogEventLines(event: NormalizedEvent, loc: Locale) {
  return [
    event.actorId ? loc.logActor({ actorId: event.actorId }) : loc.logActorUnknown,
    formatChannelLine(event, loc),
    event.messageId ? loc.logMessageId({ messageId: event.messageId }) : null,
    `${loc.logEventTimeLabel}: ${discordTimestamp(event.eventTimestamp)}`,
    formatLogPayload(event.payload, loc)
  ].filter((line): line is string => line !== null);
}

function formatChannelLine(event: NormalizedEvent, loc: Locale) {
  const tempVoiceChannelName =
    typeof event.payload.tempVoiceChannelName === "string"
      ? event.payload.tempVoiceChannelName
      : null;

  if (event.eventName.startsWith("voice.temp.") && tempVoiceChannelName) {
    return loc.logChannelNamed({ name: tempVoiceChannelName });
  }

  return event.channelId
    ? loc.logChannel({ channelId: event.channelId })
    : loc.logChannelUnknown;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function formatPayloadValue(v: unknown): string {
  if (v === null || v === undefined) return "–";
  if (typeof v === "string") return v || "–";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "–";
}

function formatLogPayload(payload: NormalizedEvent["payload"], loc: Locale): string | null {
  const lines: string[] = [];

  // message.update — show before/after comparison
  if ("oldContent" in payload) {
    const before = typeof payload.oldContent === "string" ? payload.oldContent : null;
    const after  = typeof payload.newContent === "string" ? payload.newContent  : null;
    if (before !== null || after !== null) {
      lines.push(loc.logContentChange({
        before: truncateForDiscord(before ?? "–", 400),
        after:  truncateForDiscord(after  ?? "–", 400)
      }));
    }
    return lines.length > 0 ? lines.join("\n") : null;
  }

  // message.create / message.delete — show content if present (empty string → "(empty)")
  const content = typeof payload.content === "string" ? payload.content : null;
  if (content !== null) {
    lines.push(loc.logContent({ content: truncateForDiscord(content || "(empty)", 800) }));
    return lines.length > 0 ? lines.join("\n") : null;
  }

  // Other events — recruitment fields, role/channel changes, etc.
  if (typeof payload.creatorId === "string") {
    lines.push(loc.logRecruitmentCreator({ id: payload.creatorId }));
  }

  if (typeof payload.genre === "string") {
    lines.push(loc.logRecruitmentGenre({ genre: payload.genre }));
  }

  if (typeof payload.reason === "string" && payload.reason.length > 0) {
    lines.push(loc.logReason({ reason: payload.reason }));
  }

  const changes = payload.changes;
  if (isObj(changes)) {
    for (const [field, change] of Object.entries(changes)) {
      if (!isObj(change)) continue;
      const label = loc.logFieldLabel(field);
      if (!label) continue;
      lines.push(loc.logChangeField({
        label,
        before: formatPayloadValue(change.before),
        after: formatPayloadValue(change.after),
      }));
    }
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

function truncateForDiscord(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}
```

- [ ] **Step 4.4: Run tests to confirm they pass**

```
pnpm --filter @discord-bot/bot test
```

Expected: all tests pass (including the 2 new ones)

- [ ] **Step 4.5: Commit**

```bash
git add apps/bot/src/discord/log-channel.ts apps/bot/src/discord/log-channel.test.ts
git commit -m "feat(bot): show message content and attachments in log channel entries"
```

---

## Final check

- [ ] **Step 5.1: Full build check across all packages**

```
pnpm build
```

Expected: exit 0, no TypeScript errors in any package

---

## Self-Review

**Spec coverage:**
- ✅ Attachments captured in `normalizeMessageEvent` (Task 3)
- ✅ MediaGallery inline display in log messages (Task 2 + Task 4)
- ✅ `message.update` shows before/after content (Task 4)
- ✅ `message.create` with empty text shows "(empty)" (Task 4)
- ✅ `message.delete` shows content when available; null = no line shown (Task 4 — handled by `content !== null` guard)
- ✅ Attachment URLs capped at 10 for MediaGallery (Task 2)
- ✅ Locale keys added for both EN and JA (Task 1)

**Placeholder scan:** None found.

**Type consistency:**
- `mediaUrls: readonly string[]` defined in Task 2 interface, used in Task 4 call site ✅
- `logContentChange` defined in Task 1, used in Task 4 `formatLogPayload` ✅
- `attachmentPayload` returns `Array<{ url: string; name: string; contentType: string | null }>`, only `.url` is used in Task 4 extraction ✅
