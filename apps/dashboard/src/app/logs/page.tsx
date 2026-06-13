import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getDashboardSession } from "../../auth";
import { DashboardShell } from "../dashboard-shell";
import { LogsExplorer } from "./logs-explorer";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
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
      currentPath="/logs"
      description="Event history and real-time notifications"
      guildId={guildId}
      guildName={guildName}
      session={session}
      title="Logs"
    >
      <LogsExplorer />
    </DashboardShell>
  );
}
