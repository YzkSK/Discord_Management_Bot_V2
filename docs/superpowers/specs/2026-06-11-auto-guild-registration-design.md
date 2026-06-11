# Auto Guild Registration Design

**Date:** 2026-06-11
**Branch:** phase/14-ui-ux-redesign

## Problem

The dashboard's `/api/guilds` endpoint filters the guild list with `getKnownGuildIds`, which only returns guilds that exist in the `guilds` DB table. That table is populated only when `/setup` is run (via `ensureGuildSetup`). As a result, users cannot access the dashboard for any guild where `/setup` has never been run.

## Goal

Allow users to view the dashboard for any guild the bot is installed in, without having to run `/setup` first. The `/setup` command continues to exist for configuring specific features (log channel, recruitment channel, etc.).

## Solution: Auto-register guilds on bot startup and join

### New file: `apps/bot/src/discord/guild-registration.ts`

Exports a single function `installGuildRegistrationHandlers(client, { db })` that registers two Discord.js event listeners:

**`Events.ClientReady`**
- Iterate over `readyClient.guilds.cache`
- Call `ensureGuildSetup(db, { guildId, name })` for each guild
- Errors are caught per-guild, logged with `console.warn`, and do not interrupt processing of other guilds

**`Events.GuildCreate`**
- Called when the bot joins a new guild
- Call `ensureGuildSetup(db, { guildId: guild.id, name: guild.name })`
- Errors are caught and logged with `console.warn`

### Change: `apps/bot/src/runtime.ts`

Call `installGuildRegistrationHandlers(discordClient, { db: dbConnection.db })` immediately after `installDiscordLifecycleLogging`, before other handlers.

## What does NOT change

- Dashboard API routes (`/api/guilds`, `getKnownGuildIds`)
- `/setup` command behavior
- DB schema
- `ensureGuildSetup` function (already idempotent upsert)

## Error handling

Registration failures are soft: one guild failing does not block others. The bot continues operating normally if registration fails.

## Testing

- Unit test for `ClientReady` handler: verifies `ensureGuildSetup` is called for each guild in cache
- Unit test for `GuildCreate` handler: verifies `ensureGuildSetup` is called with the joined guild
- Unit test for error isolation: one failing guild does not throw; others are still processed
