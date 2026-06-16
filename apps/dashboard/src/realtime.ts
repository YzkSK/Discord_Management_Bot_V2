import type { Server as HttpServer } from "node:http";

import { parseDashboardAuthEnv } from "@discord-bot/config";
import { createDbConnection } from "@discord-bot/db";
import { createRedisConnection } from "@discord-bot/redis";
import { readRealtimeLogEvents } from "@discord-bot/logger";
import { decode } from "next-auth/jwt";
import { Server, type Socket } from "socket.io";

import { resolveDashboardAccess } from "./authorization.js";
import {
  getUsableDiscordAccessToken,
  toDashboardDiscordToken
} from "./auth-token.js";
import {
  DiscordApiError,
  fetchCurrentUserGuildById,
  fetchGuildMemberRoleIds
} from "./discord-api.js";
import {
  realtimeErrorEventName,
  realtimeLogsEventName,
  realtimeLogsSubscribeEventName
} from "./realtime-events.js";

const env = parseDashboardAuthEnv();

export function attachRealtimeServer(server: HttpServer) {
  const io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: false
    }
  });

  io.on("connection", (socket) => {
    socket.on(realtimeLogsSubscribeEventName, (payload: unknown) => {
      void subscribeToLogs(socket, payload);
    });
  });

  return io;
}

async function subscribeToLogs(socket: Socket, payload: unknown) {
  const guildId =
    typeof payload === "object" && payload && "guildId" in payload
      ? String(payload.guildId)
      : "";

  if (!guildId) {
    socket.emit(realtimeErrorEventName, { error: "guildId is required." });
    return;
  }

  let authorized: boolean;
  try {
    authorized = await authorizeSocket(socket, guildId);
  } catch (error) {
    const message =
      error instanceof DiscordApiError
        ? "Failed to verify Discord access. Please try again."
        : "Connection failed. Please try again.";
    socket.emit(realtimeErrorEventName, { error: message });
    return;
  }

  if (!authorized) {
    socket.emit(realtimeErrorEventName, { error: "Dashboard access denied." });
    return;
  }

  void streamRealtimeLogs(socket, guildId);
}

async function authorizeSocket(socket: Socket, guildId: string) {
  const cookieHeader = socket.request.headers.cookie ?? "";
  const sessionTokenRaw = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("next-auth.session-token=") || c.startsWith("__Secure-next-auth.session-token="))
    ?.split("=")
    .slice(1)
    .join("=");

  if (!sessionTokenRaw) {
    return false;
  }

  const token = await decode({
    token: decodeURIComponent(sessionTokenRaw),
    secret: env.NEXTAUTH_SECRET ?? ""
  }).catch(() => null);

  if (!token?.sub) {
    return false;
  }

  const accessTokenResult = await getUsableDiscordAccessToken({
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
    token: toDashboardDiscordToken(token)
  });

  if (!accessTokenResult.ok) {
    return false;
  }

  let discordGuild;
  try {
    discordGuild = await fetchCurrentUserGuildById(
      accessTokenResult.accessToken,
      guildId
    );
  } catch (error) {
    // 401/403 are definitive auth failures; other errors (5xx, 429, network) are transient
    if (error instanceof DiscordApiError && (error.status === 401 || error.status === 403)) {
      return false;
    }
    throw error;
  }

  if (!discordGuild) {
    return false;
  }

  const roleIds = discordGuild.owner
    ? []
    : await fetchSocketMemberRoleIds(guildId, token.sub);
  const dbConnection = createDbConnection();

  try {
    const access = await resolveDashboardAccess({
      db: dbConnection.db,
      guildId,
      userId: token.sub,
      isGuildOwner: discordGuild.owner,
      roleIds,
      requiredRole: "viewer"
    });

    return access.allowed;
  } finally {
    await dbConnection.close();
  }
}

async function streamRealtimeLogs(socket: Socket, guildId: string) {
  let lastId = "$";
  const redisConnection = await createRedisConnection();

  try {
    while (socket.connected) {
      const events = await readRealtimeLogEvents(
        redisConnection.client,
        guildId,
        lastId
      );

      for (const event of events) {
        lastId = event.id;
        socket.emit(realtimeLogsEventName, event);
      }
    }
  } catch (error) {
    socket.emit(realtimeErrorEventName, {
      error: error instanceof Error ? error.message : "Realtime logs failed."
    });
  } finally {
    await redisConnection.close();
  }
}

async function fetchSocketMemberRoleIds(guildId: string, userId: string) {
  if (!env.DISCORD_BOT_TOKEN) {
    return [];
  }

  return fetchGuildMemberRoleIds(env.DISCORD_BOT_TOKEN, guildId, userId);
}
