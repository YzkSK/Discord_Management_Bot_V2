import { redirect } from "next/navigation";

import { requireDashboardPageSession } from "../../dashboard-auth";

import { SettingsPanel } from "./settings-panel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireDashboardPageSession();

  if (!session) {
    redirect("/login");
  }

  return <SettingsPanel />;
}
