"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { UserMention } from "../../../components/user-mention";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../../../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import {
  ChannelSelect,
  FeatureStatus,
  ttsDictionaryKey,
  type DashboardLoc,
  type SettingsResponse,
  type TtsDictionaryEntry,
  type TtsSettingsResponse
} from "./shared";

interface TtsSettingsTabProps {
  settings: SettingsResponse;
  ttsSettings: TtsSettingsResponse | null;
  ttsTextChannelId: string;
  ttsDefaultSpeakerId: string;
  ttsUserSpeakerUserId: string;
  ttsUserSpeakerId: string;
  ttsDictionaryScope: "guild" | "user";
  ttsDictionaryUserId: string;
  ttsDictionaryFromText: string;
  ttsDictionaryToText: string;
  ttsDictionaryPriority: string;
  ttsDictionaryEnabled: boolean;
  canEditTts: boolean;
  savingTtsDictionary: boolean;
  savingTtsSpeaker: boolean;
  loc: DashboardLoc;
  onTtsTextChannelIdChange: (value: string) => void;
  onTtsDefaultSpeakerIdChange: (value: string) => void;
  onTtsUserSpeakerUserIdChange: (value: string) => void;
  onTtsUserSpeakerIdChange: (value: string) => void;
  onTtsDictionaryScopeChange: (value: "guild" | "user") => void;
  onTtsDictionaryUserIdChange: (value: string) => void;
  onTtsDictionaryFromTextChange: (value: string) => void;
  onTtsDictionaryToTextChange: (value: string) => void;
  onTtsDictionaryPriorityChange: (value: string) => void;
  onTtsDictionaryEnabledChange: (value: boolean) => void;
  onSaveTtsDefaultSpeaker: () => void;
  onSaveTtsUserSpeaker: () => void;
  onDeleteTtsSpeaker: (input: { target: "guild-default" | "user"; userId?: string }) => void;
  onSaveTtsDictionaryEntry: () => void;
  onDeleteTtsDictionary: (entry: TtsDictionaryEntry) => void;
}

export function TtsSettingsTab({
  settings,
  ttsSettings,
  ttsTextChannelId,
  ttsDefaultSpeakerId,
  ttsUserSpeakerUserId,
  ttsUserSpeakerId,
  ttsDictionaryScope,
  ttsDictionaryUserId,
  ttsDictionaryFromText,
  ttsDictionaryToText,
  ttsDictionaryPriority,
  ttsDictionaryEnabled,
  canEditTts,
  savingTtsDictionary,
  savingTtsSpeaker,
  loc,
  onTtsTextChannelIdChange,
  onTtsDefaultSpeakerIdChange,
  onTtsUserSpeakerUserIdChange,
  onTtsUserSpeakerIdChange,
  onTtsDictionaryScopeChange,
  onTtsDictionaryUserIdChange,
  onTtsDictionaryFromTextChange,
  onTtsDictionaryToTextChange,
  onTtsDictionaryPriorityChange,
  onTtsDictionaryEnabledChange,
  onSaveTtsDefaultSpeaker,
  onSaveTtsUserSpeaker,
  onDeleteTtsSpeaker,
  onSaveTtsDictionaryEntry,
  onDeleteTtsDictionary
}: TtsSettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{loc.ttsSettings}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <FeatureStatus
          configured={settings.features.tts.configured}
          label={loc.ttsSettings}
          loc={loc}
        />
        <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {loc.ttsTextChannelId}
          <ChannelSelect
            value={ttsTextChannelId}
            onChange={onTtsTextChannelIdChange}
            channels={settings.availableTextChannels ?? []}
            placeholder="TTSチャンネルを選択"
          />
        </label>

        <div className="grid gap-3 border-t border-slate-800 pt-3">
          <p className="text-xs font-semibold text-slate-300">{loc.ttsSpeakerDefault}</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <Input
              disabled={!canEditTts}
              onChange={(e) => onTtsDefaultSpeakerIdChange(e.target.value)}
              value={ttsDefaultSpeakerId}
            />
            <Button
              disabled={!canEditTts || savingTtsSpeaker}
              onClick={onSaveTtsDefaultSpeaker}
              size="sm"
              type="button"
            >
              <Save className="h-3.5 w-3.5" />
              {loc.saveChanges}
            </Button>
            <Button
              disabled={!canEditTts || savingTtsSpeaker || !ttsSettings?.guildDefaultSpeaker}
              onClick={() => onDeleteTtsSpeaker({ target: "guild-default" })}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid gap-3 border-t border-slate-800 pt-3">
          <p className="text-xs font-semibold text-slate-300">{loc.ttsUserSpeakers}</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
            <Input
              disabled={!canEditTts}
              onChange={(e) => onTtsUserSpeakerUserIdChange(e.target.value)}
              placeholder={loc.accessGrantUserId}
              value={ttsUserSpeakerUserId}
            />
            <Input
              disabled={!canEditTts}
              onChange={(e) => onTtsUserSpeakerIdChange(e.target.value)}
              placeholder={loc.ttsSpeakerId}
              value={ttsUserSpeakerId}
            />
            <Button
              disabled={!canEditTts || savingTtsSpeaker}
              onClick={onSaveTtsUserSpeaker}
              size="sm"
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              {loc.saveChanges}
            </Button>
          </div>
          <div className="overflow-hidden rounded-md border border-slate-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{loc.accessGrantUserId}</TableHead>
                  <TableHead className="w-28">{loc.ttsSpeakerId}</TableHead>
                  <TableHead className="w-16">{loc.accessGrantAction}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!ttsSettings?.userSpeakers.length ? (
                  <TableRow>
                    <TableCell className="py-5 text-center text-slate-600" colSpan={3}>
                      {loc.notConfigured}
                    </TableCell>
                  </TableRow>
                ) : ttsSettings.userSpeakers.map((speaker) => (
                  <TableRow key={speaker.userId}>
                    <TableCell>
                      {speaker.userId
                        ? <UserMention userId={speaker.userId} actorName={null} />
                        : <span className="font-mono text-xs text-slate-500">—</span>}
                    </TableCell>
                    <TableCell>{speaker.speakerId}</TableCell>
                    <TableCell>
                      <Button
                        disabled={!canEditTts || savingTtsSpeaker}
                        onClick={() => {
                          if (speaker.userId) {
                            onDeleteTtsSpeaker({ target: "user", userId: speaker.userId });
                          }
                        }}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="grid gap-3 border-t border-slate-800 pt-3">
          <p className="text-xs font-semibold text-slate-300">{loc.ttsDictionary}</p>
          <div className="grid gap-2 sm:grid-cols-[110px_1fr_1fr]">
            <Select
              disabled={!canEditTts}
              onChange={(e) => onTtsDictionaryScopeChange(e.target.value === "user" ? "user" : "guild")}
              value={ttsDictionaryScope}
            >
              <option value="guild">guild</option>
              <option value="user">user</option>
            </Select>
            <Input
              disabled={!canEditTts || ttsDictionaryScope === "guild"}
              onChange={(e) => onTtsDictionaryUserIdChange(e.target.value)}
              placeholder={loc.accessGrantUserId}
              value={ttsDictionaryUserId}
            />
            <Input
              disabled={!canEditTts}
              onChange={(e) => onTtsDictionaryPriorityChange(e.target.value)}
              placeholder={loc.ttsPriority}
              value={ttsDictionaryPriority}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              disabled={!canEditTts}
              onChange={(e) => onTtsDictionaryFromTextChange(e.target.value)}
              placeholder={loc.ttsFromText}
              value={ttsDictionaryFromText}
            />
            <Input
              disabled={!canEditTts}
              onChange={(e) => onTtsDictionaryToTextChange(e.target.value)}
              placeholder={loc.ttsToText}
              value={ttsDictionaryToText}
            />
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                checked={ttsDictionaryEnabled}
                disabled={!canEditTts}
                onChange={(e) => onTtsDictionaryEnabledChange(e.target.checked)}
                type="checkbox"
              />
              {loc.ttsEnabled}
            </label>
          </div>
          <div className="flex justify-end">
            <Button
              disabled={!canEditTts || savingTtsDictionary}
              onClick={onSaveTtsDictionaryEntry}
              size="sm"
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              {loc.saveChanges}
            </Button>
          </div>
          <div className="overflow-hidden rounded-md border border-slate-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">{loc.ttsScope}</TableHead>
                  <TableHead>{loc.ttsFromText}</TableHead>
                  <TableHead>{loc.ttsToText}</TableHead>
                  <TableHead className="w-20">{loc.ttsPriority}</TableHead>
                  <TableHead className="w-16">{loc.accessGrantAction}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!ttsSettings?.dictionaryEntries.length ? (
                  <TableRow>
                    <TableCell className="py-5 text-center text-slate-600" colSpan={5}>
                      {loc.notConfigured}
                    </TableCell>
                  </TableRow>
                ) : ttsSettings.dictionaryEntries.map((entry) => (
                  <TableRow key={ttsDictionaryKey(entry)}>
                    <TableCell>{entry.scope}</TableCell>
                    <TableCell className="break-all">{entry.fromText}</TableCell>
                    <TableCell className="break-all">{entry.toText}</TableCell>
                    <TableCell>{entry.priority}</TableCell>
                    <TableCell>
                      <Button
                        disabled={!canEditTts || savingTtsDictionary}
                        onClick={() => onDeleteTtsDictionary(entry)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
