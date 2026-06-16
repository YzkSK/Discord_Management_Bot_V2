import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getDashboardSession } from "../../auth";
import { getDashboardPageRole } from "../../dashboard-auth";
import { DashboardShell } from "../dashboard-shell";
import { TtsDashboard } from "./tts-dashboard";

export const dynamic = "force-dynamic";

export default async function TtsPage() {
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
      currentPath="/tts"
      description="TTS setup, dictionary, speaker overrides, and command shortcuts"
      guildId={guildId}
      guildName={guildName}
      role={role}
      session={session}
      title="TTS"
    >
      <TtsDashboard guildId={guildId} />
    </DashboardShell>
  );
}
