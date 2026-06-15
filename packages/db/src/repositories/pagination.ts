export function clampLimit(
  limit: number | undefined,
  defaultLimit: number,
  maxLimit: number
): number {
  if (limit === undefined || !Number.isFinite(limit)) {
    return defaultLimit;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), maxLimit);
}
