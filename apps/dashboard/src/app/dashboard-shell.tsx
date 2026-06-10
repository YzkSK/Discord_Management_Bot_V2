import type { ReactNode } from "react";
import type { Session } from "next-auth";
import {
  ClipboardList,
  Activity,
  Headphones,
  LayoutDashboard,
  Mic2,
  ScrollText,
  Settings
} from "lucide-react";

import { AuthStatus } from "./auth-status";
import { getDashboardNavItems } from "./dashboard-ui";

interface DashboardShellProps {
  actions?: ReactNode;
  children: ReactNode;
  currentPath: string;
  description?: string;
  guildId: string;
  guildName: string | null;
  session: Session | null;
  title: string;
}

export function DashboardShell({
  actions,
  children,
  currentPath,
  description,
  guildId,
  guildName,
  session,
  title
}: DashboardShellProps) {
  const navItems = getDashboardNavItems();
  const icons: Record<string, ReactNode> = {
    "/": <LayoutDashboard className="h-4 w-4" />,
    "/voice": <Headphones className="h-4 w-4" />,
    "/recruitment": <ClipboardList className="h-4 w-4" />,
    "/tts": <Mic2 className="h-4 w-4" />,
    "/health": <Activity className="h-4 w-4" />,
    "/logs": <ScrollText className="h-4 w-4" />,
    "/settings": <Settings className="h-4 w-4" />
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[240px_1fr]">
        <aside className="flex flex-col border-b border-zinc-800 bg-zinc-900 px-4 py-5 lg:border-b-0 lg:border-r">
          <a className="flex items-center gap-2" href="/">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-500/10">
              <LayoutDashboard className="h-4 w-4 text-green-400" />
            </div>
            <span className="text-sm font-semibold text-zinc-100">Discord Bot</span>
          </a>

          <div className="mt-4 rounded-md border border-zinc-700 bg-zinc-800/40 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Guild
            </p>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-zinc-200">
                {guildName ?? guildId}
              </p>
              <a
                className="shrink-0 text-xs text-zinc-500 hover:text-green-400"
                href="/guild"
              >
                change
              </a>
            </div>
          </div>

          <nav className="mt-4 flex flex-col gap-0.5">
            {navItems.map((item) => {
              const active = item.href === currentPath;
              return (
                <a
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "flex items-center gap-2.5 rounded-md border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm font-medium text-green-400"
                      : "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  }
                  href={item.href}
                  key={item.href}
                >
                  {icons[item.href]}
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="mt-auto pt-6">
            <AuthStatus session={session} />
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-6 py-4 backdrop-blur-sm">
            <div>
              <h1 className="text-base font-semibold text-zinc-100">{title}</h1>
              {description && (
                <p className="text-xs text-zinc-500">{description}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </header>
          <div className="flex-1 px-6 py-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
