"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  "/": <LayoutDashboard className="h-4 w-4 shrink-0" />,
  "/voice": <Headphones className="h-4 w-4 shrink-0" />,
  "/recruitment": <ClipboardList className="h-4 w-4 shrink-0" />,
  "/tts": <Mic2 className="h-4 w-4 shrink-0" />,
  "/health": <Activity className="h-4 w-4 shrink-0" />,
  "/logs": <ScrollText className="h-4 w-4 shrink-0" />,
  "/settings": <Settings className="h-4 w-4 shrink-0" />,
};

const roleRank: Record<string, number> = { viewer: 1, admin: 2, owner: 3 };

function canSeeItem(itemMinRole: string | undefined, role: string | null | undefined) {
  if (!itemMinRole) return true;
  if (role === undefined) return true;
  if (!role) return false;
  return (roleRank[role] ?? 0) >= (roleRank[itemMinRole] ?? 99);
}

const COLLAPSED_KEY = "sidebar-collapsed";

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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  }

  const allGroups = getDashboardNavGroups();
  const groups = allGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canSeeItem(item.minRole, role)),
    }))
    .filter((group) => group.items.length > 0);

  const sidebarContent = (collapsed: boolean) => (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className={`flex items-center pt-5 ${collapsed ? "justify-center px-0" : "justify-between px-4"}`}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href="/" className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
                  <LayoutDashboard className="h-4 w-4 text-indigo-400" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="right">Discord Bot</TooltipContent>
            </Tooltip>
          ) : (
            <>
              <a className="flex items-center gap-2" href="/">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10">
                  <LayoutDashboard className="h-4 w-4 text-indigo-400" />
                </div>
                <span className="text-sm font-semibold text-slate-100">Discord Bot</span>
              </a>
              <button
                className="rounded-md p-1 text-slate-400 hover:text-slate-100 lg:hidden"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Guild switcher */}
        {!collapsed && (
          <div className="mx-4 mt-4 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Guild
            </p>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-slate-200" title={guildName ?? guildId}>
                {guildName ?? guildId}
              </p>
              <a className="shrink-0 text-xs text-slate-500 hover:text-indigo-400" href="/guild">
                変更
              </a>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto mt-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="/guild"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                  aria-label="Switch guild"
                >
                  <Settings className="h-3.5 w-3.5" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="right">{guildName ?? guildId}</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Navigation */}
        <nav className={`mt-4 flex-1 overflow-y-auto ${collapsed ? "px-2" : "px-2"}`}>
          {groups.map((group) => (
            <div key={group.label} className="mb-4">
              {!collapsed && (
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const active = item.href === currentPath;
                const baseClass = "mb-0.5 flex items-center rounded-md text-sm font-medium transition-colors";
                const activeClass = `${baseClass} border-l-2 border-indigo-500 bg-indigo-500/10 text-indigo-400`;
                const inactiveClass = `${baseClass} text-slate-400 hover:bg-slate-800 hover:text-slate-100`;

                if (collapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <a
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={`${active ? activeClass : inactiveClass} justify-center px-0 py-2`}
                        >
                          {icons[item.href]}
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <a
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`${active ? activeClass : inactiveClass} gap-2.5 px-3 py-2`}
                  >
                    {icons[item.href]}
                    {item.label}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Auth + collapse button */}
        <div className={`pb-5 pt-4 ${collapsed ? "px-2" : "px-4"}`}>
          {!collapsed && <AuthStatus session={session} />}
          <button
            onClick={toggleCollapsed}
            className={`mt-3 flex w-full items-center justify-center rounded-md py-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors ${collapsed ? "" : "gap-1.5 text-xs"}`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>折りたたむ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </TooltipProvider>
  );

  const sidebarWidth = collapsed ? "lg:grid-cols-[64px_1fr]" : "lg:grid-cols-[240px_1fr]";
  const desktopSidebarWidth = collapsed ? "w-16" : "w-60";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-800 bg-slate-900 transition-transform duration-200 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent(false)}
      </aside>

      <div className={`mx-auto grid min-h-screen max-w-[1600px] ${sidebarWidth}`}>
        {/* Desktop sidebar */}
        <aside
          className={`hidden border-r border-slate-800 bg-slate-900 transition-all duration-200 lg:block ${desktopSidebarWidth}`}
        >
          {sidebarContent(collapsed)}
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-4 backdrop-blur-sm md:px-6">
            <div className="flex items-center gap-3">
              <button
                className="rounded-md p-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-base font-semibold text-slate-100">{title}</h1>
                {description && (
                  <p className="text-xs text-slate-500">{description}</p>
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
