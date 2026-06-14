# Spec: Message Log — Attachment Display & Content Inclusion

**Date:** 2026-06-15  
**Branch:** fix/voice-session-cleanup (or new branch)  
**Scope:** Bot message log improvements — show image/video attachments inline and fix content display for all message event types

---

## Problem

1. **Attachments not shown**: When a message with images or videos is created/updated/deleted, the log channel entry contains no reference to those attachments. Users cannot see what media was attached.

2. **Content gaps**:
   - `message.update` — payload has `oldContent`/`newContent` but `formatLogPayload` only reads `payload.content` (new value), so the before/after comparison is never shown.
   - `message.delete` — content is often `null` because Discord provides a `PartialMessage`; no content shown even when the original text was short enough to be cached.
   - `message.create` with attachments only — `content` is empty string (falsy), so `if (content)` skips display entirely.

---

## Solution Overview (Approach A)

Four files change:

| File | Change |
|------|--------|
| `packages/discord-core/src/adapters/message.ts` | Add `attachments` array to every message event payload |
| `apps/bot/src/discord/components-v2.ts` | Accept optional `mediaUrls` and append a `MediaGallery` component |
| `apps/bot/src/discord/log-channel.ts` | Extract attachment URLs and pass to message builder; fix `formatLogPayload` for update/delete content |
| `packages/shared/src/locale.ts` | Add `logContentChange` locale key |

---

## Detailed Design

### 1. Attachment Capture (`packages/discord-core/src/adapters/message.ts`)

Add a helper that extracts image/video attachments from a Discord message:

```ts
function attachmentPayload(message: AnyMessage) {
  if (!("attachments" in message)) return [];
  return [...message.attachments.values()]
    .filter(a => a.contentType?.startsWith("image/") || a.contentType?.startsWith("video/"))
    .map(a => ({ url: a.url, name: a.name, contentType: a.contentType ?? null }));
}
```

Add `attachments: attachmentPayload(message)` to the `payload` object inside `normalizeMessageEvent`. This covers all three events (create/update/delete) because they all call this function.

**Edge case:** `PartialMessage` on delete may have an empty `attachments` collection — this is fine, the array will just be empty and no media gallery is shown.

---

### 2. MediaGallery Component (`apps/bot/src/discord/components-v2.ts`)

Extend `ComponentsV2TextMessageInput`:

```ts
export interface ComponentsV2TextMessageInput {
  title: string;
  lines?: readonly string[];
  accentColor?: number;
  privateResponse?: boolean;
  mediaUrls?: readonly string[];   // NEW
}
```

In `createComponentsV2TextMessage`, after building the text components, push a MediaGallery when `mediaUrls` is non-empty:

```ts
if (input.mediaUrls && input.mediaUrls.length > 0) {
  const capped = input.mediaUrls.slice(0, 10); // Discord limit
  (container.components as unknown[]).push({
    type: 12, // ComponentType.MediaGallery
    items: capped.map(url => ({ media: { url } }))
  });
}
```

Type 12 is the numeric value for `MediaGallery` in Discord's API. We use the raw number because `ComponentType.MediaGallery` may not yet be typed in `discord-api-types@0.38.47`, while the runtime in discord.js 14.26.4 supports it (confirmed from source).

---

### 3. Log Channel Updates (`apps/bot/src/discord/log-channel.ts`)

#### 3a. Pass media URLs to message builder

In `sendEventToConfiguredLogChannel`, extract attachment URLs before calling `createComponentsV2TextMessage`:

```ts
const rawAttachments = event.payload.attachments;
const mediaUrls = Array.isArray(rawAttachments)
  ? rawAttachments
      .filter((a): a is { url: string } => typeof a === "object" && a !== null && typeof (a as Record<string, unknown>).url === "string")
      .map(a => a.url)
  : [];

await channel.send({
  ...createComponentsV2TextMessage({
    title: formatLogEventTitle(event.eventName, loc),
    lines: formatLogEventLines(event, loc),
    accentColor: getEventAccentColor(event.eventName),
    mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined
  }),
  allowedMentions: { parse: [] }
});
```

#### 3b. Fix `formatLogPayload` content display

Current code:
```ts
const content = typeof payload.content === "string" ? payload.content : null;
if (content) return loc.logContent({ content: truncateForDiscord(content, 800) });
```

Replace with logic that handles all three cases:

```ts
// message.update — show before/after
if ("oldContent" in payload || "newContent" in payload) {
  const before = typeof payload.oldContent === "string" ? payload.oldContent : null;
  const after  = typeof payload.newContent === "string" ? payload.newContent  : null;
  if (before !== null || after !== null) {
    lines.push(loc.logContentChange({
      before: truncateForDiscord(before ?? "–", 400),
      after:  truncateForDiscord(after  ?? "–", 400)
    }));
  }
}

// message.create / message.delete — show content if present (including empty string)
const content = typeof payload.content === "string" ? payload.content : null;
if (content !== null) {
  lines.push(loc.logContent({ content: truncateForDiscord(content || "(empty)", 800) }));
}
```

Note: `formatLogPayload` currently returns early when content is found. After this change it switches to building a `lines` array and merging (consistent with the rest of the function).

---

### 4. Locale (`packages/shared/src/locale.ts`)

Add one key to the `Locale` type:

```ts
logContentChange: (vars: { before: string; after: string }) => string;
```

Implementations:

```ts
// EN
logContentChange: ({ before, after }) => `Content: ${before} → ${after}`,

// JA
logContentChange: ({ before, after }) => `内容: ${before} → ${after}`,
```

---

## Behaviour After Change

| Event | Content shown | Attachments shown |
|-------|--------------|-------------------|
| `message.create` (text) | ✅ "Content: hello" | ✅ inline MediaGallery |
| `message.create` (image only) | ✅ "Content: (empty)" | ✅ inline MediaGallery |
| `message.update` | ✅ "Content: old → new" | ✅ inline MediaGallery (new attachments) |
| `message.delete` (cached) | ✅ content shown | ✅ inline MediaGallery |
| `message.delete` (partial) | — (Discord limitation) | — (Discord limitation) |

---

## Out of Scope

- Logging bot messages (current skip behaviour unchanged)
- Re-hosting or caching attachments (Discord CDN URLs used directly)
- Sticker / embed display
