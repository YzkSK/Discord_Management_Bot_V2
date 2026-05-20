import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { getDashboardSession } from "../../auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../components/ui/card";

import { LoginActions } from "./login-actions";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getDashboardSession();

  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-700" />
            Sign in to the dashboard
          </CardTitle>
          <CardDescription>
            Use your Discord account to start a dashboard session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginActions />
        </CardContent>
      </Card>
    </main>
  );
}
