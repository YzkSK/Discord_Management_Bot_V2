# TTS

Phase6 adds the first VOICEVOX TTS foundation.

## Commands

### `/setup tts channel:#channel`

Stores a persistent text channel for TTS.

Messages in this channel are read while the bot is connected to a voice channel.

### `/join`

Joins the voice channel of the user who ran the command.

The text channel where `/join` was used is added as a temporary TTS source.

If the bot is already connected to a different voice channel, it does not move.

### `/force-join`

Moves TTS to the voice channel of the user who ran the command, but only after a confirmation button is pressed.

Required access:

- Discord server owner, or
- Dashboard `admin` grant for the user, or
- Dashboard `admin` grant for one of the user's roles.

Dashboard `viewer` is not enough.

### `/leave`

Disconnects the bot from voice and clears temporary TTS source channels.

The persistent `/setup tts` channel is not removed.

### `/speaker set speaker_id:<id>`

Sets your personal VOICEVOX speaker for TTS.

This setting is used before the server default speaker.

### `/speaker server-default speaker_id:<id>`

Sets the server default VOICEVOX speaker for TTS.

Required access:

- Discord server owner, or
- Dashboard `admin` grant for the user, or
- Dashboard `admin` grant for one of the user's roles.

Dashboard `viewer` is not enough.

## Dashboard Settings

The Dashboard Settings page can manage TTS settings for a loaded guild.

Dashboard `viewer` can review TTS settings. Dashboard `admin` or the Discord server owner can update them.

Managed settings:

- TTS text channel ID
- Server default VOICEVOX speaker ID
- User-specific VOICEVOX speaker overrides
- Guild and user dictionary entries

Dictionary entries support:

- `guild` scope for server-wide replacements
- `user` scope for one user's replacements
- priority
- enabled/disabled state

## Message Rules

TTS reads messages only when the bot is connected to voice.

Messages are read when posted in either:

- the temporary text channel added by `/join` or `/force-join`, or
- the persistent channel set by `/setup tts`.

Skipped messages:

- bot-authored messages,
- empty messages,
- slash-command-like messages starting with `/`,
- user-muted messages starting with `//`,
- text beyond the current 120 character limit.

## Logs

TTS writes dedicated logs for voice-session and read-aloud behavior.
Message content is not duplicated in TTS logs; message events are linked by IDs.

- `tts.session.started`: the bot joined or moved into a voice channel for TTS.
- `tts.session.stopped`: the bot left voice by `/leave` or automatic empty-channel disconnect.
- `tts.message.spoken`: a message was read successfully.
- `tts.message.skipped`: a readable-channel message was skipped because it was empty, command-like, user-muted, or too long.
- `system.voicevox.error`: VOICEVOX synthesis or playback failed.

## Queue And Retry

Accepted TTS messages are processed through a local guild-scoped queue.

Messages from the same guild are synthesized and played in order. Messages from different guilds can be processed independently.

VOICEVOX `audio_query` and `synthesis` retry transient failures with backoff before writing `system.voicevox.error`.

Current defaults:

- maximum attempts: 3
- base backoff: 250ms
- backoff sequence: 250ms, 500ms

This is a local in-process queue foundation. Redis-backed durable queueing can replace the queue interface later if needed.

## Latency Tuning

`VOICEVOX_SPEAKER_ID` is the fallback VOICEVOX speaker used by TTS.

Speaker priority:

1. User speaker set by `/speaker set`.
2. Server default speaker set by `/speaker server-default`.
3. `VOICEVOX_SPEAKER_ID`.

The default is `2` because it was faster than the previous default in local CPU Docker checks.

```env
VOICEVOX_SPEAKER_ID=2
VOICEVOX_CPU_NUM_THREADS=6
VOICEVOX_CPU_LIMIT=6
VOICEVOX_MEMORY_LIMIT=3g
```

Most startup delay comes from VOICEVOX CPU synthesis. In local checks, `audio_query` was usually under 100ms, while `synthesis` was around 1.7-2.1 seconds for a short phrase.

The Docker Compose default gives the VOICEVOX container 6 CPUs and sets `VV_CPU_NUM_THREADS` to 6.
If the host is weaker, lower both `VOICEVOX_CPU_NUM_THREADS` and `VOICEVOX_CPU_LIMIT` together.

For lower latency:

- keep messages short,
- prefer a faster speaker ID,
- allocate more CPU to Docker Desktop if possible,
- use a GPU-capable VOICEVOX setup when available.

## Docker Verification

Start the app stack:

```bash
docker compose --profile app up -d --build bot voicevox
```

Register slash commands after rebuilding:

```bash
docker compose --profile app exec bot node apps/bot/dist/register-commands.js
```

Watch bot logs:

```bash
docker compose --profile app logs -f bot
```

Manual check:

1. Join a Discord voice channel.
2. Run `/setup tts channel:#your-text-channel`.
3. Run `/join` in a text channel.
4. Optionally run `/speaker set speaker_id:<id>`.
5. Send a normal message in the `/join` text channel.
6. Send a normal message in the configured `/setup tts` channel.
7. Confirm both are read while the bot is connected.
8. Run `/leave` and confirm reading stops.

For forced movement:

1. Connect the bot with `/join`.
2. Move yourself to another voice channel.
3. Run `/join` and confirm the bot does not move.
4. Run `/force-join`.
5. Press `Move`.
6. Confirm the bot moves only after the confirmation.
