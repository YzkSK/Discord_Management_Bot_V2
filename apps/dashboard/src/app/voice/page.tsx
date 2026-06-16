import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getDashboardSession } from "../../auth";
import { getDashboardPageRole } from "../../dashboard-auth";
import { DashboardShell } from "../dashboard-shell";
import { VoiceDashboard } from "./voice-dashboard";

export const dynamic = "force-dynamic";

export default async function VoicePage() {
  const session = await getDashboardSession();
  if (!session?.user) redirect("/login");

  const cookieStore = await cookies();
  const guildId = cookieStore.get("dashboard-guild-id")?.value;
  const guildName = cookieStore.get("dashboard-guild-name")?.value
    ? decodeURIComponent(cookieStore.get("dashboard-guild-name")!.value)
    : null;

  if (!guildId) redirect("/guild");

  const role = await getDashboardPageRole(guildId);

  return (
    <DashboardShell
      currentPath="/voice"
      description="Current calls, Temp VC state, and setup shortcuts"
      guildId={guildId}
      guildName={guildName}
      role={role}
      session={session}
      title="Voice"
    >
      <VoiceDashboard guildId={guildId} />
    </DashboardShell>
  );
}
