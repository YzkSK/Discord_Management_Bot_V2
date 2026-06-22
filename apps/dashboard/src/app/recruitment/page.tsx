import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getDashboardSession } from "../../auth";
import { getDashboardPageRole } from "../../dashboard-auth";
import { DashboardShell } from "../dashboard-shell";
import { RecruitmentDashboard } from "./recruitment-dashboard";
import { RecruitmentSettingsAction } from "./recruitment-settings-action";

export const dynamic = "force-dynamic";

export default async function RecruitmentPage() {
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
      actions={role === "admin" || role === "owner" ? <RecruitmentSettingsAction guildId={guildId} /> : undefined}
      currentPath="/recruitment"
      description="Recruitment posts, status, participant counts, and setup shortcuts"
      guildId={guildId}
      guildName={guildName}
      role={role}
      session={session}
      title="Recruitment"
    >
      <RecruitmentDashboard guildId={guildId} userId={session.user.id ?? ""} role={role} />
    </DashboardShell>
  );
}
