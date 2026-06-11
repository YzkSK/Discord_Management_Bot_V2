import { getGuildDefaultTtsSpeaker, type DbClient } from "@discord-bot/db";
import type { Client } from "discord.js";

import {
  installVoiceStateHandlers,
  type VoiceStateTransition,
  type VoiceStateTransitionContext
} from "./voice-state.js";
import type { TtsSessionManager } from "./tts-session.js";
import type { VoicevoxClient } from "./voicevox.js";

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
  ttsSessionManager: TtsSessionManager;
  voicevox: VoicevoxClient;
}

export function installTtsAnnounceHandler(
  client: Client,
  options: InstallTtsAnnounceHandlerOptions
) {
  installVoiceStateHandlers(client, {
    onTransition(transition, context) {
      return handleAnnounceTransition(options, transition, context);
    }
  });
}

async function handleAnnounceTransition(
  options: InstallTtsAnnounceHandlerOptions,
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

  const text =
    action === "join"
      ? `${displayName}が参加しました`
      : `${displayName}が退出しました`;

  const guildDefault = await getGuildDefaultTtsSpeaker(
    options.db,
    transition.guildId
  ).catch(() => null);

  const speakerId = guildDefault?.speakerId ?? options.fallbackSpeakerId;

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
}
