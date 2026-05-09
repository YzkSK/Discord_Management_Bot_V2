import type { BotRuntime } from "./runtime.js";

const shutdownSignals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

export function installShutdownHandlers(runtime: BotRuntime) {
  let shuttingDown = false;

  for (const signal of shutdownSignals) {
    process.once(signal, () => {
      if (shuttingDown) {
        return;
      }

      shuttingDown = true;
      runtime
        .stop(signal)
        .catch((error: unknown) => {
          console.error("bot shutdown failed", error);
          process.exitCode = 1;
        })
        .finally(() => {
          process.exit();
        });
    });
  }
}
