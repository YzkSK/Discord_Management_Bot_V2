import { redirect } from "next/navigation";

import { requireDashboardPageSession } from "../../dashboard-auth";
import { DashboardShell } from "../dashboard-shell";

import { LogsExplorer } from "./logs-explorer";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const session = await requireDashboardPageSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardShell
      currentPath="/logs"
      description="Guild IDを指定して、Discord Gateway、Audit Log、TempVC、Recruitmentのイベントを検索します。"
      eyebrow="Operational Logs"
      session={session}
      title="Logs Explorer"
    >
      <LogsExplorer />
    </DashboardShell>
  );
}
