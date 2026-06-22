import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getDashboardSession } from "../../auth";
import { getDashboardPageRole } from "../../dashboard-auth";
import { DashboardShell } from "../dashboard-shell";
import { LogsExplorer } from "./logs-explorer";
import { LogSettingsAction } from "./log-settings-action";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
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
      actions={<LogSettingsAction guildId={guildId} />}
      currentPath="/logs"
      description="Event history and real-time notifications"
      guildId={guildId}
      guildName={guildName}
      role={role}
      session={session}
      title="Logs"
    >
      <LogsExplorer />
    </DashboardShell>
  );
}
