"use client";

import type { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

import { Button, buttonVariants } from "../components/ui/button";
import { cn } from "../lib/utils";

export function AuthStatus({ session }: { session: Session | null }) {
  if (!session?.user) {
    return (
      <a className={cn(buttonVariants({ variant: "outline" }))} href="/login">
        Sign in
      </a>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
      <span className="font-medium text-slate-800">
        {session.user.name ?? session.user.id ?? "Signed in"}
      </span>
      <Button
        onClick={() => void signOut({ callbackUrl: "/login" })}
        size="sm"
        type="button"
        variant="outline"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}
