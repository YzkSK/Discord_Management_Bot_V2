# Phase12 Dashboard Feature Pages

Phase12 completes the first pass of dedicated Dashboard feature pages and Logs
UX verification. The goal is to make bot behavior checks possible from the
Dashboard without jumping between raw API responses.

## Scope

Implemented in Phase12:

- `/voice`
  - Active voice sessions.
  - Recent voice sessions.
  - Temp VC channel state.
  - Voice status setup shortcuts.
- `/recruitment`
  - Recruitment post status.
  - Open / full / closed counts.
  - Participant counts and related IDs.
- `/tts`
  - TTS configured status.
  - TTS text channel.
  - Guild default speaker.
  - User speaker overrides.
  - Dictionary counts and visible entries.
- `/health`
  - Overall system status.
  - Database, Redis, and VOICEVOX dependency checks.
  - Latency and error messages.
  - Manual refresh.
- `/logs`
  - Category tabs for major event domains.
  - Realtime status display.
  - Human View summaries.
  - Raw JSON visibility limited to `owner` and `admin`.

## Page Verification

Start the app stack:

```bash
docker compose --profile app up -d --build bot dashboard
```

Open the Dashboard:

```text
http://localhost:3000
```

Use a Discord server owner account for the first pass, then repeat selected
checks with `admin` and `viewer` grants.

### Voice

Open `/voice`.

- Confirm active calls appear when users are in normal voice channels.
- Confirm recent calls remain visible after a call ends.
- Confirm Temp VC rows appear when a generated Temp VC exists.
- Confirm setup shortcut text points to `/setup voice-status` and
  `/setup temp-vc`.

### Recruitment

Open `/recruitment`.

- Confirm recruitment posts appear after using `/recruitment create`.
- Confirm open / full / closed metrics match the visible rows.
- Confirm participant counts update after join and leave interactions.
- Confirm the logs shortcut can be used to inspect recruitment events.

### TTS

Open `/tts`.

- Confirm configured status changes after `/setup tts`.
- Confirm the configured text channel id is visible.
- Confirm guild default speaker is visible after an admin or owner sets it.
- Confirm user speaker overrides are visible after `/speaker user`.
- Confirm dictionary entry totals match the Settings TTS dictionary state.

### System Health

Open `/health`.

- Confirm the overall status is `OK` when PostgreSQL, Redis, and VOICEVOX are
  reachable.
- Confirm each dependency row shows status and latency.
- Stop a dependency in a local test only when safe, then refresh and confirm the
  failing service is marked as an error.
- Restart the dependency and confirm the page returns to `OK`.

### Logs

Open `/logs`.

- Confirm category tabs are visible:
  - All
  - Messages
  - Voice
  - Temp VC
  - Recruitment
  - Audit
  - TTS
  - System
- Select each category and confirm the event filter changes.
- Confirm the realtime status shows connecting, live, offline, or error states.
- Confirm Human View summaries are visible for log rows.
- Confirm Raw JSON can be opened by `owner` and `admin`.
- Confirm Raw JSON is hidden for `viewer`.

## Access Verification

Dashboard access rules for Phase12:

- `owner`
  - Discord server owner.
  - Can open all Phase12 pages.
  - Can view Raw JSON in `/logs`.
- `admin`
  - Granted through Dashboard access management.
  - Can open all Phase12 pages.
  - Can view Raw JSON in `/logs`.
- `viewer`
  - Granted through Dashboard access management.
  - Can open all Phase12 pages.
  - Cannot view Raw JSON in `/logs`; Human View remains available.

Recommended checks:

1. Sign in as the server owner and verify every page.
2. Add an `admin` grant in `/settings`, sign in as that user, and verify Raw
   JSON is visible.
3. Add a `viewer` grant in `/settings`, sign in as that user, and verify Raw
   JSON is hidden.

## Verification Commands

Run these from the repository root:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose --profile app up -d --build bot dashboard
docker compose --profile app ps bot dashboard
```

For database-backed page checks, confirm migrations are applied:

```bash
pnpm db:migrate
```

## Completion Criteria

Phase12 is complete when:

- Voice, Recruitment, TTS, Health, and Logs pages are reachable from the
  Dashboard navigation.
- Each page can load data for the selected guild.
- Logs category tabs cover message, voice, Temp VC, recruitment, audit, TTS, and
  system event domains.
- Logs realtime status is visible.
- Logs Raw JSON is limited to `owner` and `admin`.
- `viewer` can still inspect Human View summaries.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.
- Docker app containers rebuild and start successfully.
