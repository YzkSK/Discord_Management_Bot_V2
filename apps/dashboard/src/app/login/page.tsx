import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";

import { getDashboardSession } from "../../auth";
import { Card, CardContent } from "../../components/ui/card";
import { LoginActions } from "./login-actions";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getDashboardSession();
  if (session?.user) redirect("/guild");

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-500/10">
            <LayoutDashboard className="h-5 w-5 text-green-400" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-zinc-100">Discord Bot Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-500">Sign in with your Discord account to continue</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-5">
            <LoginActions />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
