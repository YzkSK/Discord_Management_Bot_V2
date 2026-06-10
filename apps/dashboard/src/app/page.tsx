import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getDashboardSession } from "../auth";
import { DashboardShell } from "./dashboard-shell";
import { OverviewClient } from "./overview-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
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
      currentPath="/"
      description="サーバーのアクティビティと KPI"
      guildId={guildId}
      guildName={guildName}
      session={session}
      title="概要"
    >
      <OverviewClient guildId={guildId} />
    </DashboardShell>
  );
}
