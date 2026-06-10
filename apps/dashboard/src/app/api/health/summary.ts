import type { HealthReport, HealthStatus } from "@discord-bot/shared";

export interface HealthServiceSummary {
  latencyMs: number | null;
  message: string | null;
  name: string;
  status: HealthStatus;
}

export interface HealthDashboardSummary {
  errorCount: number;
  lastCheckedAt: string;
  okCount: number;
  services: HealthServiceSummary[];
  status: HealthStatus;
  totalChecks: number;
}

export function buildHealthSummary(report: HealthReport): HealthDashboardSummary {
  const services = Object.entries(report.checks).map(([name, check]) => ({
    latencyMs: check.latencyMs ?? null,
    message: check.message ?? null,
    name,
    status: check.status
  }));
  const okCount = services.filter((service) => service.status === "ok").length;
  const errorCount = services.length - okCount;

  return {
    errorCount,
    lastCheckedAt: report.checkedAt,
    okCount,
    services,
    status: report.status,
    totalChecks: services.length
  };
}
