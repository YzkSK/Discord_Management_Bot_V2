"use client";

import { signIn } from "next-auth/react";

export function LoginActions() {
  return (
    <button
      className="inline-flex h-11 w-fit items-center border border-indigo-400 px-4 text-sm font-semibold text-indigo-100 hover:bg-indigo-400 hover:text-slate-950"
      onClick={() => void signIn("discord", { callbackUrl: "/" })}
      type="button"
    >
      Sign in with Discord
    </button>
  );
}
