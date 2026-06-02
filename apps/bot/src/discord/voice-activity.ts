import type { DbClient } from "@discord-bot/db";
import {
  createCallSession,
  endCallSession,
  getActiveCallSessionByChannelId,
  getCallSessionById,
  listActiveCallSessionMembers,
  markCallSessionMemberLeft,
  updateCallSessionStatusMessage,
  upsertCallSessionMember
} from "@discord-bot/db";
import type { NormalizedEvent } from "@discord-bot/shared";
import type { Client } from "discord.js";

import type { DiscordLogWriter } from "./log-writer.js";
import {
  installVoiceStateHandlers,
  type VoiceStateTransition
} from "./voice-state.js";
import {
  findMarkedVoiceStatusChannel,
  createVoiceStatusMessage,
  type VoiceStatusDisplayState
} from "./voice-status-channel.js";

export interface VoiceActivitySession {
  channelId: string;
  guildId: string;
  id: string;
  startedAt: Date;
  status: string;
  statusMessageId: string | null;
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
  updateStatusMessage: (input: {
    callSessionId: string;
    statusMessageId: string;
  }) => Promise<VoiceActivitySession | null>;
  upsertMember: (input: {
    callSessionId: string;
    joinedAt: Date;
    userId: string;
  }) => Promise<VoiceActivityMember>;
}

export interface VoiceActivityContext {
  now?: () => Date;
  repository: VoiceActivityRepository;
  scheduleActiveStatusUpdate?: (
    sessionId: string,
    delayMs: number
  ) => void | Promise<void>;
  updateVoiceStatus?: (input: {
    activeMemberCount: number;
    endedAt?: Date | null;
    session: VoiceActivitySession;
    state: VoiceStatusDisplayState;
  }) => Promise<string | null>;
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
        scheduleActiveStatusUpdate: (sessionId, delayMs) => {
          setTimeout(() => {
            void refreshActiveVoiceStatus(client, options, sessionId).catch(
              (error: unknown) => {
                void options.logWriter.recordHandlerError({
                  error,
                  event: createVoiceActivityEvent("voice.status.update_failed", {
                    actorId: null,
                    channelId: null,
                    guildId: null,
                    payload: { sessionId },
                    timestamp: new Date()
                  }),
                  handlerName: "voice-status-channel",
                  receivedAt: new Date()
                });
              }
            );
          }, delayMs);
        },
        updateVoiceStatus: (input) =>
          updateDiscordVoiceStatusMessage(client, input),
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
    updateStatusMessage: (input) => updateCallSessionStatusMessage(db, input),
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
    const statusMessageId = await context.updateVoiceStatus?.({
      activeMemberCount: 1,
      session,
      state: "started"
    });

    if (statusMessageId) {
      session =
        (await context.repository.updateStatusMessage({
          callSessionId: session.id,
          statusMessageId
        })) ?? { ...session, statusMessageId };
    }

    await context.scheduleActiveStatusUpdate?.(session.id, 60_000);
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
  await context.updateVoiceStatus?.({
    activeMemberCount: 0,
    endedAt: now,
    session,
    state: "ended"
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
    actorId: string | null;
    channelId: string | null;
    guildId: string | null;
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

async function refreshActiveVoiceStatus(
  client: Client,
  options: InstallVoiceActivityHandlersOptions,
  sessionId: string
) {
  const repository = createDbVoiceActivityRepository(options.db);
  const session = await getCallSessionById(options.db, sessionId);

  if (!session || session.status !== "active") {
    return;
  }

  const activeMembers = await repository.listActiveMembers(session.id);

  if (activeMembers.length === 0) {
    return;
  }

  await updateDiscordVoiceStatusMessage(client, {
    activeMemberCount: activeMembers.length,
    session,
    state: "active"
  });
}

async function updateDiscordVoiceStatusMessage(
  client: Client,
  input: {
    activeMemberCount: number;
    endedAt?: Date | null;
    session: VoiceActivitySession;
    state: VoiceStatusDisplayState;
  }
) {
  const guild = client.guilds.cache.get(input.session.guildId);

  if (!guild) {
    return null;
  }

  const channel = await findMarkedVoiceStatusChannel(guild);

  if (!channel) {
    return null;
  }

  const message = createVoiceStatusMessage({
    channelId: input.session.channelId,
    endedAt: input.endedAt ?? null,
    memberCount: input.activeMemberCount,
    now: input.endedAt ?? new Date(),
    sessionId: input.session.id,
    startedAt: input.session.startedAt
  });

  if (input.session.statusMessageId) {
    const existingMessage = await channel.messages
      .fetch(input.session.statusMessageId)
      .catch(() => null);

    if (existingMessage) {
      await existingMessage.edit(message);
      return existingMessage.id;
    }
  }

  const sentMessage = await channel.send(message);
  return sentMessage.id;
}
