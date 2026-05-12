# Temp VC

Phase4 adds the first Temp VC foundation.

## Behavior

- A configured creation voice channel acts as the trigger.
- When a non-bot member joins that creation VC, the bot creates a generated
  voice channel named `U+1F3AE {username}`.
- The member is moved into the generated voice channel.
- A control text channel named `control-U+1F3AE {username}` is created next to
  the generated voice channel.
- The control text channel is visible to the Temp VC owner and hidden from
  everyone else.
- The control text channel posts its initial owner/channel summary with
  Discord Components V2.
- Generated Temp VCs are tracked in `temp_voice_channels`.
- Call state is tracked in `call_sessions` and `call_session_members`.
- Temp VC creation is logged as one `voice.temp.created` event. The internal
  channel creation and member move events are suppressed from generic logs.
- When a member leaves a Temp VC, membership is updated.
- If the owner leaves, the next active member is recalculated from
  `joined_at` / `join_order`.
- If the Temp VC becomes empty, it is scheduled for deletion after 5 seconds.
- When the generated voice channel is deleted, the control text channel is also
  deleted.
- Temp VC deletion is logged as one `voice.temp.deleted` event. The internal
  channel delete events are suppressed from generic logs.

## Deferred

Not included in Phase4:

- Button controls.
- Rename sync.
- Lock/unlock, hide/show, user limit, bitrate, and kick controls.
- Dashboard UI for Temp VC setup.

## Database

Phase4 adds:

- `call_sessions`
- `call_session_members`
- `temp_voice_channels`
- `guild_configs.temp_voice_create_channel_id`
- `guild_configs.temp_voice_category_id`

The creation channel must be configured with `/setup temp-vc` before the bot can
create Temp VCs.

## Configure A Test Guild

Run migrations first:

```bash
pnpm db:migrate
```

Then register slash commands if needed:

```bash
pnpm --filter @discord-bot/bot commands:register
```

Then run the Temp VC setup command in Discord:

```text
/setup temp-vc creation-channel:<voice channel> category:<optional category>
```

This command creates or updates the required `guilds` and `guild_configs` rows.
There is no separate guild registration setup command.

## Bot Permissions

The bot needs permissions that allow it to:

- View channels.
- Manage channels.
- Move members.
- Connect to voice channels.

## Docker Verification

Build the bot image:

```bash
docker compose --profile app build bot
```

Start the app stack:

```bash
docker compose --profile app up -d --build
```

Watch bot logs:

```bash
docker compose --profile app logs -f bot
```

## Manual Check

1. Apply DB migrations.
2. Register slash commands.
3. Run `/setup temp-vc`.
4. Start the bot.
5. Join the configured creation VC.
6. Confirm a `U+1F3AE {username}` voice channel is created.
7. Confirm you are moved into the generated VC.
8. Confirm the private control text channel is created with a Components V2
   message.
9. Leave the generated VC.
10. Confirm both generated channels are deleted after about 5 seconds.

## Verification Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:migrate
docker compose --profile app build bot
```
