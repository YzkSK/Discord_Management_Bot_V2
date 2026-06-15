"use client";

import { Button } from "../../../components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../../../components/ui/table";
import type { getDashboardLocale } from "../../../lib/locale";
import { usePreviewAudio } from "./usePreviewAudio";

const USER_SPEAKER_DISPLAY_LIMIT = 8;

export interface TtsUserSpeaker {
  speakerId: number;
  updatedAt: string;
  userId: string;
}

export function UserSpeakerTable({
  loc,
  userSpeakers
}: {
  loc: ReturnType<typeof getDashboardLocale>;
  userSpeakers: TtsUserSpeaker[];
}) {
  const visibleSpeakers = userSpeakers.slice(0, USER_SPEAKER_DISPLAY_LIMIT);
  const { playingId, playPreview } = usePreviewAudio();

  return (
    <div className="overflow-hidden rounded-md border border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{loc.accessGrantUserId}</TableHead>
            <TableHead>{loc.ttsSpeakerId}</TableHead>
            <TableHead>{loc.updated}</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleSpeakers.length === 0 ? (
            <TableRow>
              <TableCell className="py-8 text-center text-zinc-600" colSpan={4}>
                {loc.ttsUserSpeakers}: 0
              </TableCell>
            </TableRow>
          ) : visibleSpeakers.map((speaker) => (
            <TableRow key={speaker.userId}>
              <TableCell className="break-all font-mono text-xs text-zinc-400">
                {speaker.userId}
              </TableCell>
              <TableCell>{speaker.speakerId}</TableCell>
              <TableCell className="text-xs text-zinc-500">{speaker.updatedAt}</TableCell>
              <TableCell>
                <Button
                  disabled={playingId !== null}
                  onClick={() => void playPreview(speaker.speakerId)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {playingId === speaker.speakerId ? "..." : "試聴"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
