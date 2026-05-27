import { redirect } from "next/navigation";
import { Activity, ClipboardCheck, ListFilter, Settings } from "lucide-react";
import type { ReactNode } from "react";

import { getDashboardSession } from "../auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";

import { DashboardShell } from "./dashboard-shell";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getDashboardSession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardShell
      currentPath="/"
      description="Start from the guild you are testing, then move between logs and settings without losing context."
      eyebrow="Phase6 UI/UX"
      session={session}
      title="Operations Overview"
    >
      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-teal-700" />
              Verification Flow
            </CardTitle>
            <CardDescription>
              Follow this order when checking bot behavior in Docker.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
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
              body="Open Settings with the same guild ID to confirm access and logging configuration."
              index="3"
              title="Confirm Settings"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-teal-700" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Jump to the views used most during local verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <QuickAction
              body="Search events, switch presets, and inspect readable payload summaries."
              href="/logs"
              icon={<ListFilter className="h-4 w-4" />}
              title="Open Logs"
            />
            <QuickAction
              body="Check guild access and log mode for the selected server."
              href="/settings"
              icon={<Settings className="h-4 w-4" />}
              title="Open Settings"
            />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

function OverviewStep({
  body,
  index,
  title
}: {
  body: string;
  index: string;
  title: string;
}) {
  return (
    <div className="grid grid-cols-[36px_1fr] gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
      <Badge className="flex h-9 w-9 items-center justify-center rounded-md p-0">
        {index}
      </Badge>
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
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
      className="block rounded-md border border-slate-200 bg-slate-50 p-4 hover:border-teal-400 hover:bg-teal-50"
      href={href}
    >
      <h3 className="flex items-center gap-2 font-semibold text-teal-900">
        {icon}
        {title}
      </h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
    </a>
  );
}
