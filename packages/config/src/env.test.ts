import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { appEnvSchema } from "./env.js";

const baseEnv = {
  DATABASE_URL: "postgres://user:pass@localhost:5432/db",
  DISCORD_BOT_TOKEN: "token",
  DISCORD_CLIENT_ID: "client",
  DISCORD_CLIENT_SECRET: "secret",
  DISCORD_REDIRECT_URI: "http://localhost:3000/api/auth/callback/discord",
  NEXTAUTH_SECRET: "secret",
  PUBLIC_DASHBOARD_URL: "http://localhost:3000",
  REDIS_URL: "redis://localhost:6379",
  SESSION_ENCRYPTION_KEY: "aaaabbbbccccddddeeeeffffgggghhhh",
  VOICEVOX_URL: "http://localhost:50021"
};

describe("appEnvSchema", () => {
  it("defaults VOICEVOX speaker to a low-latency speaker", () => {
    const env = appEnvSchema.parse(baseEnv);

    assert.equal(env.VOICEVOX_SPEAKER_ID, 2);
  });

  it("accepts VOICEVOX speaker from env", () => {
    const env = appEnvSchema.parse({
      ...baseEnv,
      VOICEVOX_SPEAKER_ID: "3"
    });

    assert.equal(env.VOICEVOX_SPEAKER_ID, 3);
  });
});
