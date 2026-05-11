import { createServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { attachRealtimeServer } from "./realtime.js";

const require = createRequire(import.meta.url);
const next = require("next") as typeof import("next").default;

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const app = next({ dev, dir: appDir, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((request, response) => {
  void handle(request, response);
});

attachRealtimeServer(server);

server.listen(port, hostname, () => {
  console.log(`dashboard: ready on http://${hostname}:${port}`);
});
