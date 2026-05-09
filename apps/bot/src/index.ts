import { createBotRuntime } from "./runtime.js";
import { installShutdownHandlers } from "./signals.js";

export async function main() {
  const runtime = createBotRuntime();
  installShutdownHandlers(runtime);
  await runtime.start();
}

main().catch((error: unknown) => {
  console.error("bot startup failed", error);
  process.exitCode = 1;
});
