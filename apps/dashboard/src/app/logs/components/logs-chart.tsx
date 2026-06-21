"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { getEventColor } from "../../../lib/event-display";
import type { LogItem } from "../hooks/use-logs-data";

const CHART_COLORS: Record<string, string> = {
  blue: "var(--chart-blue)",
  purple: "var(--chart-purple)",
  teal: "var(--chart-teal)",
  green: "var(--chart-emerald)",
  red: "var(--chart-red)",
  orange: "var(--chart-amber)",
  sky: "var(--chart-sky)",
  gray: "var(--chart-muted)",
};

const COLOR_LABELS: Record<string, string> = {
  blue:   "Messages",
  purple: "Voice / Call",
  teal:   "Temp VC",
  green:  "Recruitment",
  sky:    "TTS",
  red:    "System",
  orange: "Audit",
  gray:   "Config / Dashboard",
};

const MS_PER_HOUR = 3_600_000;
const PEAK_HOURS = 24;

export function LogsChart({ logs }: { logs: LogItem[] }) {
  const chartData = useMemo(() => {
    const now = Date.now();
    const bins: Record<string, Record<string, number>> = {};
    for (let h = PEAK_HOURS - 1; h >= 0; h--) {
      const label = `${new Date(now - h * MS_PER_HOUR).getHours()}時`;
      bins[label] = {};
    }
    logs.forEach((log) => {
      const d = new Date(log.receivedAt);
      if (now - d.getTime() > PEAK_HOURS * MS_PER_HOUR) return;
      const label = `${d.getHours()}時`;
      const colorKey = getEventColor(log.eventName);
      bins[label] = bins[label] ?? {};
      bins[label][colorKey] = (bins[label][colorKey] ?? 0) + 1;
    });
    return Object.entries(bins).map(([hour, counts]) => ({ hour, ...counts }));
  }, [logs]);

  return (
    <div className="rounded-xl border border-[#1e1f22] bg-[#2b2d31] shadow-sm p-4">
      <p className="mb-3 text-xs font-medium text-[#80848e]">
        直近24時間のイベント頻度
      </p>
      <ResponsiveContainer width="100%" height={80}>
        <BarChart
          data={chartData}
          margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
        >
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 10, fill: "var(--chart-axis-tick)" }}
            tickLine={false}
            axisLine={false}
            interval={3}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--chart-axis-tick)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--chart-tooltip-bg)",
              border: "1px solid var(--chart-tooltip-border)",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--chart-tooltip-label)" }}
          />
          {Object.entries(CHART_COLORS).map(([key, color]) => (
            <Bar
              key={key}
              dataKey={key}
              name={COLOR_LABELS[key] ?? key}
              stackId="a"
              fill={color}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
