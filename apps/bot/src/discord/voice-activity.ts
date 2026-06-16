import type { DbClient } from "@discord-bot/db";
import {
  createCallSession,
  endCallSession,
  getActiveCallSessionByChannelId,
  getCallSessionById,
  getGuildConfigByGuildId,
  listActiveCallSessionMembers,
  listDiscordChannelNamesByIds,
  markCallSessionMemberLeft,
  updateCallSessionStatusMessage,
  upsertCallSessionMember
} from "@discord-bot/db";
import { getLocale, isGuildLanguage, type NormalizedEvent } from "@discord-bot/shared";
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
  }) => Promise<{ created: boolean; session: VoiceActivitySession }>;
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
  findChannelName?: (channelId: string) => Promise<string | null>;
  ignoredChannelIds?: ReadonlySet<string>;
  now?: () => Date;
  repository: VoiceActivityRepository;
  scheduleActiveStatusUpdate?: (
    sessionId: string,
    delayMs: number
  ) => void | Promise<void>;
  updateVoiceStatus?: (input: {
    activeMemberCount: number;
    channelName?: string | null;
    endedAt?: Date | null;
    memberIds?: string[];
    session: VoiceActivitySession;
    state: VoiceStatusDisplayState;
  }) => Promise<string | null>;
  writeLog: (event: NormalizedEvent) => Promise<void>;
}

export interface InstallVoiceActivityHandlersOptions {
  db: DbClient;
  logWriter: DiscordLogWriter;
}

export interface VoiceActivityStatusSchedulerOptions {
  delayMs?: number;
  onError?: (error: unknown, sessionId: string) => void | Promise<void>;
  refresh: (sessionId: string) => Promise<boolean>;
  setTimeout?: (handler: () => void, delayMs: number) => void;
}

const IGNORED_CHANNELS_CACHE_TTL_MS = 60_000;

export function installVoiceActivityHandlers(
  client: Client,
  options: InstallVoiceActivityHandlersOptions
) {
  const ignoredChannelIdsCache = new Map<string, { value: ReadonlySet<string>; expiresAt: number }>();

  const getCachedIgnoredChannelIds = async (guildId: string): Promise<ReadonlySet<string>> => {
    const cached = ignoredChannelIdsCache.get(guildId);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const ids = await resolveIgnoredVoiceActivityChannelIds(options.db, guildId);
    ignoredChannelIdsCache.set(guildId, { value: ids, expiresAt: Date.now() + IGNORED_CHANNELS_CACHE_TTL_MS });
    return ids;
  };

  const scheduleActiveStatusUpdate = createVoiceActivityStatusScheduler({
    onError: (error, sessionId) =>
      options.logWriter.recordHandlerError({
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
      }),
    refresh: (sessionId) => refreshActiveVoiceStatus(client, options, sessionId)
  });

  installVoiceStateHandlers(client, {
    onTransition: async (transition) =>
      handleVoiceActivityTransition(transition, {
        findChannelName: async (channelId) => {
          const names = await listDiscordChannelNamesByIds(options.db, [channelId]);
          return names.get(channelId) ?? null;
        },
        ignoredChannelIds: await getCachedIgnoredChannelIds(transition.guildId),
        repository: createDbVoiceActivityRepository(options.db),
        scheduleActiveStatusUpdate,
        updateVoiceStatus: (input) =>
          updateDiscordVoiceStatusMessage(client, options.db, input),
        writeLog: (event) => options.logWriter.write(event)
      })
  });
}

export function createVoiceActivityStatusScheduler(
  options: VoiceActivityStatusSchedulerOptions
) {
  const delayMs = options.delayMs ?? 60_000;
  const runTimer = options.setTimeout ?? ((handler, ms) => setTimeout(handler, ms));

  return async function scheduleActiveStatusUpdate(
    sessionId: string,
    nextDelayMs = delayMs
  ) {
    runTimer(() => {
      void options
        .refresh(sessionId)
        .then((shouldContinue) => {
          if (shouldContinue) {
            void scheduleActiveStatusUpdate(sessionId, delayMs);
          }
        })
        .catch((error: unknown) => options.onError?.(error, sessionId));
    }, nextDelayMs);
  };
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

  if (context.ignoredChannelIds?.has(transition.newChannelId)) {
    return;
  }

  const now = resolveNow(context);
  let session = await context.repository.findActiveSessionByChannelId(
    transition.guildId,
    transition.newChannelId
  );
  let activeMembersBeforeJoin: readonly VoiceActivityMember[] = [];
  let shouldPublishStarted = false;

  if (!session) {
    const result = await context.repository.createSession({
      channelId: transition.newChannelId,
      guildId: transition.guildId,
      startedAt: now
    });
    session = result.session;
    shouldPublishStarted = result.created;
  } else {
    activeMembersBeforeJoin = await context.repository.listActiveMembers(
      session.id
    );
    shouldPublishStarted = shouldPublishStartedForExistingSession({
      activeMembers: activeMembersBeforeJoin,
      session,
      userId: transition.userId
    });
  }

  if (shouldPublishStarted) {
    await context.writeLog(
      createVoiceActivityStartedEvent({
        actorId: transition.userId,
        channelId: transition.newChannelId,
        guildId: transition.guildId,
        sessionId: session.id,
        startedAt: now
      })
    );
    const memberIdsAfterJoin = [
      ...activeMembersBeforeJoin.map(m => m.userId),
      transition.userId
    ].filter((id, i, arr) => arr.indexOf(id) === i);

    const statusMessageId = await context.updateVoiceStatus?.({
      activeMemberCount: memberIdsAfterJoin.length,
      memberIds: memberIdsAfterJoin,
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

  if (!shouldPublishStarted) {
    const allActiveMembers = await context.repository.listActiveMembers(session.id);
    await context.updateVoiceStatus?.({
      activeMemberCount: allActiveMembers.length,
      memberIds: allActiveMembers.map((m) => m.userId),
      session,
      state: "active"
    });
  }
}

function shouldPublishStartedForExistingSession(input: {
  activeMembers: readonly VoiceActivityMember[];
  session: VoiceActivitySession;
  userId: string;
}) {
  return (
    input.session.statusMessageId === null &&
    input.activeMembers.length <= 1 &&
    input.activeMembers.some((member) => member.userId === input.userId)
  );
}

async function resolveIgnoredVoiceActivityChannelIds(
  db: DbClient,
  guildId: string
) {
  const config = await getGuildConfigByGuildId(db, guildId).catch(
    (error: unknown) => {
      console.warn("failed to resolve ignored voice activity channels", error);
      return null;
    }
  );

  return new Set(
    config?.tempVoiceCreateChannelId ? [config.tempVoiceCreateChannelId] : []
  );
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
    await context.updateVoiceStatus?.({
      activeMemberCount: activeMembers.length,
      memberIds: activeMembers.map((m) => m.userId),
      session,
      state: "active"
    });
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
  const channelName = await context.findChannelName?.(transition.oldChannelId) ?? null;
  await context.updateVoiceStatus?.({
    activeMemberCount: 0,
    channelName,
    endedAt: now,
    session,
    state: "ended"
  });
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
    return false;
  }

  const activeMembers = await repository.listActiveMembers(session.id);

  if (activeMembers.length === 0) {
    return false;
  }

  await updateDiscordVoiceStatusMessage(client, options.db, {
    activeMemberCount: activeMembers.length,
    memberIds: activeMembers.map(m => m.userId),
    session,
    state: "active"
  });
  return true;
}

export async function updateDiscordVoiceStatusMessage(
  client: Client,
  db: DbClient,
  input: {
    activeMemberCount: number;
    channelName?: string | null;
    endedAt?: Date | null;
    memberIds?: string[];
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

  const guildConfig = await getGuildConfigByGuildId(db, input.session.guildId).catch(() => null);
  const lang = guildConfig?.language && isGuildLanguage(guildConfig.language)
    ? guildConfig.language
    : "ja";
  const loc = getLocale(lang);

  const message = createVoiceStatusMessage({
    channelId: input.session.channelId,
    channelName: input.channelName ?? null,
    endedAt: input.endedAt ?? null,
    loc,
    memberCount: input.activeMemberCount,
    ...(input.memberIds ? { memberIds: input.memberIds } : {}),
    now: input.endedAt ?? new Date(),
    sessionId: input.session.id,
    startedAt: input.session.startedAt
  });

  if (input.session.statusMessageId) {
    const existingMessage = await channel.messages
      .fetch(input.session.statusMessageId)
      .catch(() => null);

    if (existingMessage) {
      await existingMessage.edit({ ...message, allowedMentions: { parse: [] } });
      return existingMessage.id;
    }
  }

  const sentMessage = await channel.send({ ...message, allowedMentions: { parse: [] } });
  return sentMessage.id;
}
