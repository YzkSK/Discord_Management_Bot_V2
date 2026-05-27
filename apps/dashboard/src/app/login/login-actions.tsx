"use client";

import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";

import { Button } from "../../components/ui/button";

export function LoginActions() {
  return (
    <Button
      onClick={() => void signIn("discord", { callbackUrl: "/" })}
      type="button"
    >
      <LogIn className="h-4 w-4" />
      Sign in with Discord
    </Button>
  );
}
