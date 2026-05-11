"use client";

import type { Session } from "next-auth";
import { signOut } from "next-auth/react";

export function AuthStatus({ session }: { session: Session | null }) {
  if (!session?.user) {
    return (
      <a
        className="inline-flex h-10 w-fit items-center border border-indigo-400 px-3 text-sm font-semibold text-indigo-100 hover:bg-indigo-400 hover:text-slate-950"
        href="/login"
      >
        Sign in
      </a>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
      <span>{session.user.name ?? session.user.id ?? "Signed in"}</span>
      <button
        className="inline-flex h-10 w-fit items-center border border-slate-600 px-3 font-semibold text-slate-100 hover:bg-slate-800"
        onClick={() => void signOut({ callbackUrl: "/login" })}
        type="button"
      >
        Sign out
      </button>
    </div>
  );
}
