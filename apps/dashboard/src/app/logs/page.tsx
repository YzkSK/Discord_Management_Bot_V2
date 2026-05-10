import { redirect } from "next/navigation";

import { requireDashboardPageSession } from "../../dashboard-auth";

import { LogsExplorer } from "./logs-explorer";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const session = await requireDashboardPageSession();

  if (!session) {
    redirect("/login");
  }

  return <LogsExplorer />;
}
