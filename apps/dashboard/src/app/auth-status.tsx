"use client";

import type { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

import { Button, buttonVariants } from "../components/ui/button";
import { cn } from "../lib/utils";

export function AuthStatus({ session }: { session: Session | null }) {
  if (!session?.user) {
    return (
      <a className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href="/login">
        Sign in
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-300">
          {session.user.name ?? "Signed in"}
        </p>
        <p className="truncate text-[10px] text-slate-600">
          {session.user.id}
        </p>
      </div>
      <Button
        onClick={() => void signOut({ callbackUrl: "/login" })}
        size="sm"
        type="button"
        variant="ghost"
      >
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
