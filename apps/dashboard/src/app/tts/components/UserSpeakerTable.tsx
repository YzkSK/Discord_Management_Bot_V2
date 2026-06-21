"use client";

import { useState } from "react";
import { Button } from "../../../components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../../../components/ui/table";
import type { getDashboardLocale } from "../../../lib/locale";
import { usePreviewAudio } from "./usePreviewAudio";

const PAGE_SIZE = 10;

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
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const { playingId, playPreview } = usePreviewAudio();

  const filtered = query.trim()
    ? userSpeakers.filter((s) => s.userId.includes(query.trim()))
    : userSpeakers;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function handleQuery(q: string) {
    setQuery(q);
    setPage(0);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          placeholder="ユーザーIDで検索..."
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
        />
        {query && (
          <span className="shrink-0 text-xs text-slate-500">
            {filtered.length} / {userSpeakers.length} 件
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-md border border-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{loc.accessGrantUserId}</TableHead>
              <TableHead scope="col">{loc.ttsSpeakerId}</TableHead>
              <TableHead scope="col">{loc.updated}</TableHead>
              <TableHead scope="col"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-slate-600" colSpan={4}>
                  {query ? "検索結果がありません" : `${loc.ttsUserSpeakers}: 0`}
                </TableCell>
              </TableRow>
            ) : visible.map((speaker) => (
              <TableRow key={speaker.userId}>
                <TableCell className="break-all font-mono text-xs text-slate-400">
                  {speaker.userId}
                </TableCell>
                <TableCell>{speaker.speakerId}</TableCell>
                <TableCell className="text-xs text-slate-500">{speaker.updatedAt}</TableCell>
                <TableCell>
                  <Button
                    aria-label={`話老ED ${speaker.speakerId} を試聴`}
                    disabled={playingId !== null}
                    onClick={() => void playPreview(speaker.speakerId)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {playingId === speaker.speakerId ? "再生中..." : "試聴"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-slate-500">
            {safePage + 1} / {totalPages} ペ�Eジ
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              type="button"
            >
              ‹ 剁E
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(safePage + 1)}
              type="button"
            >
              次 ›
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
