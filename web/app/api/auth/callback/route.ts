import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, fetchCurrentUser, fetchCurrentUserGuilds } from "@/lib/discord";
import { createSession, validateState } from "@/lib/session";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !validateState(state)) {
    return new NextResponse("Login invalido", { status: 400 });
  }
  const token = await exchangeCode(code);
  const [user, guilds] = await Promise.all([
    fetchCurrentUser(token.access_token),
    fetchCurrentUserGuilds(token.access_token),
  ]);
  await createSession({ user, guilds });
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
