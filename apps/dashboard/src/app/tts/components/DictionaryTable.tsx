"use client";

import { useState } from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../../../components/ui/table";
import type { getDashboardLocale } from "../../../lib/locale";

const PAGE_SIZE = 10;

export type TtsDictionaryScope = "guild" | "user";

export interface TtsDictionaryEntry {
  fromText: string;
  isEnabled: boolean;
  priority: number;
  scope: TtsDictionaryScope;
  toText: string;
  updatedAt: string;
  userId: string | null;
}

export function DictionaryTable({
  entries,
  loc
}: {
  entries: TtsDictionaryEntry[];
  loc: ReturnType<typeof getDashboardLocale>;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = query.trim()
    ? entries.filter(
        (e) =>
          e.fromText.toLowerCase().includes(query.toLowerCase()) ||
          e.toText.toLowerCase().includes(query.toLowerCase())
      )
    : entries;

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
          placeholder="変換前・変換後で検索..."
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-green-500 focus:outline-none"
        />
        {query && (
          <span className="shrink-0 text-xs text-zinc-500">
            {filtered.length} / {entries.length} 件
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-md border border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{loc.ttsScope}</TableHead>
              <TableHead>{loc.ttsFromText}</TableHead>
              <TableHead>{loc.ttsToText}</TableHead>
              <TableHead>{loc.ttsPriority}</TableHead>
              <TableHead>{loc.ttsEnabled}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-zinc-600" colSpan={5}>
                  {query ? "検索結果がありません" : `${loc.ttsDictionaryEntries}: 0`}
                </TableCell>
              </TableRow>
            ) : visible.map((entry) => (
              <TableRow key={`${entry.scope}:${entry.userId ?? ""}:${entry.fromText}`}>
                <TableCell>
                  <Badge variant="outline">{entry.scope}</Badge>
                </TableCell>
                <TableCell className="break-all font-mono text-xs">
                  {entry.fromText}
                </TableCell>
                <TableCell className="break-all font-mono text-xs">
                  {entry.toText}
                </TableCell>
                <TableCell>{entry.priority}</TableCell>
                <TableCell>
                  <Badge variant={entry.isEnabled ? "success" : "outline"}>
                    {entry.isEnabled ? loc.ttsEnabled : loc.logModeDisabled}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-zinc-500">
            {safePage + 1} / {totalPages} ページ
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              type="button"
            >
              ‹ 前
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
