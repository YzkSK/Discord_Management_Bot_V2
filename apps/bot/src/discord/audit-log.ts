import type { NormalizedEvent } from "@discord-bot/shared";
import {
  PermissionFlagsBits,
  type AuditLogEvent,
  type DMChannel,
  type Guild,
  type GuildAuditLogsEntry,
  type GuildTextBasedChannel,
  type Invite,
  type NonThreadGuildBasedChannel,
  type PartialUser,
  type User
} from "discord.js";

const auditLogLookupWindowMs = 30_000;

export interface AuditLogLookupResult {
  status: "matched" | "not_found" | "missing_permission" | "missing_guild" | "error";
  actorId: string | null;
  payload: Record<string, unknown>;
}

export async function lookupAuditLog(
  guild: Guild | null,
  action: AuditLogEvent,
  targetId: string | null
): Promise<AuditLogLookupResult> {
  if (!guild) {
    return {
      status: "missing_guild",
      actorId: null,
      payload: {
        status: "missing_guild",
        action,
        targetId
      }
    };
  }

  if (!guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
    return {
      status: "missing_permission",
      actorId: null,
      payload: {
        status: "missing_permission",
        action,
        targetId,
        requiredPermission: "ViewAuditLog"
      }
    };
  }

  try {
    const logs = await guild.fetchAuditLogs({ type: action, limit: 6 });
    const entry = logs.entries.find((candidate) =>
      isMatchingAuditLogEntry(candidate, action, targetId)
    );

    if (!entry) {
      return {
        status: "not_found",
        actorId: null,
        payload: {
          status: "not_found",
          action,
          targetId
        }
      };
    }

    return {
      status: "matched",
      actorId: entry.executorId,
      payload: {
        status: "matched",
        id: entry.id,
        action: entry.action,
        targetId: entry.targetId,
        executorId: entry.executorId,
        executor: entry.executor ? userPayload(entry.executor) : null,
        reason: entry.reason,
        createdAt: entry.createdAt.toISOString()
      }
    };
  } catch (error: unknown) {
    return {
      status: "error",
      actorId: null,
      payload: {
        status: "error",
        action,
        targetId,
        message: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

export function writeWithAuditLog(
  write: (event: NormalizedEvent) => void,
  event: NormalizedEvent,
  guild: Guild | null,
  action: AuditLogEvent,
  targetId: string | null
) {
  void Promise.resolve()
    .then(() => lookupAuditLog(guild, action, targetId))
    .then((auditLog) => write(applyAuditLog(event, auditLog)))
    .catch((error: unknown) => {
      console.warn("failed to enrich gateway log event with audit log", {
        eventName: event.eventName,
        guildId: event.guildId,
        error
      });
      write(event);
    });
}

export function applyAuditLog(
  event: NormalizedEvent,
  auditLog: AuditLogLookupResult
): NormalizedEvent {
  return {
    ...event,
    actorId: auditLog.actorId ?? event.actorId,
    payload: {
      ...event.payload,
      auditLog: auditLog.payload
    }
  };
}

export function getChannelGuild(
  channel: DMChannel | GuildTextBasedChannel | NonThreadGuildBasedChannel
) {
  return "guild" in channel ? channel.guild : null;
}

export function getInviteGuild(invite: Invite) {
  return invite.guild && "fetchAuditLogs" in invite.guild
    ? (invite.guild as Guild)
    : null;
}

function isMatchingAuditLogEntry(
  entry: GuildAuditLogsEntry,
  action: AuditLogEvent,
  targetId: string | null
) {
  if (entry.action !== action) {
    return false;
  }

  if (Date.now() - entry.createdTimestamp > auditLogLookupWindowMs) {
    return false;
  }

  if (!targetId) {
    return true;
  }

  return entry.targetId === targetId || getObjectId(entry.target) === targetId;
}

function userPayload(user: User | PartialUser) {
  return {
    id: user.id,
    username: user.username,
    globalName: user.globalName,
    bot: user.bot
  };
}

function getObjectId(value: unknown) {
  if (value && typeof value === "object" && "id" in value) {
    const id = value.id;
    return typeof id === "string" ? id : null;
  }

  return null;
}
