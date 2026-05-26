import { redirect } from "next/navigation";
import { Server } from "lucide-react";

import { getDashboardSession } from "../../auth";
import { GuildSelector } from "./guild-selector";

export const dynamic = "force-dynamic";

export default async function GuildPage() {
  const session = await getDashboardSession();
  if (!session?.user) redirect("/login");

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-green-500/10">
            <Server className="h-4 w-4 text-green-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Select a Guild</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Only servers where you have management permissions and this bot is installed are shown.
            </p>
          </div>
        </div>
        <GuildSelector />
      </div>
    </main>
  );
}
