# Temp VC

Phase4 adds the first Temp VC foundation.

## Behavior

- A configured creation voice channel acts as the trigger.
- When a non-bot member joins that creation VC, the bot creates a generated
  voice channel named `🎮 {username}`.
- The member is moved into the generated voice channel.
- Generated Temp VCs are tracked in `temp_voice_channels`.
- Call state is tracked in `call_sessions` and `call_session_members`.
- When a member leaves a Temp VC, membership is updated.
- If the owner leaves, the next active member is recalculated from
  `joined_at` / `join_order`.
- If the Temp VC becomes empty, it is scheduled for deletion after 5 seconds.

## Deferred

Not included in Phase4:

- Control text channel creation.
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

The creation channel must be configured before the bot can create Temp VCs.

## Configure A Test Guild

Run migrations first:

```bash
pnpm db:migrate
```

Then set the creation VC for a guild. Replace the IDs before running:

```bash
docker compose exec postgres psql -U discord_bot -d discord_bot -c "update guild_configs set temp_voice_create_channel_id = '<creation voice channel id>', temp_voice_category_id = '<category id or null>' from guilds where guild_configs.guild_ref_id = guilds.id and guilds.guild_id = '<guild id>';"
```

If no category is needed, use SQL `null`:

```bash
docker compose exec postgres psql -U discord_bot -d discord_bot -c "update guild_configs set temp_voice_create_channel_id = '<creation voice channel id>', temp_voice_category_id = null from guilds where guild_configs.guild_ref_id = guilds.id and guilds.guild_id = '<guild id>';"
```

The guild must already have `guilds` and `guild_configs` rows. Running `/setup`
in the guild creates those rows.

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

1. Run `/setup` in the test guild if the guild is not initialized.
2. Apply DB migrations.
3. Configure `temp_voice_create_channel_id`.
4. Start the bot.
5. Join the configured creation VC.
6. Confirm a `🎮 {username}` voice channel is created.
7. Confirm you are moved into the generated VC.
8. Leave the generated VC.
9. Confirm it is deleted after about 5 seconds.

## Verification Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:migrate
docker compose --profile app build bot
```
