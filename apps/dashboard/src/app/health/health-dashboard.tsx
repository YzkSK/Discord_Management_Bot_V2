"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { GuildLanguage, HealthStatus } from "@discord-bot/shared";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  RefreshCw,
  Server,
  Volume2
} from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";
import { buildHealthSummary, type HealthDashboardSummary } from "../api/health/summary";

interface HealthReportResponse {
  checkedAt: string;
  checks: Record<string, {
    latencyMs: number;
    message?: string;
    status: HealthStatus;
  }>;
  status: HealthStatus;
}

export function HealthDashboard() {
  const [summary, setSummary] = useState<HealthDashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uiLang] = useState<GuildLanguage>(detectBrowserLanguage);
  const loc = getDashboardLocale(uiLang);

  const loadHealth = useCallback(async () => {
    setError(null);
    setRefreshing(true);
    try {
      const report = await fetchHealthReport();
      setSummary(buildHealthSummary(report));
    } catch (e: unknown) {
      setError(toErrorMessage(e));
      setSummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  if (loading) {
    return <p className="text-sm text-zinc-500">{loc.loading}...</p>;
  }

  if (!summary) {
    return (
      <section className="grid max-w-6xl gap-4">
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error ?? loc.healthFailedToLoad}
        </div>
        <Button onClick={() => void loadHealth()} type="button" variant="outline">
          <RefreshCw className="h-4 w-4" />
          {loc.healthRefresh}
        </Button>
      </section>
    );
  }

  return (
    <section className="grid max-w-6xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge
            className={summary.status === "ok"
              ? undefined
              : "border-red-500/30 bg-red-500/10 text-red-400"}
            variant={summary.status === "ok" ? "success" : "outline"}
          >
            {summary.status === "ok" ? loc.healthOk : loc.healthError}
          </Badge>
          <span className="text-xs text-zinc-500">
            {loc.healthCheckedAt}: {formatDate(summary.lastCheckedAt)}
          </span>
        </div>
        <Button
          disabled={refreshing}
          onClick={() => void loadHealth()}
          type="button"
          variant="outline"
        >
          <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {loc.healthRefresh}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <HealthMetric
          icon={summary.status === "ok"
            ? <CheckCircle2 className="h-4 w-4 text-green-400" />
            : <AlertTriangle className="h-4 w-4 text-red-400" />}
          label={loc.healthOverallStatus}
          value={summary.status === "ok" ? loc.healthOk : loc.healthError}
        />
        <HealthMetric
          icon={<Server className="h-4 w-4 text-green-400" />}
          label={loc.healthDependencies}
          value={summary.totalChecks.toString()}
        />
        <HealthMetric
          icon={<CheckCircle2 className="h-4 w-4 text-green-400" />}
          label={loc.healthHealthyServices}
          value={summary.okCount.toString()}
        />
        <HealthMetric
          icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
          label={loc.healthFailingServices}
          value={summary.errorCount.toString()}
        />
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {loc.healthDependencies}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summary.services.map((service) => (
            <ServiceTile key={service.name} service={service} loc={loc} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HealthMetric({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function ServiceTile({
  service,
  loc
}: {
  service: HealthDashboardSummary["services"][number];
  loc: ReturnType<typeof getDashboardLocale>;
}) {
  const isOk = service.status === "ok";
  const tileClass = isOk
    ? "border-green-500/20 bg-green-500/5"
    : "border-red-500/20 bg-red-500/5";
  const dotClass = isOk ? "bg-green-500" : "bg-red-500";
  const statusLabel = isOk ? loc.healthOk : loc.healthError;

  return (
    <div className={`rounded-lg border p-4 ${tileClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getServiceIcon(service.name)}
          <p className="text-sm font-medium text-zinc-200 capitalize">
            {service.name}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-[50%] ${dotClass}`} />
          <span className="text-xs text-zinc-400">{statusLabel}</span>
        </div>
      </div>
      {service.latencyMs !== null && (
        <p className="mt-2 font-mono text-xs text-zinc-500">
          {service.latencyMs}ms
        </p>
      )}
      {service.message && (
        <p className="mt-1 text-xs text-zinc-600 break-all">{service.message}</p>
      )}
    </div>
  );
}

function getServiceIcon(name: string) {
  if (name === "database") return <Database className="h-3.5 w-3.5 text-zinc-500" />;
  if (name === "voicevox") return <Volume2 className="h-3.5 w-3.5 text-zinc-500" />;
  if (name === "redis") return <Clock3 className="h-3.5 w-3.5 text-zinc-500" />;
  return <Server className="h-3.5 w-3.5 text-zinc-500" />;
}

async function fetchHealthReport(): Promise<HealthReportResponse> {
  const response = await fetch("/api/health", { cache: "no-store" });
  if (!response.ok && response.status !== 503) {
    throw new Error(`Failed to load health state (${response.status})`);
  }
  return (await response.json()) as HealthReportResponse;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function toErrorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Health request failed";
}
