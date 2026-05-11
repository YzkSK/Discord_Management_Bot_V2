# Dashboard Access

Phase3 introduces the first Dashboard access model.

## Roles

- `viewer`: can read Dashboard data.
- `admin`: can change guild settings.
- `owner`: can manage Dashboard access.

Role checks are hierarchical. `owner` satisfies `admin` and `viewer`, and `admin`
satisfies `viewer`.

## Owner

`owner` is not granted through Dashboard access rows. A user is `owner` when
their Discord user id matches the Discord server owner's user id for that guild.

This means Dashboard access does not require `/setup` for the server owner.

## Admin And Viewer Grants

`admin` and `viewer` are explicit Dashboard grants for allowed Discord users or
Discord roles.

- `admin`: can view Dashboard data and change settings.
- `viewer`: can view Dashboard data only.

When a user matches multiple grants, the highest grant wins.

## Storage

Dashboard grants are stored in `dashboard_access_grants`.

- `guild_id` stores the Discord guild id as text.
- `target_type` is `user` or `role`.
- `target_id` stores the Discord user id or Discord role id.
- `role` is text with a database check for `viewer` and `admin`.
- Each `(guild_id, target_type, target_id)` pair is unique.

## Phase3 Boundaries

This issue defines the role model and persistence. Page/API enforcement is
handled separately in #49. Access-management UI is not part of this issue.

## Protected Routes

Dashboard pages redirect unauthenticated users to `/login`.

Dashboard APIs return JSON errors:

- `400` when a required `guildId` is missing.
- `401` when the request is not authenticated.
- `403` when the authenticated user cannot access the guild Dashboard.

For logs, `/api/logs` requires `guildId` and at least `viewer` access. The
Discord server owner is treated as `owner`; other users need a matching
`dashboard_access_grants` user or role grant.

For settings, `/api/settings` requires `guildId` and at least `viewer` access
for `GET`. Updating settings with `PATCH` requires `admin` or `owner`.

## Auth Setup

Discord Developer Portal setup required for local Dashboard auth:

- Add `http://localhost:3000/api/auth/callback/discord` to OAuth2 redirects.
- Keep `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `NEXTAUTH_SECRET`, and
  `NEXTAUTH_URL=http://localhost:3000` in `.env`.
- Invite the bot to the test guild so role-based grants can be checked.
- Use the Discord server owner account for the first owner-level Dashboard
  check.

The `/setup` command is not required for the server owner to access the
Dashboard. `/setup` still creates the `guilds` and `guild_configs` rows used by
the Phase3 settings page.

## Guild Settings

Phase3 exposes a minimal settings foundation:

- Page: `/settings`
- API: `GET /api/settings?guildId=<guild id>`
- API: `PATCH /api/settings`
- Supported field: `logMode`
- Allowed `logMode` values: `full`, `metadata_only`, `disabled`

This is a functional foundation, not final Dashboard UI polish.
