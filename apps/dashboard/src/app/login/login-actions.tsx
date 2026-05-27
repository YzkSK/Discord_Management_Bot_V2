"use client";

import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";

import { Button } from "../../components/ui/button";

export function LoginActions() {
  return (
    <Button
      className="w-full bg-[#5865f2] text-white hover:bg-[#4752c4]"
      onClick={() => void signIn("discord", { callbackUrl: "/guild" })}
      type="button"
      variant="default"
    >
      <LogIn className="h-4 w-4" />
      Sign in with Discord
    </Button>
  );
}
