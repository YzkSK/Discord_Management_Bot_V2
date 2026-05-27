import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateArchiveCutoffs,
  createArchiveFileName,
  resolveArchiveDir,
  toArchiveSummary
} from "./archive-logs.js";

describe("log archive helpers", () => {
  it("uses 180 and 365 day cutoffs", () => {
    const cutoffs = calculateArchiveCutoffs(
      new Date("2026-05-27T00:00:00.000Z")
    );

    assert.equal(
      cutoffs.archiveBefore.toISOString(),
      "2025-11-28T00:00:00.000Z"
    );
    assert.equal(
      cutoffs.deleteBefore.toISOString(),
      "2025-05-27T00:00:00.000Z"
    );
  });

  it("creates stable gzip archive file names", () => {
    assert.equal(
      createArchiveFileName(new Date("2026-05-27T08:30:00.000Z")),
      "logs_2026-05-27T08-30-00Z.json.gz"
    );
  });

  it("resolves archive dir from the original command directory", () => {
    assert.equal(
      resolveArchiveDir({
        env: {
          INIT_CWD: "C:\\repo"
        },
        cwd: "C:\\repo\\packages\\db"
      }),
      "C:\\repo\\backups\\archive"
    );
  });

  it("summarizes archive execution without leaking row content", () => {
    assert.deepEqual(
      toArchiveSummary({
        archiveBefore: new Date("2025-11-28T00:00:00.000Z"),
        deleteBefore: new Date("2025-05-27T00:00:00.000Z"),
        archivedCount: 12,
        deletedCount: 3,
        outputPath: "backups/archive/logs_2026-05-27T08-30-00Z.json.gz"
      }),
      {
        archiveBefore: "2025-11-28T00:00:00.000Z",
        deleteBefore: "2025-05-27T00:00:00.000Z",
        archivedCount: 12,
        deletedCount: 3,
        outputPath: "backups/archive/logs_2026-05-27T08-30-00Z.json.gz"
      }
    );
  });
});
