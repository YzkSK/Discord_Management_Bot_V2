import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const sourceFiles = [
  "src/app/dashboard-shell.tsx",
  "src/app/page.tsx",
  "src/app/logs/logs-explorer.tsx",
  "src/app/settings/settings-panel.tsx",
  "src/components/ui/card.tsx",
  "src/components/ui/button.tsx",
  "src/components/ui/badge.tsx",
  "src/app/guild/guild-selector.tsx"
];

describe("dashboard visual policy", () => {
  it("does not use gradient utility classes", () => {
    const source = readDashboardSources();

    assert.equal(/bg-gradient|from-|via-|to-/.test(source), false);
  });

  it("does not use oversized rounded utility classes", () => {
    const source = readDashboardSources();

    assert.equal(/rounded-(xl|2xl|3xl|full)/.test(source), false);
  });
});

function readDashboardSources() {
  return sourceFiles
    .filter((file) => existsSync(join(process.cwd(), file)))
    .map((file) => readFileSync(join(process.cwd(), file), "utf8"))
    .join("\n");
}
