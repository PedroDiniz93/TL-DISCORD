const crypto = require("crypto");
const { query } = require("../db");

const SESSION_COOKIE = "tlgm_session";
const STATE_COOKIE = "tlgm_oauth_state";
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const STATE_MAX_AGE_SECONDS = 10 * 60;

async function createSession({ user, guilds }) {
  const sessionId = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await query(
    `INSERT INTO web_sessions (id, discord_user_id, payload, expires_at)
     VALUES ($1, $2, $3::jsonb, $4)`,
    [
      hashSessionId(sessionId),
      String(user.id),
      JSON.stringify({ user, guilds }),
      expiresAt,
    ]
  );
  return sessionId;
}

async function getSession(req) {
  const sessionId = getCookie(req, SESSION_COOKIE);
  if (!sessionId) return null;

  const result = await query(
    `SELECT payload
       FROM web_sessions
      WHERE id = $1
        AND expires_at > now()
      LIMIT 1`,
    [hashSessionId(sessionId)]
  );
  return result.rows[0]?.payload || null;
}

async function destroySession(req) {
  const sessionId = getCookie(req, SESSION_COOKIE);
  if (!sessionId) return;
  await query("DELETE FROM web_sessions WHERE id = $1", [hashSessionId(sessionId)]);
}

function createOAuthState() {
  return crypto.randomBytes(24).toString("hex");
}

function validateOAuthState(req, state) {
  const expected = getCookie(req, STATE_COOKIE);
  return Boolean(expected && state && expected === state);
}

function buildSessionCookie(sessionId) {
  return buildCookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: isSecureCookiesEnabled(),
  });
}

function buildStateCookie(state) {
  return buildCookie(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: STATE_MAX_AGE_SECONDS,
    secure: isSecureCookiesEnabled(),
  });
}

function clearSessionCookie() {
  return buildCookie(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
    secure: isSecureCookiesEnabled(),
  });
}

function clearStateCookie() {
  return buildCookie(STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
    secure: isSecureCookiesEnabled(),
  });
}

function getCookie(req, name) {
  const header = String(req.headers.cookie || "");
  const parts = header.split(";").map((part) => part.trim()).filter(Boolean);
  for (const part of parts) {
    const [key, ...rest] = part.split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function buildCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join("; ");
}

function hashSessionId(sessionId) {
  return crypto.createHash("sha256").update(String(sessionId)).digest("hex");
}

function isSecureCookiesEnabled() {
  return String(process.env.WEB_SECURE_COOKIES || "true").toLowerCase() !== "false";
}

module.exports = {
  buildSessionCookie,
  buildStateCookie,
  clearSessionCookie,
  clearStateCookie,
  createOAuthState,
  createSession,
  destroySession,
  getSession,
  validateOAuthState,
};
