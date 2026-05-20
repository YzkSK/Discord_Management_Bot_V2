"use client";

import type { Session } from "next-auth";
import { signOut } from "next-auth/react";

export function AuthStatus({ session }: { session: Session | null }) {
  if (!session?.user) {
    return (
      <a
        className="inline-flex h-10 w-fit items-center rounded-md border border-teal-700 px-3 text-sm font-semibold text-teal-800 hover:bg-teal-700 hover:text-white"
        href="/login"
      >
        Sign in
      </a>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
      <span className="font-medium text-slate-800">
        {session.user.name ?? session.user.id ?? "Signed in"}
      </span>
      <button
        className="inline-flex h-10 w-fit items-center rounded-md border border-slate-300 bg-white px-3 font-semibold text-slate-700 hover:bg-slate-50"
        onClick={() => void signOut({ callbackUrl: "/login" })}
        type="button"
      >
        Sign out
      </button>
    </div>
  );
}
