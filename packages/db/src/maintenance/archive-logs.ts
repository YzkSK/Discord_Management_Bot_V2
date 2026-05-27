import { join, win32 } from "node:path";

export interface ArchiveCutoffs {
  archiveBefore: Date;
  deleteBefore: Date;
}

export interface ArchiveSummaryInput {
  archiveBefore: Date;
  deleteBefore: Date;
  archivedCount: number;
  deletedCount: number;
  outputPath: string;
}

export interface ArchiveSummary {
  archiveBefore: string;
  deleteBefore: string;
  archivedCount: number;
  deletedCount: number;
  outputPath: string;
}

export function calculateArchiveCutoffs(now = new Date()): ArchiveCutoffs {
  return {
    archiveBefore: subtractUtcDays(now, 180),
    deleteBefore: subtractUtcDays(now, 365)
  };
}

export function createArchiveFileName(now = new Date()) {
  const timestamp = now
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/:/g, "-");

  return `logs_${timestamp}.json.gz`;
}

export function resolveArchiveDir(input: {
  env?: Partial<Record<"ARCHIVE_DIR" | "INIT_CWD", string>>;
  cwd?: string;
} = {}) {
  const env = input.env ?? process.env;

  if (env.ARCHIVE_DIR) {
    return env.ARCHIVE_DIR;
  }

  const baseDirectory = env.INIT_CWD ?? input.cwd ?? process.cwd();
  const joinPath = isWindowsPath(baseDirectory) ? win32.join : join;

  return joinPath(baseDirectory, "backups", "archive");
}

export function toArchiveSummary(input: ArchiveSummaryInput): ArchiveSummary {
  return {
    archiveBefore: input.archiveBefore.toISOString(),
    deleteBefore: input.deleteBefore.toISOString(),
    archivedCount: input.archivedCount,
    deletedCount: input.deletedCount,
    outputPath: input.outputPath
  };
}

function subtractUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() - days);
  return next;
}

function isWindowsPath(path: string) {
  return /^[a-zA-Z]:[\\/]/.test(path) || path.includes("\\");
}
