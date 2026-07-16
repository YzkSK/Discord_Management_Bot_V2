"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { ChannelSelect, type DashboardLoc, type SettingsResponse } from "./shared";

interface RecruitmentSettingsTabProps {
  recruitmentChannelId: string;
  settings: SettingsResponse;
  loc: DashboardLoc;
  onRecruitmentChannelIdChange: (value: string) => void;
}

export function RecruitmentSettingsTab({
  recruitmentChannelId,
  settings,
  loc,
  onRecruitmentChannelIdChange
}: RecruitmentSettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{loc.recruitmentSettings}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#b5bac1]">
          {loc.recruitmentChannelLabel}
          <ChannelSelect
            value={recruitmentChannelId}
            onChange={onRecruitmentChannelIdChange}
            channels={settings.availableTextChannels ?? []}
            placeholder={loc.recruitmentChannelPlaceholder}
          />
        </label>
      </CardContent>
    </Card>
  );
}
