# Phase9 Dashboard RBAC And Settings

Phase9 expands Dashboard access management and Settings into a feature-oriented
operations surface.

## Scope

- Dashboard access grants can be managed from the Dashboard.
- Settings API returns feature-domain settings for Logs, Temp VC, Recruitment,
  and TTS.
- Settings page is organized by feature instead of a single mixed settings
  panel.
- English and Japanese Dashboard locale entries are maintained for the new
  Settings UI.

## Dashboard RBAC Management

Dashboard access has three effective roles:

- `owner`: the Discord server owner. This role is derived from Discord and is
  not stored as a Dashboard grant.
- `admin`: can read Dashboard data and edit Dashboard settings.
- `viewer`: can read Dashboard data only.

The server owner can manage explicit Dashboard grants from `/settings` in the
Dashboard Access section.

Grant targets can be:

- `user`: a Discord user id.
- `role`: a Discord role id.

Grant roles can be:

- `admin`
- `viewer`

When a user matches more than one grant, the highest role wins.

## RBAC API

The Dashboard Access API is owner-only:

- `GET /api/dashboard-access?guildId=<guild id>`
- `PATCH /api/dashboard-access`
- `DELETE /api/dashboard-access`

`PATCH` accepts:

```json
{
  "guildId": "123",
  "targetType": "role",
  "targetId": "456",
  "role": "admin"
}
```

`DELETE` accepts:

```json
{
  "guildId": "123",
  "targetType": "role",
  "targetId": "456"
}
```

## Settings API

`GET /api/settings?guildId=<guild id>` keeps the legacy top-level fields and
also returns feature-domain settings:

```json
{
  "guildId": "123",
  "guildName": "Example",
  "logMode": "full",
  "language": "en",
  "features": {
    "logs": {
      "logMode": "full",
      "language": "en"
    },
    "tempVc": {
      "createChannelId": "111",
      "categoryId": "222",
      "configured": true
    },
    "recruitment": {
      "channelMarker": "[discord-management-bot:recruitment]",
      "configured": false
    },
    "tts": {
      "textChannelId": "333",
      "configured": true
    }
  }
}
```

`PATCH /api/settings` still accepts the legacy Logs payload:

```json
{
  "guildId": "123",
  "logMode": "metadata_only",
  "language": "ja"
}
```

It also accepts feature-scoped payloads:

```json
{
  "guildId": "123",
  "section": "tempVc",
  "values": {
    "createChannelId": "111",
    "categoryId": "222"
  }
}
```

```json
{
  "guildId": "123",
  "section": "tts",
  "values": {
    "textChannelId": "333"
  }
}
```

Recruitment is read-only in Phase9 because recruitment setup is currently
tracked by a channel topic marker rather than a persisted `guild_configs`
column.

## Settings Page

The Settings page is organized into:

- Overview: guild id, guild name, access role, updated time, and feature status.
- Logs: log mode and Dashboard language.
- Temp VC: creation voice channel id and category id.
- TTS: configured TTS text channel id.
- Recruitment: current marker state, read-only in Phase9.
- Dashboard Access: owner-only access grants and the existing management role
  shortcut.

Save success and error messages are shown from the Settings page, and all new
labels are localized through `apps/dashboard/src/lib/locale.ts`.

## Verification

Run the Phase9 verification set before merging Phase9 into `main`:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose --profile app up -d --build dashboard
docker compose --profile app ps dashboard
```

Manual checks:

- Log in as the Discord server owner.
- Open `/settings` for a known guild.
- Confirm Overview shows feature status.
- Save Logs settings.
- Save Temp VC channel ids.
- Save TTS text channel id.
- Add, edit, and delete a user or role Dashboard access grant.
- Switch Dashboard language and confirm Settings labels update in English and
  Japanese.
