import type { ReactNode } from "react";
import type { Session } from "next-auth";

import { AuthStatus } from "./auth-status";
import { getDashboardNavItems } from "./dashboard-ui";

interface DashboardShellProps {
  actions?: ReactNode;
  children: ReactNode;
  currentPath: string;
  description: string;
  eyebrow: string;
  session: Session | null;
  title: string;
}

export function DashboardShell({
  actions,
  children,
  currentPath,
  description,
  eyebrow,
  session,
  title
}: DashboardShellProps) {
  const navItems = getDashboardNavItems();

  return (
    <main className="min-h-screen bg-[#0f141b] text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[240px_1fr]">
        <aside className="border-b border-slate-800 bg-[#111821] px-5 py-5 lg:border-b-0 lg:border-r">
          <a className="block" href="/">
            <p className="text-xs font-semibold uppercase text-teal-300">
              Discord Bot
            </p>
            <p className="mt-2 text-lg font-semibold text-white">Dashboard</p>
          </a>

          <nav className="mt-6 grid gap-2">
            {navItems.map((item) => {
              const active = item.href === currentPath;

              return (
                <a
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "block rounded border border-teal-500 bg-teal-500/15 px-3 py-3 text-sm font-semibold text-teal-100"
                      : "block rounded border border-transparent px-3 py-3 text-sm font-semibold text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                  }
                  href={item.href}
                  key={item.href}
                >
                  <span>{item.label}</span>
                  <span className="mt-1 block text-xs font-normal text-slate-400">
                    {item.description}
                  </span>
                </a>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 px-5 py-6 lg:px-8">
          <header className="flex flex-col gap-5 border-b border-slate-800 pb-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase text-teal-300">
                {eyebrow}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {description}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {actions}
              <AuthStatus session={session} />
            </div>
          </header>

          <div className="py-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
