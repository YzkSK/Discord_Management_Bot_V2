export type HealthStatus = "ok" | "error";

export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
  latencyMs?: number;
}

export type HealthCheckMap = Record<string, HealthCheckResult>;

export interface HealthReport {
  status: HealthStatus;
  checkedAt: string;
  checks: HealthCheckMap;
}

export function summarizeHealthChecks(checks: HealthCheckMap): HealthStatus {
  return Object.values(checks).some((check) => check.status === "error")
    ? "error"
    : "ok";
}
