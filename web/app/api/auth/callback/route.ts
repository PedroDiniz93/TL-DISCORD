import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, fetchCurrentUser, fetchCurrentUserGuilds, getAppBaseUrl } from "@/lib/discord";
import { createSession, validateState } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !validateState(state)) {
      return errorResponse("Login invalido: estado OAuth invalido ou codigo ausente.", 400);
    }
    const token = await exchangeCode(code);
    const [user, guilds] = await Promise.all([
      fetchCurrentUser(token.access_token),
      fetchCurrentUserGuilds(token.access_token),
    ]);
    await createSession({ user, guilds });
    return NextResponse.redirect(new URL("/dashboard", getAppBaseUrl()));
  } catch (err) {
    console.error("OAuth callback failed:", err);
    return errorResponse(err instanceof Error ? err.message : String(err), 500);
  }
}

function errorResponse(message: string, status: number) {
  return new NextResponse(
    `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Erro no login</title>
    <style>
      body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f5f7fb;color:#18212f;margin:0;display:grid;min-height:100vh;place-items:center;padding:24px}
      main{max-width:680px;background:#fff;border:1px solid #dfe5ee;border-radius:8px;padding:24px;box-shadow:0 1px 2px rgba(16,24,35,.05)}
      h1{margin:0 0 8px;font-size:22px}p{color:#5c6778}pre{white-space:pre-wrap;background:#eef2f7;border-radius:6px;padding:12px;font-size:13px}
      a{color:#235a8f;font-weight:700}
    </style>
  </head>
  <body>
    <main>
      <h1>Erro no login com Discord</h1>
      <p>O Discord retornou erro ou o painel nao conseguiu criar a sessao.</p>
      <pre>${escapeHtml(message)}</pre>
      <p><a href="/login">Tentar novamente</a></p>
    </main>
  </body>
</html>`,
    {
      status,
      headers: { "content-type": "text/html; charset=utf-8" },
    }
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
