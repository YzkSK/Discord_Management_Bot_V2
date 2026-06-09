"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { GuildLanguage } from "@discord-bot/shared";
import {
  ClipboardList,
  ExternalLink,
  ListChecks,
  Plus,
  UserRound,
  UsersRound
} from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../../components/ui/table";
import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";

type RecruitmentStatus = "open" | "full" | "closed";

interface RecruitmentItem {
  activeParticipantCount: number;
  autoClose: boolean;
  autoClosed: boolean;
  availableSlots: number;
  capacity: number;
  channelId: string;
  closedAt: string | null;
  content: string;
  createdAt: string;
  creatorId: string;
  genre: string;
  id: string;
  messageId: string | null;
  postUrl: string | null;
  status: RecruitmentStatus;
  updatedAt: string;
  voiceChannelId: string | null;
}

interface RecruitmentResponse {
  accessRole: string;
  closedCount: number;
  fullCount: number;
  guildId: string;
  openCount: number;
  recruitments: RecruitmentItem[];
  totalCount: number;
}

export function RecruitmentDashboard({ guildId }: { guildId: string }) {
  const [data, setData] = useState<RecruitmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uiLang] = useState<GuildLanguage>(detectBrowserLanguage);
  const loc = getDashboardLocale(uiLang);

  useEffect(() => {
    fetchRecruitments(guildId)
      .then(setData)
      .catch((e: unknown) => setError(toErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [guildId]);

  if (loading) {
    return <p className="text-sm text-zinc-500">{loc.loading}...</p>;
  }

  if (!data) {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {error ?? loc.recruitmentFailedToLoad}
      </div>
    );
  }

  return (
    <section className="grid max-w-6xl gap-4">
      <div className="grid gap-3 md:grid-cols-4">
        <RecruitmentMetric
          icon={<ClipboardList className="h-4 w-4 text-green-400" />}
          label={loc.recruitmentTableTitle}
          value={data.totalCount.toString()}
        />
        <RecruitmentMetric
          icon={<ListChecks className="h-4 w-4 text-green-400" />}
          label={loc.recruitmentOpen}
          value={data.openCount.toString()}
        />
        <RecruitmentMetric
          icon={<UsersRound className="h-4 w-4 text-zinc-400" />}
          label={loc.recruitmentFull}
          value={data.fullCount.toString()}
        />
        <RecruitmentMetric
          icon={<ExternalLink className="h-4 w-4 text-zinc-400" />}
          label={loc.recruitmentClosed}
          value={data.closedCount.toString()}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-green-400" />
            {loc.recruitmentTableTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecruitmentTable
            emptyText={loc.recruitmentNoItems}
            loc={loc}
            recruitments={data.recruitments}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{loc.voiceSetupShortcuts}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <RecruitmentShortcut
            body="/setup recruitment channel:<text channel>"
            href="/settings"
            label={loc.recruitmentSetupShortcut}
          />
          <RecruitmentShortcut
            body={loc.recruitmentCreateCommand}
            href="/logs?eventName=recruitment"
            label={loc.recruitmentPost}
          />
        </CardContent>
      </Card>
    </section>
  );
}

function RecruitmentMetric({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function RecruitmentTable({
  emptyText,
  loc,
  recruitments
}: {
  emptyText: string;
  loc: ReturnType<typeof getDashboardLocale>;
  recruitments: RecruitmentItem[];
}) {
  return (
    <div className="overflow-hidden rounded-md border border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{loc.recruitmentGenre}</TableHead>
            <TableHead>{loc.recruitmentStatus}</TableHead>
            <TableHead>{loc.recruitmentParticipants}</TableHead>
            <TableHead>{loc.recruitmentCreatorId}</TableHead>
            <TableHead>{loc.recruitmentVoiceChannelId}</TableHead>
            <TableHead>{loc.recruitmentUpdated}</TableHead>
            <TableHead>{loc.recruitmentPost}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recruitments.length === 0 ? (
            <TableRow>
              <TableCell className="py-8 text-center text-zinc-600" colSpan={7}>
                {emptyText}
              </TableCell>
            </TableRow>
          ) : recruitments.map((recruitment) => (
            <TableRow key={recruitment.id}>
              <TableCell>
                <div className="grid gap-1">
                  <span className="font-medium text-zinc-200">
                    {recruitment.genre}
                  </span>
                  <span className="line-clamp-2 max-w-[260px] text-xs text-zinc-500">
                    {recruitment.content}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge loc={loc} status={recruitment.status} />
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1 text-zinc-300">
                  <UsersRound className="h-3.5 w-3.5 text-zinc-500" />
                  {recruitment.activeParticipantCount}/{recruitment.capacity}
                </span>
              </TableCell>
              <TableCell className="break-all font-mono text-xs">
                <span className="inline-flex items-center gap-1">
                  <UserRound className="h-3.5 w-3.5 text-zinc-500" />
                  {recruitment.creatorId}
                </span>
              </TableCell>
              <TableCell className="break-all font-mono text-xs">
                {recruitment.voiceChannelId ?? "-"}
              </TableCell>
              <TableCell className="text-xs text-zinc-500">
                {formatDate(recruitment.updatedAt)}
              </TableCell>
              <TableCell>
                {recruitment.postUrl ? (
                  <a
                    className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300"
                    href={recruitment.postUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {loc.view}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="text-xs text-zinc-600">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusBadge({
  loc,
  status
}: {
  loc: ReturnType<typeof getDashboardLocale>;
  status: RecruitmentStatus;
}) {
  const label = {
    closed: loc.recruitmentClosed,
    full: loc.recruitmentFull,
    open: loc.recruitmentOpen
  }[status];

  return (
    <Badge variant={status === "open" ? "success" : "outline"}>{label}</Badge>
  );
}

function RecruitmentShortcut({
  body,
  href,
  label
}: {
  body: string;
  href: string;
  label: string;
}) {
  return (
    <a
      className="flex items-start justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-3 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
      href={href}
    >
      <div>
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        <p className="mt-1 break-all font-mono text-xs text-zinc-500">{body}</p>
      </div>
      <Button aria-label={label} size="icon" type="button" variant="ghost">
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </a>
  );
}

async function fetchRecruitments(
  guildId: string
): Promise<RecruitmentResponse> {
  const query = new URLSearchParams({ guildId });
  const response = await fetch(`/api/recruitments?${query.toString()}`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Failed to load recruitments (${response.status})`);
  }
  return (await response.json()) as RecruitmentResponse;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function toErrorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Recruitment request failed";
}
