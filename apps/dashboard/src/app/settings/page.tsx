import { redirect } from "next/navigation";

import { requireDashboardPageSession } from "../../dashboard-auth";
import { DashboardShell } from "../dashboard-shell";

import { SettingsPanel } from "./settings-panel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireDashboardPageSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardShell
      currentPath="/settings"
      description="Review dashboard access state and logging mode for a guild."
      eyebrow="Guild Configuration"
      session={session}
      title="Settings"
    >
      <SettingsPanel />
    </DashboardShell>
  );
}
