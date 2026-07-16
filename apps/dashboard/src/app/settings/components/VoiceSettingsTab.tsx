"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { ChannelSelect, FeatureStatus, type DashboardLoc, type SettingsResponse } from "./shared";

interface VoiceSettingsTabProps {
  tempVcCreateChannelId: string;
  tempVcCategoryId: string;
  settings: SettingsResponse;
  loc: DashboardLoc;
  onTempVcCreateChannelIdChange: (value: string) => void;
  onTempVcCategoryIdChange: (value: string) => void;
}

export function VoiceSettingsTab({
  tempVcCreateChannelId,
  tempVcCategoryId,
  settings,
  loc,
  onTempVcCreateChannelIdChange,
  onTempVcCategoryIdChange
}: VoiceSettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{loc.tempVcSettings}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <FeatureStatus
          configured={settings.features.tempVc.configured}
          label={loc.tempVcSettings}
          loc={loc}
        />
        <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#b5bac1]">
          {loc.tempVcCreateChannelId}
          <ChannelSelect
            value={tempVcCreateChannelId}
            onChange={onTempVcCreateChannelIdChange}
            channels={settings.availableVoiceChannels ?? []}
            placeholder={loc.tempVcCreateChannelPlaceholder}
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#b5bac1]">
          {loc.tempVcCategoryId}
          <ChannelSelect
            value={tempVcCategoryId}
            onChange={onTempVcCategoryIdChange}
            channels={settings.availableCategories ?? []}
            placeholder={loc.tempVcCategoryPlaceholder}
          />
        </label>
      </CardContent>
    </Card>
  );
}
