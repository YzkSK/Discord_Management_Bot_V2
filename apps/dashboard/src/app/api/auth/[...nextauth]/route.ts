import NextAuth from "next-auth";

import { getAuthOptions } from "../../../../auth";

let handler: ReturnType<typeof NextAuth> | undefined;

function getHandler() {
  return (handler ??= NextAuth(getAuthOptions()));
}

export function GET(req: Request, ctx: unknown) {
  return getHandler()(req as never, ctx as never);
}

export function POST(req: Request, ctx: unknown) {
  return getHandler()(req as never, ctx as never);
}
