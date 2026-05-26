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

## Message Rules

TTS reads messages only when the bot is connected to voice.

Messages are read when posted in either:

- the temporary text channel added by `/join` or `/force-join`, or
- the persistent channel set by `/setup tts`.

Skipped messages:

- bot-authored messages,
- empty messages,
- slash-command-like messages starting with `/`,
- text beyond the current 120 character limit.

## Latency Tuning

`VOICEVOX_SPEAKER_ID` controls the VOICEVOX speaker used by TTS.

The default is `2` because it was faster than the previous default in local CPU Docker checks.

```env
VOICEVOX_SPEAKER_ID=2
```

Most startup delay comes from VOICEVOX CPU synthesis. In local checks, `audio_query` was usually under 100ms, while `synthesis` was around 1.7-2.1 seconds for a short phrase.

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
4. Send a normal message in the `/join` text channel.
5. Send a normal message in the configured `/setup tts` channel.
6. Confirm both are read while the bot is connected.
7. Run `/leave` and confirm reading stops.

For forced movement:

1. Connect the bot with `/join`.
2. Move yourself to another voice channel.
3. Run `/join` and confirm the bot does not move.
4. Run `/force-join`.
5. Press `Move`.
6. Confirm the bot moves only after the confirmation.
