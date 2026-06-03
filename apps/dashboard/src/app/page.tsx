import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CheckSquare, ChevronRight, Headphones, ScrollText, Settings } from "lucide-react";
import type { ReactNode } from "react";

import { getDashboardSession } from "../auth";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { DashboardShell } from "./dashboard-shell";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getDashboardSession();
  if (!session?.user) redirect("/login");

  const cookieStore = await cookies();
  const guildId = cookieStore.get("dashboard-guild-id")?.value;
  const guildName = cookieStore.get("dashboard-guild-name")?.value
    ? decodeURIComponent(cookieStore.get("dashboard-guild-name")!.value)
    : null;

  if (!guildId) redirect("/guild");

  return (
    <DashboardShell
      currentPath="/"
      description="Verification workflow and quick navigation"
      guildId={guildId}
      guildName={guildName}
      session={session}
      title="Overview"
    >
      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-green-400" />
              Verification Flow
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <OverviewStep
              body="Run /setup logs, /setup temp-vc, and /setup recruitment from Discord when you need fresh test targets."
              index="1"
              title="Prepare Discord"
            />
            <OverviewStep
              body="Use Logs presets to inspect message, voice, audit, Temp VC, and recruitment events."
              index="2"
              title="Inspect Events"
            />
            <OverviewStep
              body="Open Settings with the same guild to confirm access and logging configuration."
              index="3"
              title="Confirm Settings"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-zinc-400" />
              Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <QuickAction
              body="Review current calls, Temp VC ownership, and voice setup shortcuts."
              href="/voice"
              icon={<Headphones className="h-4 w-4" />}
              title="Voice"
            />
            <QuickAction
              body="Search events, switch presets, and inspect payload summaries."
              href="/logs"
              icon={<ScrollText className="h-4 w-4" />}
              title="Logs"
            />
            <QuickAction
              body="View and update access roles and log mode for the selected guild."
              href="/settings"
              icon={<Settings className="h-4 w-4" />}
              title="Settings"
            />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

function OverviewStep({ body, index, title }: { body: string; index: string; title: string }) {
  return (
    <div className="grid grid-cols-[28px_1fr] gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-500/10 text-xs font-bold text-green-400">
        {index}
      </div>
      <div>
        <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
        <p className="mt-0.5 text-xs leading-5 text-zinc-500">{body}</p>
      </div>
    </div>
  );
}

function QuickAction({
  body,
  href,
  icon,
  title
}: {
  body: string;
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <a
      className="flex items-start gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-3 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
      href={href}
    >
      <div className="mt-0.5 text-zinc-400">{icon}</div>
      <div>
        <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
        <p className="mt-0.5 text-xs leading-5 text-zinc-500">{body}</p>
      </div>
    </a>
  );
}
