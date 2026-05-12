# Recruitment

Phase5 adds the first Recruitment foundation.

## Behavior

- A marked recruitment text channel is used as the posting destination.
- `/recruitment create` creates a Components V2 recruitment post.
- Recruitment posts include genre, capacity, content, optional VC, and
  auto-close.
- Users can use Join and Leave buttons.
- The creator or a server manager can close the recruitment.
- Status values are `open`, `full`, and `closed`.
- When auto-close is enabled, reaching capacity closes the recruitment.
- When an auto-closed recruitment drops below capacity, it can reopen.

## Database

Phase5 adds:

- `recruitments`
- `recruitment_participants`

`recruitments` stores the Discord guild/channel/message ids, creator id, genre,
capacity, content, optional VC id, auto-close flag, status, and close metadata.

`recruitment_participants` tracks one row per recruitment/user. Leaving sets
`left_at`; joining again clears it.

## Configure A Test Guild

Run migrations first:

```bash
pnpm db:migrate
```

Then register slash commands:

```bash
pnpm --filter @discord-bot/bot commands:register
```

Then mark the recruitment posting channel in Discord:

```text
/setup recruitment channel:<text channel>
```

This command stores the setup without a database column by appending this marker
to the channel topic:

```text
[discord-management-bot:recruitment]
```

There is no standalone guild registration command.

## Create A Recruitment

```text
/recruitment create genre:<genre> capacity:<number> content:<text> vc:<optional voice channel> auto-close:<optional boolean>
```

The created post is sent to the marked recruitment channel.

## Bot Permissions

The bot needs permissions that allow it to:

- View channels.
- Send messages.
- Read message history.
- Manage channels.

`Manage channels` is needed because `/setup recruitment` writes the marker to
the channel topic.

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
3. Run `/setup recruitment`.
4. Run `/recruitment create`.
5. Confirm a Components V2 recruitment post appears.
6. Press Join and confirm the participant count updates.
7. Press Leave and confirm the participant count updates.
8. Fill the recruitment to capacity and confirm status behavior.
9. Close as creator or server manager.
10. Confirm non-creators without server management cannot close it.

## Verification Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:migrate
docker compose --profile app build bot
```
