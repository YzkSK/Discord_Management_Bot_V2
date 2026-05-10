import { z } from "zod";

import { loadRootEnv } from "./dotenv.js";

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

export const redisEnvSchema = appEnvSchema.pick({
  REDIS_URL: true
});

export const dashboardAuthEnvSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().default(""),
  DISCORD_CLIENT_SECRET: z.string().default(""),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional()
});

export type AppEnv = z.infer<typeof appEnvSchema>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type RedisEnv = z.infer<typeof redisEnvSchema>;
export type DashboardAuthEnv = z.infer<typeof dashboardAuthEnvSchema>;

export function parseAppEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  loadRootEnv();
  return appEnvSchema.parse(env);
}

export function parseDatabaseEnv(
  env: NodeJS.ProcessEnv = process.env
): DatabaseEnv {
  loadRootEnv();
  return databaseEnvSchema.parse(env);
}

export function parseRedisEnv(env: NodeJS.ProcessEnv = process.env): RedisEnv {
  loadRootEnv();
  return redisEnvSchema.parse(env);
}

export function parseDashboardAuthEnv(
  env: NodeJS.ProcessEnv = process.env
): DashboardAuthEnv {
  loadRootEnv();
  return dashboardAuthEnvSchema.parse(env);
}
