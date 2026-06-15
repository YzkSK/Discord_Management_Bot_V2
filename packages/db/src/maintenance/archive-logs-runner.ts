import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

import { parseDatabaseEnv } from "@discord-bot/config";
import postgres from "postgres";

import {
  calculateArchiveCutoffs,
  createArchiveFileName,
  resolveArchiveDir,
  toArchiveSummary
} from "./archive-logs.js";

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

  const archivedRows = await sql`
    select *
    from logs
    where received_at < ${cutoffs.archiveBefore}
    order by received_at asc
  `;

  await writeFile(outputPath, gzipSync(JSON.stringify(archivedRows, null, 2)));

  // Deletion runs only after the archive file is confirmed written to disk
  const deletedRows = await sql`
    delete from logs
    where received_at < ${cutoffs.deleteBefore}
    returning id
  `;

  const summary = toArchiveSummary({
    archiveBefore: cutoffs.archiveBefore,
    deleteBefore: cutoffs.deleteBefore,
    archivedCount: archivedRows.length,
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
