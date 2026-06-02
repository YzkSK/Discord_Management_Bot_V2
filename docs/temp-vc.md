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
- The control text channel posts its owner/channel summary and owner controls
  with Discord Components V2.
- Only the current Temp VC owner can use the control interactions.
- The control surface supports:
  - rename
  - lock / unlock
  - hide / show
  - user limit
  - bitrate
  - kick
- Generated Temp VCs are tracked in `temp_voice_channels`.
- Call state is tracked in `call_sessions` and `call_session_members`.
- Temp VC creation is logged as one `voice.temp.created` event. The internal
  channel creation and member move events are suppressed from generic logs.
  The log payload includes the stable `callSessionId`, `ownerId`, and readable
  channel names so it can be searched after the generated Discord channel is
  gone.
- When a member leaves a Temp VC, membership is updated.
- If the owner leaves, the next active member is recalculated from
  `joined_at` / `join_order`.
- When ownership changes, the private control channel permission is moved from
  the previous owner to the next owner.
- Temp VC ownership transfer is logged as `voice.temp.owner_transferred`.
- If the Temp VC becomes empty, it is scheduled for deletion after 5 seconds.
- When the generated voice channel is deleted, the control text channel is also
  deleted.
- Temp VC deletion is logged as one `voice.temp.deleted` event. The internal
  channel delete events are suppressed from generic logs.

## Deferred

Not included in Phase4:

- Rename sync.
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
- Send messages.
- Read message history.
- Connect to voice channels.
- View audit log, if Temp VC related generic channel changes should be enriched
  when they are not suppressed.

Temp VC controls also depend on `Manage Channels` because lock/unlock,
hide/show, rename, user limit, and bitrate all mutate generated channel
settings.

## Control Channel Verification

After a Temp VC is created, use the private control text channel:

1. Confirm the control message uses Components V2 and shows the owner and voice
   channel.
2. Press `Rename`, submit a new name, and confirm the generated voice channel is
   renamed.
3. Press `Lock` and confirm new users cannot connect.
4. Press `Unlock` and confirm connection is allowed again.
5. Press `Hide` and confirm the channel is hidden from everyone.
6. Press `Show` and confirm the channel is visible again.
7. Press `User limit`, submit a number from 0 to 99, and confirm the channel
   limit changes.
8. Press `Bitrate`, submit a kbps value from 8 to 384, and confirm the channel
   bitrate changes.
9. Select a member in the kick selector and confirm the selected member is
   disconnected only when they are currently in the Temp VC.
10. Have a non-owner try a control interaction and confirm it is rejected with a
    private response.

## Ownership Transfer Verification

Use at least three non-bot users when possible.

1. User A joins the configured creation VC and becomes the Temp VC owner.
2. User B joins the generated Temp VC.
3. User C joins the generated Temp VC after User B.
4. Confirm the control channel is visible to User A only.
5. Have User A leave the generated Temp VC.
6. Confirm User B becomes the next owner because they joined before User C.
7. Confirm the private control channel permission moves from User A to User B.
8. Confirm User B can use owner controls.
9. Confirm User C cannot use owner controls.
10. Confirm the log stream contains `voice.temp.owner_transferred`.

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
   control message.
9. Run the control channel verification steps above.
10. Run the ownership transfer verification steps above.
11. Leave the generated VC.
12. Confirm both generated channels are deleted after about 5 seconds.

## Verification Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:migrate
docker compose --profile app build bot
```
