"use client";

import { Badge } from "../../../components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../../../components/ui/table";
import type { getDashboardLocale } from "../../../lib/locale";

const DICTIONARY_DISPLAY_LIMIT = 8;

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
  const visibleEntries = entries.slice(0, DICTIONARY_DISPLAY_LIMIT);

  return (
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
          {visibleEntries.length === 0 ? (
            <TableRow>
              <TableCell className="py-8 text-center text-zinc-600" colSpan={5}>
                {loc.ttsDictionaryEntries}: 0
              </TableCell>
            </TableRow>
          ) : visibleEntries.map((entry) => (
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
  );
}
