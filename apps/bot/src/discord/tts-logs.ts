import type { NormalizedEvent } from "@discord-bot/shared";

type TtsSessionStartReason =
  | "force-join-command"
  | "force-join-confirmed"
  | "join-command";

type TtsSessionStopReason = "auto-empty-channel" | "leave-command";

type TtsMessageSourceType = "configured" | "temporary";

type TtsMessageSkipReason =
  | "command-like"
  | "empty"
  | "too-long"
  | "user-muted";

interface BaseTtsEventInput {
  actorId: string | null;
  guildId: string;
  now?: Date;
}

export interface CreateTtsSessionStartedEventInput extends BaseTtsEventInput {
  reason: TtsSessionStartReason;
  textChannelId: string;
  voiceChannelId: string;
}

export interface CreateTtsSessionStoppedEventInput extends BaseTtsEventInput {
  reason: TtsSessionStopReason;
  voiceChannelId: string | null;
}

export interface CreateTtsMessageSpokenEventInput extends BaseTtsEventInput {
  sourceChannelId: string;
  sourceMessageId: string;
  sourceType: TtsMessageSourceType;
  speakerId: number;
  textLength: number;
  voiceChannelId: string | null;
}

export interface CreateTtsMessageSkippedEventInput extends BaseTtsEventInput {
  reason: TtsMessageSkipReason;
  sourceChannelId: string;
  sourceMessageId: string;
  textLength: number;
  voiceChannelId: string | null;
}

export function createTtsSessionStartedEvent(
  input: CreateTtsSessionStartedEventInput
): NormalizedEvent {
  return createTtsEvent({
    actorId: input.actorId,
    channelId: input.voiceChannelId,
    eventName: "tts.session.started",
    guildId: input.guildId,
    messageId: null,
    now: input.now,
    payload: {
      reason: input.reason,
      textChannelId: input.textChannelId,
      voiceChannelId: input.voiceChannelId
    }
  });
}

export function createTtsSessionStoppedEvent(
  input: CreateTtsSessionStoppedEventInput
): NormalizedEvent {
  return createTtsEvent({
    actorId: input.actorId,
    channelId: input.voiceChannelId,
    eventName: "tts.session.stopped",
    guildId: input.guildId,
    messageId: null,
    now: input.now,
    payload: {
      reason: input.reason,
      voiceChannelId: input.voiceChannelId
    }
  });
}

export function createTtsMessageSpokenEvent(
  input: CreateTtsMessageSpokenEventInput
): NormalizedEvent {
  return createTtsEvent({
    actorId: input.actorId,
    channelId: input.sourceChannelId,
    eventName: "tts.message.spoken",
    guildId: input.guildId,
    messageId: input.sourceMessageId,
    now: input.now,
    payload: {
      sourceChannelId: input.sourceChannelId,
      sourceMessageId: input.sourceMessageId,
      sourceType: input.sourceType,
      speakerId: input.speakerId,
      textLength: input.textLength,
      voiceChannelId: input.voiceChannelId
    }
  });
}

export function createTtsMessageSkippedEvent(
  input: CreateTtsMessageSkippedEventInput
): NormalizedEvent {
  return createTtsEvent({
    actorId: input.actorId,
    channelId: input.sourceChannelId,
    eventName: "tts.message.skipped",
    guildId: input.guildId,
    messageId: input.sourceMessageId,
    now: input.now,
    payload: {
      reason: input.reason,
      sourceChannelId: input.sourceChannelId,
      sourceMessageId: input.sourceMessageId,
      textLength: input.textLength,
      voiceChannelId: input.voiceChannelId
    }
  });
}

function createTtsEvent(input: {
  actorId: string | null;
  channelId: string | null;
  eventName: string;
  guildId: string;
  messageId: string | null;
  now: Date | undefined;
  payload: NormalizedEvent["payload"];
}): NormalizedEvent {
  const timestamp = input.now ?? new Date();

  return {
    actorId: input.actorId,
    channelId: input.channelId,
    eventName: input.eventName,
    eventTimestamp: timestamp,
    guildId: input.guildId,
    messageId: input.messageId,
    payload: input.payload,
    receivedAt: timestamp
  };
}
