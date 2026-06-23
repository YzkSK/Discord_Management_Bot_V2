"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import {
  PersonalSpeakerSection,
  PersonalDictionarySection,
} from "../../tts/components/TtsUserSettingsModal";

export function TtsPersonalTab({ guildId }: { guildId: string }) {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>個人話者設定</CardTitle>
        </CardHeader>
        <CardContent>
          <PersonalSpeakerSection guildId={guildId} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>個人辞書</CardTitle>
        </CardHeader>
        <CardContent>
          <PersonalDictionarySection guildId={guildId} />
        </CardContent>
      </Card>
    </div>
  );
}
