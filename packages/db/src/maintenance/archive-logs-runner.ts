import * as fs from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import * as zlib from "node:zlib";

import { parseDatabaseEnv } from "@discord-bot/config";
import postgres from "postgres";

import {
  calculateArchiveCutoffs,
  createArchiveFileName,
  resolveArchiveDir,
  toArchiveSummary
} from "./archive-logs.js";

const BATCH_SIZE = 1000;

async function main() {
  const archiveDir = resolveArchiveDir();
  const now = new Date();
  const cutoffs = calculateArchiveCutoffs(now);
  const outputPath = join(archiveDir, createArchiveFileName(now));
  const sql = postgres(parseDatabaseEnv().DATABASE_URL, {
    max: 1,
    prepare: false
  });

  try {
    await mkdir(archiveDir, { recursive: true });

    // Stream archived rows in batches to avoid loading all rows into memory
    const gzip = zlib.createGzip();
    const outputStream = fs.createWriteStream(outputPath);
    gzip.pipe(outputStream);

    let offset = 0;
    let archivedCount = 0;

    while (true) {
      const batch = await sql`
        SELECT *
        FROM logs
        WHERE received_at < ${cutoffs.deleteBefore}
        ORDER BY received_at ASC, id ASC
        LIMIT ${BATCH_SIZE}
        OFFSET ${offset}
      `;

      if (batch.length === 0) break;

      gzip.write(JSON.stringify(batch) + "\n");
      archivedCount += batch.length;
      offset += batch.length;

      if (batch.length < BATCH_SIZE) break;
    }

    gzip.end();
    await new Promise<void>((resolve, reject) => {
      outputStream.on("finish", resolve);
      outputStream.on("error", reject);
    });

    // Deletion runs only after the archive file is confirmed written to disk
    const deletedRows = await sql`
      DELETE FROM logs
      WHERE received_at < ${cutoffs.deleteBefore}
      RETURNING id
    `;

    const summary = toArchiveSummary({
      archiveBefore: cutoffs.archiveBefore,
      deleteBefore: cutoffs.deleteBefore,
      archivedCount,
      deletedCount: deletedRows.length,
      outputPath
    });

    console.log(JSON.stringify(summary, null, 2));
  } catch (err) {
    console.error("archive-logs: fatal error — deletion skipped to prevent data loss", err);
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  console.error("archive-logs: unhandled error", err);
  process.exitCode = 1;
});
