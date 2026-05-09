import { parseDatabaseEnv } from "@discord-bot/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema/index.js";

export function createDbClient(databaseUrl = parseDatabaseEnv().DATABASE_URL) {
  return createDbConnection(databaseUrl).db;
}

export function createDbConnection(databaseUrl = parseDatabaseEnv().DATABASE_URL) {
  const client = postgres(databaseUrl, {
    max: 10,
    prepare: false
  });

  return {
    db: drizzle(client, { schema }),
    close: () => client.end({ timeout: 5 })
  };
}

export type DbClient = ReturnType<typeof createDbClient>;
export type DbConnection = ReturnType<typeof createDbConnection>;
