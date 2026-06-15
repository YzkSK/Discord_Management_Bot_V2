import { Events, type Client, type VoiceState } from "discord.js";

// Serialize transitions per channel to prevent join/leave race conditions
const pendingTransitions = new Map<string, Promise<unknown>>();

function enqueueTransition(key: string, op: () => Promise<unknown>): void {
  const prev = pendingTransitions.get(key) ?? Promise.resolve();
  const next = prev
    .then(op)
    .catch(() => undefined)
    .finally(() => {
      if (pendingTransitions.get(key) === next) {
        pendingTransitions.delete(key);
      }
    });
  pendingTransitions.set(key, next);
}

// For move events: reserve both the source and destination channel slots
// synchronously so a rapid leave-from-destination is always ordered after the move.
function enqueueTransitionOnKeys(key1: string, key2: string, op: () => Promise<unknown>): void {
  const prev1 = pendingTransitions.get(key1) ?? Promise.resolve();
  const prev2 = pendingTransitions.get(key2) ?? Promise.resolve();

  const next = Promise.all([prev1, prev2])
    .then(op)
    .catch(() => undefined)
    .finally(() => {
      if (pendingTransitions.get(key1) === next) pendingTransitions.delete(key1);
      if (pendingTransitions.get(key2) === next) pendingTransitions.delete(key2);
    });

  pendingTransitions.set(key1, next);
  pendingTransitions.set(key2, next);
}

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
  onTransition?: (
    transition: VoiceStateTransition,
    context: VoiceStateTransitionContext
  ) => void | Promise<void>;
}

export interface VoiceStateTransitionContext {
  oldState: VoiceState;
  newState: VoiceState;
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

    if (transition.type === "move" && transition.oldChannelId && transition.newChannelId) {
      // For move events, reserve BOTH the source and destination channel queue slots
      // immediately (synchronously) so that a rapid leave-from-destination cannot
      // race with the move's join processing.
      enqueueTransitionOnKeys(
        `${transition.guildId}:${transition.oldChannelId}`,
        `${transition.guildId}:${transition.newChannelId}`,
        () => handleVoiceStateTransition(transition, options, { oldState, newState })
      );
    } else {
      // Key on the channel being left (leave) or joined (join) so that
      // a rapid join→leave for the same channel is always processed in order.
      const channelKey = `${transition.guildId}:${transition.oldChannelId ?? transition.newChannelId}`;
      enqueueTransition(channelKey, () =>
        handleVoiceStateTransition(transition, options, { oldState, newState })
      );
    }
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
  options: InstallVoiceStateHandlersOptions,
  context: VoiceStateTransitionContext
) {
  if (options.onTransition) {
    await options.onTransition(transition, context);
    return;
  }

  console.log("voice state transition", transition);
}
