"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { Session } from "next-auth";
import {
  LayoutDashboard,
  Mic2,
  ClipboardList,
  Headphones,
  ScrollText,
  Settings,
  Activity,
  Menu,
  X,
} from "lucide-react";

import { AuthStatus } from "./auth-status";
import { getDashboardNavGroups } from "./dashboard-ui";

interface DashboardShellProps {
  actions?: ReactNode;
  children: ReactNode;
  currentPath: string;
  description?: string;
  guildId: string;
  guildName: string | null;
  role?: "viewer" | "admin" | "owner" | null | undefined;
  session: Session | null;
  title: string;
}

const icons: Record<string, ReactNode> = {
  "/": <LayoutDashboard className="h-4 w-4" />,
  "/voice": <Headphones className="h-4 w-4" />,
  "/recruitment": <ClipboardList className="h-4 w-4" />,
  "/tts": <Mic2 className="h-4 w-4" />,
  "/health": <Activity className="h-4 w-4" />,
  "/logs": <ScrollText className="h-4 w-4" />,
  "/settings": <Settings className="h-4 w-4" />,
};

const roleRank: Record<string, number> = { viewer: 1, admin: 2, owner: 3 };

function canSeeItem(itemMinRole: string | undefined, role: string | null | undefined) {
  if (!itemMinRole) return true;
  if (role === undefined) return true;
  if (!role) return false;
  return (roleRank[role] ?? 0) >= (roleRank[itemMinRole] ?? 99);
}

export function DashboardShell({
  actions,
  children,
  currentPath,
  description,
  guildId,
  guildName,
  role,
  session,
  title,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const allGroups = getDashboardNavGroups();
  const groups = allGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSeeItem(item.minRole, role))
  })).filter((group) => group.items.length > 0);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-5">
        <a className="flex items-center gap-2" href="/">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-500/10">
            <LayoutDashboard className="h-4 w-4 text-green-400" />
          </div>
          <span className="text-sm font-semibold text-zinc-100">Discord Bot</span>
        </a>
        <button
          className="rounded-md p-1 text-zinc-400 hover:text-zinc-100 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-4 mt-4 rounded-md border border-zinc-700 bg-zinc-800/40 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Guild
        </p>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-zinc-200" title={guildName ?? guildId}>
            {guildName ?? guildId}
          </p>
          <a
            className="shrink-0 text-xs text-zinc-500 hover:text-green-400"
            href="/guild"
          >
            変更
          </a>
        </div>
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto px-2">
        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = item.href === currentPath;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "mb-0.5 flex items-center gap-2.5 rounded-md border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm font-medium text-green-400"
                      : "mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  }
                >
                  {icons[item.href]}
                  {item.label}
                </a>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-4 pb-5 pt-4">
        <AuthStatus session={session} />
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-zinc-800 bg-zinc-900 transition-transform duration-200 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[240px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden border-r border-zinc-800 bg-zinc-900 lg:block">
          {sidebarContent}
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 py-4 backdrop-blur-sm md:px-6">
            <div className="flex items-center gap-3">
              <button
                className="rounded-md p-2.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-base font-semibold text-zinc-100">{title}</h1>
                {description && (
                  <p className="text-xs text-zinc-500">{description}</p>
                )}
              </div>
            </div>
            {actions && (
              <div className="flex items-center gap-2">{actions}</div>
            )}
          </header>
          <div className="flex-1 px-4 py-6 md:px-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
