import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getDashboardSession } from "../../auth";
import { getDashboardPageRole } from "../../dashboard-auth";
import { DashboardShell } from "../dashboard-shell";
import { SettingsPanel } from "./settings-panel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getDashboardSession();
  if (!session?.user) redirect("/login");

  const cookieStore = await cookies();
  const guildId = cookieStore.get("dashboard-guild-id")?.value;
  const guildNameRaw = cookieStore.get("dashboard-guild-name")?.value;
  const guildName = guildNameRaw ? decodeURIComponent(guildNameRaw) : null;

  if (!guildId) redirect("/guild");

  const role = await getDashboardPageRole(guildId);

  return (
    <DashboardShell
      currentPath="/settings"
      description="Server and personal settings"
      guildId={guildId}
      guildName={guildName}
      role={role}
      session={session}
      title="Settings"
    >
      <SettingsPanel guildId={guildId} role={role} />
    </DashboardShell>
  );
}
