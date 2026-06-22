"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Volume2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

interface PersonalSpeakerSetting {
  speakerId: number;
  updatedAt: string;
}

interface PersonalDictEntry {
  fromText: string;
  isEnabled: boolean;
  priority: number;
  toText: string;
}

export function TtsUserPersonalCard({
  guildId,
  guildDefaultSpeakerId,
}: {
  guildId: string;
  guildDefaultSpeakerId: number | null;
}) {
  const [speaker, setSpeaker] = useState<PersonalSpeakerSetting | null | undefined>(undefined);
  const [dictEntries, setDictEntries] = useState<PersonalDictEntry[] | undefined>(undefined);
  const [speakerMap, setSpeakerMap] = useState<Map<number, string>>(new Map());

  const load = useCallback(async () => {
    const [speakerRes, dictRes, listRes] = await Promise.all([
      fetch(`/api/panel/speaker?guildId=${encodeURIComponent(guildId)}`),
      fetch(`/api/panel/dictionary?guildId=${encodeURIComponent(guildId)}`),
      fetch(`/api/panel/speakers?guildId=${encodeURIComponent(guildId)}`),
    ]);

    if (speakerRes.ok) {
      const d = await speakerRes.json() as { setting: PersonalSpeakerSetting | null };
      setSpeaker(d.setting ?? null);
    }
    if (dictRes.ok) {
      const d = await dictRes.json() as { entries: PersonalDictEntry[] };
      setDictEntries(d.entries);
    }
    if (listRes.ok) {
      const d = await listRes.json() as { speakers: { id: number; label: string }[] };
      setSpeakerMap(new Map(d.speakers.map((s) => [s.id, s.label])));
    }
  }, [guildId]);

  useEffect(() => { void load(); }, [load]);

  const effectiveSpeakerId = speaker?.speakerId ?? guildDefaultSpeakerId;
  const effectiveSpeakerLabel = effectiveSpeakerId !== null
    ? (speakerMap.get(effectiveSpeakerId) ?? `#${effectiveSpeakerId}`)
    : null;
  const defaultSpeakerLabel = guildDefaultSpeakerId !== null
    ? (speakerMap.get(guildDefaultSpeakerId) ?? `#${guildDefaultSpeakerId}`)
    : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-[#c9cdfb]" />
            個人話者設定
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {speaker === undefined ? (
            <p className="text-xs text-[#80848e]">読み込み中...</p>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-md bg-[#2b2d31] px-3 py-2">
                <span className="text-xs text-[#b5bac1]">話者</span>
                <span className="text-sm font-semibold text-[#f2f3f5]">
                  {effectiveSpeakerLabel ?? "-"}
                </span>
              </div>
              {speaker ? (
                <p className="text-[10px] text-[#5865f2]">個人設定が適用されています</p>
              ) : (
                <p className="text-[10px] text-[#80848e]">
                  サーバーデフォルト
                  {defaultSpeakerLabel ? `（${defaultSpeakerLabel}）` : "（未設定）"}
                  を使用
                </p>
              )}
              <p className="text-[10px] text-[#80848e]">
                ヘッダーの「個人設定」から変更できます
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#c9cdfb]" />
            個人辞書
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {dictEntries === undefined ? (
            <p className="text-xs text-[#80848e]">読み込み中...</p>
          ) : dictEntries.length === 0 ? (
            <>
              <p className="text-xs text-[#80848e]">個人辞書エントリがありません</p>
              <p className="text-[10px] text-[#80848e]">
                ヘッダーの「個人設定」から登録できます
              </p>
            </>
          ) : (
            <div className="divide-y divide-[#1e1f22] overflow-hidden rounded-md border border-[#1e1f22]">
              {dictEntries.slice(0, 6).map((e) => (
                <div key={e.fromText} className="flex items-center gap-2 px-3 py-1.5">
                  <span className="flex-1 truncate font-mono text-xs text-[#dbdee1]">{e.fromText}</span>
                  <span className="shrink-0 text-[10px] text-[#80848e]">→</span>
                  <span className="flex-1 truncate font-mono text-xs text-[#dbdee1]">{e.toText}</span>
                </div>
              ))}
              {dictEntries.length > 6 && (
                <p className="px-3 py-1.5 text-[10px] text-[#80848e]">
                  他 {dictEntries.length - 6} 件...
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
