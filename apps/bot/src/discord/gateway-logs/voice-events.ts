import type { DbClient } from "@discord-bot/db";
import {
  getActiveTempVoiceChannelByChannelId,
  getGuildConfigByGuildId
} from "@discord-bot/db";
import { AuditLogEvent, Events, type Client, type VoiceState } from "discord.js";
import { lookupAuditLog } from "../audit-log.js";
import { createVoiceEvent, type WriteEventFn } from "./payloads.js";

const GUILD_CONFIG_CACHE_TTL_MS = 60_000;

type GuildConfig = Awaited<ReturnType<typeof getGuildConfigByGuildId>>;
const guildConfigCache = new Map<string, { value: GuildConfig; expiresAt: number }>();

async function getCachedGuildConfig(db: DbClient, guildId: string): Promise<GuildConfig> {
  const cached = guildConfigCache.get(guildId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const config = await getGuildConfigByGuildId(db, guildId);
  guildConfigCache.set(guildId, { value: config, expiresAt: Date.now() + GUILD_CONFIG_CACHE_TTL_MS });
  return config;
}

export function installVoiceGatewayLogHandlers(
  client: Client,
  write: WriteEventFn,
  db: DbClient
) {
  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    void writeVoiceStateEvent(write, oldState, newState, db);
  });
}

export function shouldSkipVoiceStateLog(input: {
  eventName: string;
  memberIsBot: boolean;
}) {
  return (
    input.memberIsBot &&
    (input.eventName === "voice.session.join" ||
      input.eventName === "voice.session.leave")
  );
}

export function resolveVoiceStateLogEventName(
  oldState: Pick<VoiceState, "channelId">,
  newState: Pick<VoiceState, "channelId">
) {
  if (!oldState.channelId && newState.channelId) {
    return "voice.session.join";
  }

  if (oldState.channelId && !newState.channelId) {
    return "voice.session.leave";
  }

  if (oldState.channelId !== newState.channelId) {
    return "voice.session.move";
  }

  return "voice.state.update";
}

async function writeVoiceStateEvent(
  write: WriteEventFn,
  oldState: VoiceState,
  newState: VoiceState,
  db: DbClient
) {
  const eventName = resolveVoiceStateLogEventName(oldState, newState);

  if (
    shouldSkipVoiceStateLog({
      eventName,
      memberIsBot:
        oldState.member?.user.bot === true || newState.member?.user.bot === true
    })
  ) {
    return;
  }

  if (await shouldSuppressTempVoiceStateEvent(oldState, newState, db)) {
    return;
  }

  const event = createVoiceEvent(eventName, oldState, newState);

  if (eventName === "voice.session.move") {
    const movedUserId = newState.member?.id ?? newState.id;
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    const auditLog = await lookupAuditLog(newState.guild, AuditLogEvent.MemberMove, null);
    if (auditLog.status === "matched" && auditLog.actorId && auditLog.actorId !== movedUserId) {
      write({
        ...event,
        actorId: auditLog.actorId,
        payload: {
          ...event.payload,
          targetId: movedUserId,
          targetName: newState.member?.displayName ?? null,
          auditLog: auditLog.payload
        }
      });
      return;
    }
  }

  write(event);
}

async function shouldSuppressTempVoiceStateEvent(
  oldState: VoiceState,
  newState: VoiceState,
  db: DbClient
) {
  const config = await getCachedGuildConfig(db, newState.guild.id);

  if (!config?.tempVoiceCreateChannelId) {
    return false;
  }

  if (newState.channelId === config.tempVoiceCreateChannelId) {
    return true;
  }

  if (
    oldState.channelId === config.tempVoiceCreateChannelId &&
    newState.channelId
  ) {
    const tempVoiceChannel = await getActiveTempVoiceChannelByChannelId(
      db,
      newState.channelId
    );

    return tempVoiceChannel !== null;
  }

  return false;
}
