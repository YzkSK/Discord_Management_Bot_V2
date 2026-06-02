import type { DbClient } from "@discord-bot/db";
import {
  createCallSession,
  endCallSession,
  getActiveCallSessionByChannelId,
  listActiveCallSessionMembers,
  markCallSessionMemberLeft,
  upsertCallSessionMember
} from "@discord-bot/db";
import type { NormalizedEvent } from "@discord-bot/shared";
import type { Client } from "discord.js";

import type { DiscordLogWriter } from "./log-writer.js";
import {
  installVoiceStateHandlers,
  type VoiceStateTransition
} from "./voice-state.js";

export interface VoiceActivitySession {
  channelId: string;
  guildId: string;
  id: string;
  status: string;
}

export interface VoiceActivityMember {
  callSessionId: string;
  leftAt: Date | null;
  userId: string;
}

export interface VoiceActivityRepository {
  createSession: (input: {
    channelId: string;
    guildId: string;
    startedAt: Date;
  }) => Promise<VoiceActivitySession>;
  endSession: (input: {
    callSessionId: string;
    endedAt: Date;
  }) => Promise<VoiceActivitySession | null>;
  findActiveSessionByChannelId: (
    guildId: string,
    channelId: string
  ) => Promise<VoiceActivitySession | null>;
  listActiveMembers: (
    callSessionId: string
  ) => Promise<readonly VoiceActivityMember[]>;
  markMemberLeft: (input: {
    callSessionId: string;
    leftAt: Date;
    userId: string;
  }) => Promise<VoiceActivityMember | null>;
  upsertMember: (input: {
    callSessionId: string;
    joinedAt: Date;
    userId: string;
  }) => Promise<VoiceActivityMember>;
}

export interface VoiceActivityContext {
  now?: () => Date;
  repository: VoiceActivityRepository;
  writeLog: (event: NormalizedEvent) => Promise<void>;
}

export interface InstallVoiceActivityHandlersOptions {
  db: DbClient;
  logWriter: DiscordLogWriter;
}

export function installVoiceActivityHandlers(
  client: Client,
  options: InstallVoiceActivityHandlersOptions
) {
  installVoiceStateHandlers(client, {
    onTransition: (transition) =>
      handleVoiceActivityTransition(transition, {
        repository: createDbVoiceActivityRepository(options.db),
        writeLog: (event) => options.logWriter.write(event)
      })
  });
}

export async function handleVoiceActivityTransition(
  transition: VoiceStateTransition,
  context: VoiceActivityContext
) {
  if (transition.memberIsBot) {
    return;
  }

  if (transition.type === "move") {
    await handleVoiceLeave(transition, context);
    await handleVoiceJoin(transition, context);
    return;
  }

  if (transition.type === "join") {
    await handleVoiceJoin(transition, context);
    return;
  }

  await handleVoiceLeave(transition, context);
}

export function createVoiceActivityStartedEvent(input: {
  actorId: string;
  channelId: string;
  guildId: string;
  sessionId: string;
  startedAt: Date;
}): NormalizedEvent {
  return createVoiceActivityEvent("call.started", {
    actorId: input.actorId,
    channelId: input.channelId,
    guildId: input.guildId,
    payload: {
      sessionId: input.sessionId,
      startedAt: input.startedAt.toISOString(),
      voiceChannelId: input.channelId
    },
    timestamp: input.startedAt
  });
}

export function createVoiceActivityEndedEvent(input: {
  actorId: string;
  channelId: string;
  endedAt: Date;
  guildId: string;
  sessionId: string;
}): NormalizedEvent {
  return createVoiceActivityEvent("call.ended", {
    actorId: input.actorId,
    channelId: input.channelId,
    guildId: input.guildId,
    payload: {
      endedAt: input.endedAt.toISOString(),
      sessionId: input.sessionId,
      voiceChannelId: input.channelId
    },
    timestamp: input.endedAt
  });
}

function createDbVoiceActivityRepository(
  db: DbClient
): VoiceActivityRepository {
  return {
    createSession: (input) => createCallSession(db, input),
    endSession: (input) => endCallSession(db, input),
    findActiveSessionByChannelId: (guildId, channelId) =>
      getActiveCallSessionByChannelId(db, { channelId, guildId }),
    listActiveMembers: (callSessionId) =>
      listActiveCallSessionMembers(db, callSessionId),
    markMemberLeft: (input) => markCallSessionMemberLeft(db, input),
    upsertMember: (input) => upsertCallSessionMember(db, input)
  };
}

async function handleVoiceJoin(
  transition: VoiceStateTransition,
  context: VoiceActivityContext
) {
  if (!transition.newChannelId) {
    return;
  }

  const now = resolveNow(context);
  let session = await context.repository.findActiveSessionByChannelId(
    transition.guildId,
    transition.newChannelId
  );

  if (!session) {
    session = await context.repository.createSession({
      channelId: transition.newChannelId,
      guildId: transition.guildId,
      startedAt: now
    });
    await context.writeLog(
      createVoiceActivityStartedEvent({
        actorId: transition.userId,
        channelId: transition.newChannelId,
        guildId: transition.guildId,
        sessionId: session.id,
        startedAt: now
      })
    );
  }

  await context.repository.upsertMember({
    callSessionId: session.id,
    joinedAt: now,
    userId: transition.userId
  });
}

async function handleVoiceLeave(
  transition: VoiceStateTransition,
  context: VoiceActivityContext
) {
  if (!transition.oldChannelId) {
    return;
  }

  const session = await context.repository.findActiveSessionByChannelId(
    transition.guildId,
    transition.oldChannelId
  );

  if (!session) {
    return;
  }

  const now = resolveNow(context);
  await context.repository.markMemberLeft({
    callSessionId: session.id,
    leftAt: now,
    userId: transition.userId
  });

  const activeMembers = await context.repository.listActiveMembers(session.id);

  if (activeMembers.length > 0) {
    return;
  }

  await context.repository.endSession({
    callSessionId: session.id,
    endedAt: now
  });
  await context.writeLog(
    createVoiceActivityEndedEvent({
      actorId: transition.userId,
      channelId: transition.oldChannelId,
      endedAt: now,
      guildId: transition.guildId,
      sessionId: session.id
    })
  );
}

function createVoiceActivityEvent(
  eventName: string,
  input: {
    actorId: string;
    channelId: string;
    guildId: string;
    payload: NormalizedEvent["payload"];
    timestamp: Date;
  }
): NormalizedEvent {
  return {
    actorId: input.actorId,
    channelId: input.channelId,
    eventName,
    eventTimestamp: input.timestamp,
    guildId: input.guildId,
    messageId: null,
    payload: input.payload,
    receivedAt: input.timestamp
  };
}

function resolveNow(context: VoiceActivityContext) {
  return context.now?.() ?? new Date();
}
