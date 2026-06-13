import { getGuildDefaultTtsSpeaker, type DbClient } from "@discord-bot/db";
import type { Client } from "discord.js";

import {
  installVoiceStateHandlers,
  type VoiceStateTransition,
  type VoiceStateTransitionContext
} from "./voice-state.js";
import type { TtsSessionManager } from "./tts-session.js";
import { LocalTtsPlaybackQueue, type TtsPlaybackQueue } from "./tts-queue.js";
import type { VoicevoxClient } from "./voicevox.js";

const ANNOUNCE_TEXT = {
  join: (name: string) => `${name}が参加しました`,
  leave: (name: string) => `${name}が退出しました`,
} as const;

export interface ResolveAnnounceActionInput {
  connectedVoiceChannelId: string | null;
  oldChannelId: string | null;
  newChannelId: string | null;
}

export function resolveAnnounceAction(
  input: ResolveAnnounceActionInput
): "join" | "leave" | null {
  if (!input.connectedVoiceChannelId) return null;
  if (input.newChannelId === input.connectedVoiceChannelId) return "join";
  if (input.oldChannelId === input.connectedVoiceChannelId) return "leave";
  return null;
}

export interface InstallTtsAnnounceHandlerOptions {
  db: DbClient;
  fallbackSpeakerId: number;
  ttsQueue?: TtsPlaybackQueue;
  ttsSessionManager: TtsSessionManager;
  voicevox: VoicevoxClient;
}

export function installTtsAnnounceHandler(
  client: Client,
  options: InstallTtsAnnounceHandlerOptions
) {
  const ttsQueue = options.ttsQueue ?? new LocalTtsPlaybackQueue();

  installVoiceStateHandlers(client, {
    onTransition(transition, context) {
      return handleAnnounceTransition({ ...options, ttsQueue }, transition, context);
    }
  });
}

async function fetchAnnounceSpeakerId(
  db: DbClient,
  guildId: string,
  fallbackSpeakerId: number
): Promise<number> {
  const guildDefault = await getGuildDefaultTtsSpeaker(db, guildId).catch(
    (error: unknown) => {
      console.warn("tts announce failed to fetch guild speaker", { guildId, error });
      return null;
    }
  );
  return guildDefault?.speakerId ?? fallbackSpeakerId;
}

async function handleAnnounceTransition(
  options: InstallTtsAnnounceHandlerOptions & { ttsQueue: TtsPlaybackQueue },
  transition: VoiceStateTransition,
  context: VoiceStateTransitionContext
) {
  const connectedVoiceChannelId = options.ttsSessionManager.getVoiceChannelId(
    transition.guildId
  );

  const action = resolveAnnounceAction({
    connectedVoiceChannelId,
    oldChannelId: transition.oldChannelId,
    newChannelId: transition.newChannelId
  });

  if (!action) return;

  const displayName =
    action === "join"
      ? (context.newState.member?.displayName ?? transition.userId)
      : (context.oldState.member?.displayName ?? transition.userId);

  const text = ANNOUNCE_TEXT[action](displayName);

  const speakerId = await fetchAnnounceSpeakerId(
    options.db,
    transition.guildId,
    options.fallbackSpeakerId
  );

  await options.ttsQueue.enqueue({ guildId: transition.guildId }, async () => {
    const audio = await options.voicevox.synthesize(text, speakerId).catch(
      (error: unknown) => {
        console.warn("tts announce synthesis failed", { guildId: transition.guildId, error });
        return null;
      }
    );

    if (!audio) return;

    await options.ttsSessionManager.play(transition.guildId, audio).catch(
      (error: unknown) => {
        console.warn("tts announce playback failed", { guildId: transition.guildId, error });
      }
    );
  });
}
