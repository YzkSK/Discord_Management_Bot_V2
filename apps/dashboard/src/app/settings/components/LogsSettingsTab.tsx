"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Select } from "../../../components/ui/select";
import type { DashboardLoc } from "./shared";

interface LogsSettingsTabProps {
  logMode: string;
  logModeOptions: { label: string; value: string }[];
  loc: DashboardLoc;
  onLogModeChange: (value: string) => void;
}

export function LogsSettingsTab({
  logMode,
  logModeOptions,
  loc,
  onLogModeChange,
}: LogsSettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{loc.logsSettings}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#b5bac1]">
          {loc.logMode}
          <Select onChange={(e) => onLogModeChange(e.target.value)} value={logMode}>
            {logModeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </label>
      </CardContent>
    </Card>
  );
}
