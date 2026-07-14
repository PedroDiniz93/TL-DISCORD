import crypto from "crypto";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import type { DiscordGuild, DiscordUser } from "@/lib/discord";

const SESSION_COOKIE = "tlgm_next_session";
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export type SessionPayload = {
  user: DiscordUser;
  guilds: DiscordGuild[];
};

export async function createSession(payload: SessionPayload) {
  const rawId = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await query(
    `INSERT INTO web_sessions (id, discord_user_id, payload, expires_at)
     VALUES ($1, $2, $3::jsonb, $4)`,
    [hash(rawId), payload.user.id, JSON.stringify(payload), expiresAt]
  );
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, rawId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const rawId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!rawId) return null;
  const result = await query<{ payload: SessionPayload }>(
    `SELECT payload FROM web_sessions WHERE id = $1 AND expires_at > now() LIMIT 1`,
    [hash(rawId)]
  );
  return (result.rows[0]?.payload as SessionPayload | undefined) || null;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const rawId = cookieStore.get(SESSION_COOKIE)?.value;
  if (rawId) await query("DELETE FROM web_sessions WHERE id = $1", [hash(rawId)]);
  cookieStore.delete(SESSION_COOKIE);
}

export function createState() {
  const payload = Buffer.from(JSON.stringify({ issuedAt: Date.now(), nonce: crypto.randomBytes(16).toString("hex") })).toString("base64url");
  const signature = crypto.createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function validateState(state: string | null) {
  if (!state) return false;
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return false;
  const expected = crypto.createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  if (signature.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  const age = Date.now() - Number(parsed.issuedAt || 0);
  return age >= 0 && age < 10 * 60 * 1000;
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stateSecret() {
  return process.env.WEB_SESSION_SECRET || process.env.DISCORD_CLIENT_SECRET || process.env.DISCORD_TOKEN || "dev";
}
