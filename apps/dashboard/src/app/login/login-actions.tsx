"use client";

import { signIn } from "next-auth/react";

export function LoginActions() {
  return (
    <button
      className="inline-flex h-11 w-fit items-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
      onClick={() => void signIn("discord", { callbackUrl: "/" })}
      type="button"
    >
      Sign in with Discord
    </button>
  );
}
