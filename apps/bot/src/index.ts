import { parseAppEnv } from "@discord-bot/config";
import { createDbClient } from "@discord-bot/db";
import { realtimeDefaultDisabledEvents } from "@discord-bot/shared";

export async function main() {
  const env = parseAppEnv();
  const db = createDbClient(env.DATABASE_URL);

  void db;

  console.log("bot foundation ready", {
    dashboardUrl: env.PUBLIC_DASHBOARD_URL,
    logLevel: env.LOG_LEVEL,
    realtimeDisabledEventCount: realtimeDefaultDisabledEvents.length
  });
}

main().catch((error: unknown) => {
  console.error("bot startup failed", error);
  process.exitCode = 1;
});
