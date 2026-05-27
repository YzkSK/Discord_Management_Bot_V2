import { checkDatabaseHealth, createDbConnection } from "@discord-bot/db";
import { createRedisClient } from "@discord-bot/redis";
import { NextResponse } from "next/server";

import {
  createHealthReport,
  measureHealthProbe,
  toHealthHttpStatus
} from "./health";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await createHealthReport({
    probes: {
      database: checkDatabase,
      redis: checkRedis,
      voicevox: checkVoicevox
    }
  });

  return NextResponse.json(report, {
    status: toHealthHttpStatus(report.status)
  });
}

async function checkDatabase() {
  return measureHealthProbe(async () => {
    const connection = createDbConnection();

    try {
      await checkDatabaseHealth(connection.db);
    } finally {
      await connection.close();
    }
  });
}

async function checkRedis() {
  return measureHealthProbe(async () => {
    const client = createRedisClient();

    try {
      await client.connect();
      await client.ping();
    } finally {
      await client.quit().catch(() => undefined);
    }
  });
}

async function checkVoicevox() {
  return measureHealthProbe(async () => {
    const baseUrl = process.env.VOICEVOX_URL ?? "http://localhost:50021";
    const response = await fetch(`${baseUrl}/version`);

    if (!response.ok) {
      throw new Error(`VOICEVOX returned ${response.status}.`);
    }
  });
}
