import { z } from "zod";

const logLevelSchema = z.enum(["trace", "debug", "info", "warn", "error"]);

export const appEnvSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_REDIRECT_URI: z.string().url(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  VOICEVOX_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  SESSION_ENCRYPTION_KEY: z.string().min(1),
  PUBLIC_DASHBOARD_URL: z.string().url(),
  LOG_LEVEL: logLevelSchema.default("info")
});

export const databaseEnvSchema = appEnvSchema.pick({
  DATABASE_URL: true
});

export type AppEnv = z.infer<typeof appEnvSchema>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;

export function parseAppEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  return appEnvSchema.parse(env);
}

export function parseDatabaseEnv(
  env: NodeJS.ProcessEnv = process.env
): DatabaseEnv {
  return databaseEnvSchema.parse(env);
}
