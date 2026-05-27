import {
  summarizeHealthChecks,
  type HealthCheckMap,
  type HealthCheckResult,
  type HealthReport,
  type HealthStatus
} from "@discord-bot/shared";

export type HealthProbe = () => Promise<HealthCheckResult>;

export interface CreateHealthReportInput {
  checkedAt?: Date;
  probes: Record<string, HealthProbe>;
}

export async function createHealthReport(
  input: CreateHealthReportInput
): Promise<HealthReport> {
  const checks: HealthCheckMap = {};

  for (const [name, probe] of Object.entries(input.probes)) {
    checks[name] = await probe();
  }

  return {
    status: summarizeHealthChecks(checks),
    checkedAt: (input.checkedAt ?? new Date()).toISOString(),
    checks
  };
}

export function toHealthHttpStatus(status: HealthStatus) {
  return status === "ok" ? 200 : 503;
}

export async function measureHealthProbe(
  probe: () => Promise<void>
): Promise<HealthCheckResult> {
  const startedAt = Date.now();

  try {
    await probe();

    return {
      status: "ok",
      latencyMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      status: "error",
      message: normalizeErrorMessage(error),
      latencyMs: Date.now() - startedAt
    };
  }
}

function normalizeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
