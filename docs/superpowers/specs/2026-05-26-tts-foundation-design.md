# TTS Foundation Design

## Goal

Phase6 adds the first TTS foundation: the bot can join a voice channel, read messages from selected text channels using VOICEVOX, and leave cleanly.

## Command Behavior

### `/join`

- The user must be in a voice channel.
- If the bot is not connected in the guild, it joins the user's current voice channel.
- If the bot is already connected to the same voice channel, the text channel where `/join` was used is added as a temporary TTS source.
- If the bot is connected to a different voice channel, it does not move.
- The response tells the user that a Dashboard `admin` or `owner` can use `/force-join` if the bot must move.

### `/force-join`

- The user must be in a voice channel.
- The user must have Dashboard `admin` or `owner` access.
- Dashboard access is resolved in the bot using the same model as the Dashboard:
  - Guild owner is `owner`.
  - `dashboard_access_grants` user or role grant with `admin` is `admin`.
  - `viewer` is not enough.
- If the bot is not connected, it joins the user's voice channel.
- If the bot is already connected to a different voice channel, it sends a Components V2 confirmation prompt.
- Only the `/force-join` user can confirm.
- The bot moves only after confirmation.
- After joining or moving, the command text channel is added as a temporary TTS source.

### `/leave`

- Disconnects the bot from the guild voice connection.
- Clears temporary TTS source channels created by `/join` or `/force-join`.
- Does not delete the persistent `/setup tts` channel.

### `/setup tts channel:#channel`

- Stores a persistent TTS text channel for the guild.
- The persistent channel is read whenever the bot is connected to voice in that guild.
- The persistent channel and temporary channel can both be active.
- If both point to the same channel, messages are read once.

## Message Reading Rules

- Read only while the bot is connected to voice in the guild.
- Read messages posted in either:
  - the temporary source channel for the active TTS session, or
  - the persistent source channel stored by `/setup tts`.
- Skip bot-authored messages.
- Skip empty messages.
- Skip command-like messages starting with `/`.
- Truncate or reject overly long text before sending it to VOICEVOX.

## VOICEVOX Flow

- Use `VOICEVOX_URL` from config.
- Generate audio through:
  - `POST /audio_query`
  - `POST /synthesis`
- Play the generated audio through the active Discord voice connection.
- VOICEVOX errors must not crash the bot.
- VOICEVOX failures are logged as `system.voicevox.error`.

## Scope

Included:

- `/join`
- `/force-join`
- `/leave`
- `/setup tts`
- Dashboard `admin` or higher authorization for `/force-join`
- VOICEVOX client
- Discord voice connection and playback
- Message-to-speech filtering
- Tests for command policy, authorization, and text filtering

Not included:

- Per-user dictionary.
- Speaker selection UI.
- Multi-VC simultaneous TTS in one guild.
- Dashboard TTS settings UI.
- Advanced queue controls.

## Open Implementation Notes

- The implementation should use `@discordjs/voice`.
- The bot package will need voice dependencies.
- A small in-memory session manager is acceptable for active voice connections and temporary text channels.
- Persistent channel configuration belongs in `guild_configs`.
