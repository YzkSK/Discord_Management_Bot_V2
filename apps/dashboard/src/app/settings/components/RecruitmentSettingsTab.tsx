"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { ChannelSelect, FeatureStatus, type DashboardLoc, type SettingsResponse } from "./shared";

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
        <FeatureStatus
          configured={settings.features.recruitment.configured}
          label={loc.recruitmentSettings}
          loc={loc}
        />
        <div>
          <label className="block text-sm font-medium mb-1">{loc.recruitmentChannelLabel}</label>
          <ChannelSelect
            value={recruitmentChannelId}
            onChange={onRecruitmentChannelIdChange}
            channels={settings.availableTextChannels ?? []}
            placeholder={loc.recruitmentChannelPlaceholder}
          />
        </div>
      </CardContent>
    </Card>
  );
}
