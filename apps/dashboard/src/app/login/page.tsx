import { redirect } from "next/navigation";

import { getDashboardSession } from "../../auth";

import { LoginActions } from "./login-actions";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getDashboardSession();

  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <section className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="border-b border-slate-200 pb-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Dashboard Auth
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            Sign in to the dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Use your Discord account to start a dashboard session.
          </p>
        </header>

        <LoginActions />
      </section>
    </main>
  );
}
