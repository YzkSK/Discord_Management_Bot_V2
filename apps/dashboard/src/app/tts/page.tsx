import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getDashboardSession } from "../../auth";
import { getDashboardPageRole } from "../../dashboard-auth";
import { DashboardShell } from "../dashboard-shell";
import { TtsDashboard } from "./tts-dashboard";
import { TtsSettingsAction } from "./tts-settings-action";
import { TtsUserSettingsAction } from "./components/TtsUserSettingsModal";

export const dynamic = "force-dynamic";

export default async function TtsPage() {
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
      actions={
        <div className="flex items-center gap-2">
          <TtsUserSettingsAction guildId={guildId} />
          {(role === "admin" || role === "owner") && <TtsSettingsAction guildId={guildId} />}
        </div>
      }
      currentPath="/tts"
      description="TTS setup, dictionary, speaker overrides, and command shortcuts"
      guildId={guildId}
      guildName={guildName}
      role={role}
      session={session}
      title="TTS"
    >
      <TtsDashboard guildId={guildId} role={role} />
    </DashboardShell>
  );
}
