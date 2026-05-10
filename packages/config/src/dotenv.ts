import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";

let loaded = false;

export function loadRootEnv() {
  if (loaded) {
    return;
  }

  loaded = true;
  const envPath = findNearestEnvFile(dirname(fileURLToPath(import.meta.url)));

  if (envPath) {
    config({ path: envPath });
  }
}

function findNearestEnvFile(startDirectory: string) {
  let currentDirectory = startDirectory;

  while (true) {
    const candidate = join(currentDirectory, ".env");

    if (existsSync(candidate)) {
      return candidate;
    }

    const parentDirectory = dirname(currentDirectory);

    if (
      parentDirectory === currentDirectory ||
      parse(currentDirectory).root === currentDirectory
    ) {
      return null;
    }

    currentDirectory = parentDirectory;
  }
}
