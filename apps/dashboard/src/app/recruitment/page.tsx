import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getDashboardSession } from "../../auth";
import { DashboardShell } from "../dashboard-shell";
import { RecruitmentDashboard } from "./recruitment-dashboard";

export const dynamic = "force-dynamic";

export default async function RecruitmentPage() {
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
      currentPath="/recruitment"
      description="Recruitment posts, status, participant counts, and setup shortcuts"
      guildId={guildId}
      guildName={guildName}
      session={session}
      title="Recruitment"
    >
      <RecruitmentDashboard guildId={guildId} />
    </DashboardShell>
  );
}
