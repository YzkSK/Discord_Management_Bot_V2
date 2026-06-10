import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getDashboardSession } from "../../auth";
import { DashboardShell } from "../dashboard-shell";
import { HealthDashboard } from "./health-dashboard";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
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
      currentPath="/health"
      description="Dependency status, latency, and failure visibility"
      guildId={guildId}
      guildName={guildName}
      session={session}
      title="System Health"
    >
      <HealthDashboard />
    </DashboardShell>
  );
}
