import { Events, type Client, type VoiceState } from "discord.js";

export interface VoiceStateSnapshot {
  guildId: string;
  userId: string;
  channelId: string | null;
  memberIsBot: boolean;
}

export interface VoiceStateTransition {
  type: "join" | "leave" | "move";
  guildId: string;
  userId: string;
  oldChannelId: string | null;
  newChannelId: string | null;
  memberIsBot: boolean;
}

export interface InstallVoiceStateHandlersOptions {
  onTransition?: (transition: VoiceStateTransition) => void | Promise<void>;
}

export function installVoiceStateHandlers(
  client: Client,
  options: InstallVoiceStateHandlersOptions = {}
) {
  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    const transition = toVoiceStateTransition(
      toVoiceStateSnapshot(oldState),
      toVoiceStateSnapshot(newState)
    );

    if (!transition || transition.memberIsBot) {
      return;
    }

    void handleVoiceStateTransition(transition, options);
  });
}

export function toVoiceStateSnapshot(state: VoiceState): VoiceStateSnapshot {
  return {
    guildId: state.guild.id,
    userId: state.id,
    channelId: state.channelId,
    memberIsBot: state.member?.user.bot === true
  };
}

export function toVoiceStateTransition(
  oldState: VoiceStateSnapshot,
  newState: VoiceStateSnapshot
): VoiceStateTransition | null {
  if (
    oldState.guildId !== newState.guildId ||
    oldState.userId !== newState.userId ||
    oldState.channelId === newState.channelId
  ) {
    return null;
  }

  const type = resolveTransitionType(oldState.channelId, newState.channelId);

  if (!type) {
    return null;
  }

  return {
    type,
    guildId: newState.guildId,
    userId: newState.userId,
    oldChannelId: oldState.channelId,
    newChannelId: newState.channelId,
    memberIsBot: oldState.memberIsBot || newState.memberIsBot
  };
}

function resolveTransitionType(
  oldChannelId: string | null,
  newChannelId: string | null
) {
  if (!oldChannelId && newChannelId) {
    return "join" as const;
  }

  if (oldChannelId && !newChannelId) {
    return "leave" as const;
  }

  if (oldChannelId && newChannelId) {
    return "move" as const;
  }

  return null;
}

async function handleVoiceStateTransition(
  transition: VoiceStateTransition,
  options: InstallVoiceStateHandlersOptions
) {
  if (options.onTransition) {
    await options.onTransition(transition);
    return;
  }

  console.log("voice state transition", transition);
}
