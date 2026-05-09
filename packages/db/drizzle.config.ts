import { parseDatabaseEnv } from "@discord-bot/config";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(currentDir, "../../.env") });

const env = parseDatabaseEnv();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: env.DATABASE_URL
  },
  strict: true,
  verbose: true
});
