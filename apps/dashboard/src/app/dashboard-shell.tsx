"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { Session } from "next-auth";
import {
  LayoutDashboard,
  Mic2,
  ClipboardList,
  Headphones,
  KeyRound,
  ScrollText,
  Settings,
  Activity,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
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
  "/settings": <KeyRound className="h-4 w-4 shrink-0" />,
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

  const sidebarInner = (isCollapsed: boolean, isMobile = false) => (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full flex-col">
        {/* Logo row — collapse toggle lives here on desktop */}
        <div
          className={`flex h-12 shrink-0 items-center border-b border-[#1e1f22] ${
            isCollapsed && !isMobile ? "justify-center px-0" : "justify-between px-3"
          }`}
        >
          {isCollapsed && !isMobile ? (
            /* collapsed: just icon + expand button */
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleCollapsed}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5865f2]/10 text-[#5865f2] hover:bg-[#5865f2]/20 transition-colors"
                  aria-label="サイドバーを展開"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">メニューを展開</TooltipContent>
            </Tooltip>
          ) : (
            <>
              <a className="flex items-center gap-2.5" href="/">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#5865f2]">
                  <LayoutDashboard className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-[#f2f3f5]">Discord Bot</span>
              </a>
              {/* desktop: collapse button; mobile: close button */}
              {isMobile ? (
                <button
                  className="rounded-md p-1.5 text-[#b5bac1] hover:text-[#dbdee1] transition-colors"
                  onClick={() => setMobileOpen(false)}
                  aria-label="閉じる"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={toggleCollapsed}
                  className="rounded-md p-1.5 text-[#b5bac1] hover:bg-[#383a40] hover:text-[#dbdee1] transition-colors"
                  aria-label="サイドバーを折りたたむ"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Guild chip */}
        {!isCollapsed || isMobile ? (
          <div className="mx-3 mt-3 rounded-lg bg-[#1e1f22] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#80848e]">サーバー</p>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-[#dbdee1]" title={guildName ?? guildId}>
                {guildName ?? guildId}
              </p>
              <a className="shrink-0 text-xs text-[#b5bac1] hover:text-[#5865f2] transition-colors" href="/guild">
                変更
              </a>
            </div>
          </div>
        ) : (
          <div className="mx-auto mt-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="/guild"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#b5bac1] hover:bg-[#383a40] hover:text-[#dbdee1] transition-colors"
                  aria-label="サーバーを変更"
                >
                  <Settings className="h-3.5 w-3.5" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="right">{guildName ?? guildId}</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Navigation */}
        <nav className="mt-2 flex-1 overflow-y-auto px-2 pb-2">
          {groups.map((group) => (
            <div key={group.label} className="mb-3">
              {(!isCollapsed || isMobile) && (
                <p className="mb-0.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#80848e]">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const active = item.href === currentPath;
                const base = "mb-0.5 flex items-center rounded-md text-sm font-medium transition-colors duration-100";
                const activeClass = `${base} bg-[#5865f2]/15 text-[#c9cdfb]`;
                const inactiveClass = `${base} text-[#b5bac1] hover:bg-[#383a40] hover:text-[#dbdee1]`;

                if (isCollapsed && !isMobile) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <a
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={`${active ? activeClass : inactiveClass} justify-center px-0 py-2.5`}
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
                    className={`${active ? activeClass : inactiveClass} gap-3 px-3 py-2`}
                  >
                    {icons[item.href]}
                    {item.label}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Auth */}
        {(!isCollapsed || isMobile) && (
          <div className="shrink-0 border-t border-[#1e1f22] px-3 py-3">
            <AuthStatus session={session} />
          </div>
        )}
      </div>
    </TooltipProvider>
  );

  const sidebarW = collapsed ? "w-14" : "w-[220px]";
  const gridCols = collapsed ? "lg:grid-cols-[56px_1fr]" : "lg:grid-cols-[220px_1fr]";

  return (
    <div className="min-h-screen bg-[#313338] text-[#dbdee1]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#2b2d31] shadow-xl transition-transform duration-200 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarInner(false, true)}
      </aside>

      <div className={`mx-auto grid min-h-screen max-w-[1600px] ${gridCols}`}>
        {/* Desktop sidebar — sticky, full height, toggle button is inside */}
        <aside className={`hidden h-screen sticky top-0 bg-[#2b2d31] transition-all duration-200 lg:flex lg:flex-col ${sidebarW}`}>
          {sidebarInner(collapsed)}
        </aside>

        {/* Content */}
        <section className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-[#1e1f22] bg-[#2b2d31]/95 px-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              {/* Hamburger — mobile only */}
              <button
                className="rounded-md p-1.5 text-[#b5bac1] hover:bg-[#383a40] hover:text-[#dbdee1] transition-colors lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="メニューを開く"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-sm font-semibold text-[#f2f3f5]">{title}</h1>
                {description && <p className="text-xs text-[#b5bac1]">{description}</p>}
              </div>
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </header>
          <div className="flex-1 px-4 py-5 md:px-6">{children}</div>
        </section>
      </div>
    </div>
  );
}
