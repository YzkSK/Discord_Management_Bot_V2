import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getDashboardSession } from "../../auth";
import { getDashboardPageRole } from "../../dashboard-auth";
import { DashboardShell } from "../dashboard-shell";
import { HealthDashboard } from "./health-dashboard";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const session = await getDashboardSession();
  if (!session?.user) redirect("/login");

  const cookieStore = await cookies();
  const guildId = cookieStore.get("dashboard-guild-id")?.value;
  const guildNameRaw = cookieStore.get("dashboard-guild-name")?.value;
  const guildName = guildNameRaw ? decodeURIComponent(guildNameRaw) : null;

  if (!guildId) redirect("/guild");

  const role = await getDashboardPageRole(guildId);
  if (role !== "admin" && role !== "owner") notFound();

  return (
    <DashboardShell
      currentPath="/health"
      description="Dependency status, latency, and failure visibility"
      guildId={guildId}
      guildName={guildName}
      role={role}
      session={session}
      title="System Health"
    >
      <HealthDashboard />
    </DashboardShell>
  );
}
