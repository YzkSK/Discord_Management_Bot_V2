import type { Client, GuildBasedChannel, VoiceBasedChannel } from "discord.js";

import type { DiscordLogWriter } from "./log-writer.js";
import { createTtsSessionStoppedEvent } from "./tts-logs.js";
import type { TtsSessionManager } from "./tts-session.js";
import {
  installVoiceStateHandlers,
  type VoiceStateTransition,
  type VoiceStateTransitionContext
} from "./voice-state.js";

interface VoiceMemberState {
  bot: boolean;
}

export interface ShouldAutoLeaveTtsChannelInput {
  connectedVoiceChannelId: string | null;
  oldChannelId: string | null;
  remainingMembers: VoiceMemberState[];
  transitionType: VoiceStateTransition["type"];
}

export interface InstallTtsAutoLeaveHandlerOptions {
  logWriter?: DiscordLogWriter;
  ttsSessionManager: TtsSessionManager;
}

export function installTtsAutoLeaveHandler(
  client: Client,
  options: InstallTtsAutoLeaveHandlerOptions
) {
  installVoiceStateHandlers(client, {
    onTransition(transition, context) {
      return handleTtsAutoLeaveTransition(
        options.logWriter,
        options.ttsSessionManager,
        transition,
        context
      );
    }
  });
}

export function shouldAutoLeaveTtsChannel(
  input: ShouldAutoLeaveTtsChannelInput
) {
  if (input.transitionType === "join") {
    return false;
  }

  if (
    !input.connectedVoiceChannelId ||
    input.oldChannelId !== input.connectedVoiceChannelId
  ) {
    return false;
  }

  return input.remainingMembers.every((member) => member.bot);
}

async function handleTtsAutoLeaveTransition(
  logWriter: DiscordLogWriter | undefined,
  ttsSessionManager: TtsSessionManager,
  transition: VoiceStateTransition,
  context: VoiceStateTransitionContext
) {
  const connectedVoiceChannelId = ttsSessionManager.getVoiceChannelId(
    transition.guildId
  );

  if (
    shouldAutoLeaveTtsChannel({
      connectedVoiceChannelId,
      oldChannelId: transition.oldChannelId,
      remainingMembers: getRemainingVoiceMembers(context, transition),
      transitionType: transition.type
    })
  ) {
    ttsSessionManager.leave(transition.guildId);
    await logWriter
      ?.write(
        createTtsSessionStoppedEvent({
          actorId: transition.userId,
          guildId: transition.guildId,
          reason: "auto-empty-channel",
          voiceChannelId: connectedVoiceChannelId
        })
      )
      .catch((error: unknown) => {
        console.warn("failed to write tts auto leave log event", {
          guildId: transition.guildId,
          error
        });
      });
  }
}

function getRemainingVoiceMembers(
  context: VoiceStateTransitionContext,
  transition: VoiceStateTransition
): VoiceMemberState[] {
  if (!transition.oldChannelId) {
    return [];
  }

  const channel = context.oldState.guild.channels.cache.get(
    transition.oldChannelId
  );

  if (!isVoiceBasedChannel(channel)) {
    return [];
  }

  return Array.from(channel.members.values()).map((member) => ({
    bot: member.user.bot
  }));
}

function isVoiceBasedChannel(
  channel: GuildBasedChannel | null | undefined
): channel is VoiceBasedChannel {
  return channel?.isVoiceBased() === true;
}
