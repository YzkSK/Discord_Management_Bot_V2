import type { Server as HttpServer } from "node:http";

import { parseDashboardAuthEnv } from "@discord-bot/config";
import { createDbConnection } from "@discord-bot/db";
import { createRedisConnection, readRealtimeLogEvents } from "@discord-bot/redis";
import { getToken } from "next-auth/jwt";
import { Server, type Socket } from "socket.io";

import { resolveDashboardAccess } from "./authorization.js";
import {
  fetchCurrentUserGuild,
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

  const authorized = await authorizeSocket(socket, guildId);

  if (!authorized) {
    socket.emit(realtimeErrorEventName, { error: "Dashboard access denied." });
    return;
  }

  void streamRealtimeLogs(socket, guildId);
}

async function authorizeSocket(socket: Socket, guildId: string) {
  const token = await getToken({
    req: socket.request as never,
    ...(env.NEXTAUTH_SECRET ? { secret: env.NEXTAUTH_SECRET } : {})
  });

  if (!token?.sub || !token.discordAccessToken) {
    return false;
  }

  const discordGuild = await fetchCurrentUserGuild(
    token.discordAccessToken,
    guildId
  );

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
