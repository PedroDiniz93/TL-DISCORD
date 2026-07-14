const http = require("http");
const { URL } = require("url");
const {
  buildAuthorizationUrl,
  buildBotInviteUrl,
  exchangeCodeForToken,
  fetchBotGuild,
  fetchCurrentUser,
  fetchCurrentUserGuilds,
  fetchGuildChannels,
  fetchGuildRoles,
  getOAuthConfig,
} = require("./discord");
const {
  buildSessionCookie,
  buildStateCookie,
  clearSessionCookie,
  clearStateCookie,
  createOAuthState,
  createSession,
  destroySession,
  getSession,
  validateOAuthState,
} = require("./session");
const { getPanelData, getWishlistExportRows, getDeliveryExportRows, rowsToCsv } = require("./data");
const { getGuildSettings, saveGuildSettings } = require("../guild-settings");
const { ensureControlPanel } = require("../handlers/panel");
const { rareItems, weapons } = require("../items");

let webServer = null;

function startWebServer({ client }) {
  const port = process.env.PORT;
  if (!port) return null;

  webServer = http.createServer((req, res) => {
    handleRequest(req, res, client).catch((err) => {
      console.error("❌ Web server error:", err);
      sendHtml(res, 500, renderPage({
        title: "Erro",
        session: null,
        body: `<section class="panel"><h1>Erro interno</h1><p>${escapeHtml(err.message)}</p></section>`,
      }));
    });
  });

  webServer.listen(port, () => {
    console.log(`✅ Web panel and healthcheck listening on port ${port}`);
  });
  return webServer;
}

async function stopWebServer() {
  if (!webServer) return;
  await new Promise((resolve) => webServer.close(resolve));
  webServer = null;
}

async function handleRequest(req, res, client) {
  const url = new URL(req.url, getRequestBaseUrl(req));

  if (url.pathname === "/health") {
    const ready = client.isReady();
    sendJson(res, ready ? 200 : 503, { ok: ready, ready });
    return;
  }

  if (url.pathname === "/") {
    const session = await getSession(req);
    redirect(res, session ? "/dashboard" : "/login");
    return;
  }

  if (url.pathname === "/login") {
    await handleLogin(req, res);
    return;
  }

  if (url.pathname === "/oauth/callback") {
    await handleOAuthCallback(req, res, url);
    return;
  }

  if (url.pathname === "/logout") {
    await destroySession(req);
    redirect(res, "/login", [clearSessionCookie(), clearStateCookie()]);
    return;
  }

  const session = await requireSession(req, res);
  if (!session) return;

  if (url.pathname === "/dashboard") {
    await handleDashboard(res, session);
    return;
  }

  const guildMatch = url.pathname.match(/^\/guild\/(\d+)(?:\/([^/]+)(?:\/([^/]+))?)?$/);
  if (guildMatch) {
    const [, guildId, action, subAction] = guildMatch;
    if (!canAccessGuild(session, guildId)) {
      sendHtml(res, 403, renderPage({
        title: "Acesso negado",
        session,
        body: `<section class="panel"><h1>Acesso negado</h1><p>Este servidor não está disponível para sua conta.</p></section>`,
      }));
      return;
    }

    if (!action) {
      await handleGuildPanel(res, session, guildId);
      return;
    }

    if (req.method === "POST" && action === "settings") {
      await handleSaveSettings(req, res, session, guildId, client);
      return;
    }

    if (action === "export" && subAction === "wishlist.csv") {
      await handleWishlistExport(res, guildId);
      return;
    }

    if (action === "export" && subAction === "deliveries.csv") {
      await handleDeliveryExport(res, guildId);
      return;
    }
  }

  sendHtml(res, 404, renderPage({
    title: "Nao encontrado",
    session,
    body: `<section class="panel"><h1>Nao encontrado</h1><p>A pagina solicitada nao existe.</p></section>`,
  }));
}

async function handleLogin(req, res) {
  const config = getOAuthConfig();
  if (!config.configured) {
    sendHtml(res, 500, renderPage({
      title: "Configurar OAuth",
      session: null,
      body: `
        <section class="panel">
          <h1>OAuth do Discord nao configurado</h1>
          <p>Configure <code>DISCORD_CLIENT_SECRET</code> e <code>APP_BASE_URL</code> ou <code>DISCORD_REDIRECT_URI</code> no Railway.</p>
        </section>
      `,
    }));
    return;
  }

  const state = createOAuthState();
  redirect(res, buildAuthorizationUrl(state), [buildStateCookie(state)]);
}

async function handleOAuthCallback(req, res, url) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !validateOAuthState(req, state)) {
    sendHtml(res, 400, renderPage({
      title: "Login invalido",
      session: null,
      body: `<section class="panel"><h1>Login invalido</h1><p>Estado OAuth invalido ou codigo ausente.</p></section>`,
    }));
    return;
  }

  const token = await exchangeCodeForToken(code);
  const [user, guilds] = await Promise.all([
    fetchCurrentUser(token.access_token),
    fetchCurrentUserGuilds(token.access_token),
  ]);
  const sessionId = await createSession({ user, guilds });
  redirect(res, "/dashboard", [buildSessionCookie(sessionId), clearStateCookie()]);
}

async function handleDashboard(res, session) {
  const guilds = session.guilds || [];
  const body = `
    <section class="topline">
      <div>
        <h1>Servidores administrados</h1>
        <p>Escolha uma guild para configurar o bot, acompanhar filas e exportar dados.</p>
      </div>
    </section>
    <section class="grid guild-grid">
      ${guilds.length ? guilds.map(renderGuildCard).join("") : `
        <div class="panel"><h2>Nenhuma guild disponivel</h2><p>Entre com uma conta que tenha permissao de administrador em pelo menos um servidor.</p></div>
      `}
    </section>
  `;
  sendHtml(res, 200, renderPage({ title: "Dashboard", session, body }));
}

async function handleGuildPanel(res, session, guildId) {
  const guild = findSessionGuild(session, guildId);
  const botGuild = await fetchBotGuild(guildId);

  if (!botGuild) {
    const body = `
      <section class="topline">
        <div>
          <a class="backlink" href="/dashboard">Voltar</a>
          <h1>${escapeHtml(guild?.name || "Guild")}</h1>
          <p>O bot ainda nao esta instalado neste servidor.</p>
        </div>
      </section>
      <section class="panel invite-panel">
        <h2>Convidar bot</h2>
        <p>Convide o bot para este servidor antes de configurar canal, cargos, regras, filas ou exportacoes.</p>
        <a class="button" href="${escapeHtml(buildBotInviteUrl(guildId))}">Convidar para ${escapeHtml(guild?.name || "esta guild")}</a>
        <p class="muted">Depois de concluir o convite no Discord, volte para esta pagina e atualize.</p>
      </section>
    `;
    sendHtml(res, 200, renderPage({ title: "Convidar bot", session, body }));
    return;
  }

  const [channels, roles, settings, panelData] = await Promise.all([
    fetchGuildChannels(guildId),
    fetchGuildRoles(guildId),
    getGuildSettings(guildId),
    getPanelData(guildId),
  ]);

  const body = `
    <section class="topline">
      <div>
        <a class="backlink" href="/dashboard">Voltar</a>
        <h1>${escapeHtml(guild?.name || botGuild?.name || settings.name || "Guild")}</h1>
        <p>Bot conectado a esta guild.</p>
      </div>
      <div class="actions">
        <a class="button" href="/guild/${guildId}/export/wishlist.csv">Exportar filas CSV</a>
        <a class="button" href="/guild/${guildId}/export/deliveries.csv">Exportar entregas CSV</a>
      </div>
    </section>
    ${renderStats(panelData)}
    <section class="layout">
      ${renderSettingsForm({ guildId, channels, roles, settings })}
      ${renderSubscription(panelData.subscription)}
    </section>
    <section class="layout">
      ${renderQueues(panelData.queues)}
      ${renderDeliveries(panelData.deliveries)}
    </section>
  `;
  sendHtml(res, 200, renderPage({ title: "Guild", session, body }));
}

async function handleSaveSettings(req, res, session, guildId, client) {
  if (!(await fetchBotGuild(guildId))) {
    redirect(res, `/guild/${guildId}`);
    return;
  }

  const form = await readForm(req);
  const guild = findSessionGuild(session, guildId);
  const rules = {
    adminRoleIds: form.getAll("adminRoleIds"),
    limits: {
      archWeapons: form.get("limit_archWeapons"),
      rareEquips: form.get("limit_rareEquips"),
      rareAccessories: form.get("limit_rareAccessories"),
      worldBossWeaponsT4: form.get("limit_worldBossWeaponsT4"),
      skillCores: form.get("limit_skillCores"),
    },
    enabledItems: {
      arch: form.getAll("enabledArchItems"),
      rare: form.getAll("enabledRareItems"),
    },
  };

  const saved = await saveGuildSettings(guildId, {
    guildName: guild?.name || "",
    allowedChannelId: form.get("allowedChannelId"),
    locale: form.get("locale") || "pt-BR",
    rules,
    actorDiscordUserId: session.user?.id,
  });
  if (saved.allowedChannelId) {
    await ensureControlPanel(client, {
      guildId,
      channelId: saved.allowedChannelId,
    }).catch((err) => {
      console.error(`❌ Failed to ensure control panel after settings save for guild ${guildId}:`, err);
    });
  }
  redirect(res, `/guild/${guildId}`);
}

async function handleWishlistExport(res, guildId) {
  if (!(await fetchBotGuild(guildId))) {
    sendHtml(res, 403, renderPage({
      title: "Bot nao instalado",
      session: null,
      body: `<section class="panel"><h1>Bot nao instalado</h1><p>Convide o bot antes de exportar dados desta guild.</p></section>`,
    }));
    return;
  }

  const rows = await getWishlistExportRows(guildId);
  const csv = rowsToCsv(
    ["type", "registered_at_text", "nickname", "item_name", "discord_user_id"],
    rows
  );
  sendCsv(res, "wishlist.csv", csv);
}

async function handleDeliveryExport(res, guildId) {
  if (!(await fetchBotGuild(guildId))) {
    sendHtml(res, 403, renderPage({
      title: "Bot nao instalado",
      session: null,
      body: `<section class="panel"><h1>Bot nao instalado</h1><p>Convide o bot antes de exportar dados desta guild.</p></section>`,
    }));
    return;
  }

  const rows = await getDeliveryExportRows(guildId);
  const csv = rowsToCsv(
    ["type", "delivered_at_text", "player_name", "item_name", "discord_user_id"],
    rows
  );
  sendCsv(res, "deliveries.csv", csv);
}

function renderGuildCard(guild) {
  return `
    <a class="guild-card" href="/guild/${guild.id}">
      <strong>${escapeHtml(guild.name)}</strong>
      <span>${guild.owner ? "Dono" : "Administrador"}</span>
    </a>
  `;
}

function renderStats(panelData) {
  const counts = panelData.counts || {};
  return `
    <section class="stats">
      <div><span>Archboss</span><strong>${Number(counts.arch_count || 0)}</strong></div>
      <div><span>Itens raros</span><strong>${Number(counts.rare_count || 0)}</strong></div>
      <div><span>Jogadores</span><strong>${Number(counts.player_count || 0)}</strong></div>
      <div><span>Filas</span><strong>${panelData.queues.length}</strong></div>
    </section>
  `;
}

function renderSettingsForm({ guildId, channels, roles, settings }) {
  const rules = settings.rules;
  return `
    <form class="panel" method="post" action="/guild/${guildId}/settings">
      <h2>Configuracao do bot</h2>
      <label>
        Canal permitido
        <select name="allowedChannelId">
          <option value="">Sem canal fixo</option>
          ${channels.map((channel) => `
            <option value="${escapeHtml(channel.id)}" ${channel.id === settings.allowedChannelId ? "selected" : ""}>#${escapeHtml(channel.name)}</option>
          `).join("")}
        </select>
      </label>
      <label>
        Cargos administradores
        <select name="adminRoleIds" multiple size="8">
          ${roles.map((role) => `
            <option value="${escapeHtml(role.id)}" ${settings.adminRoleIds.includes(role.id) ? "selected" : ""}>${escapeHtml(role.name)}</option>
          `).join("")}
        </select>
      </label>
      <div class="form-grid">
        ${renderLimitInput("Armas Archboss por jogador", "archWeapons", rules.limits.archWeapons)}
        ${renderLimitInput("Equipamentos raros", "rareEquips", rules.limits.rareEquips)}
        ${renderLimitInput("Acessorios raros", "rareAccessories", rules.limits.rareAccessories)}
        ${renderLimitInput("Armas Boss Mundo T4", "worldBossWeaponsT4", rules.limits.worldBossWeaponsT4)}
        ${renderLimitInput("Nucleos", "skillCores", rules.limits.skillCores)}
      </div>
      <label>
        Armas Archboss habilitadas
        <select name="enabledArchItems" multiple size="10">
          ${weapons.map((item) => renderItemOption(item, rules.enabledItems.arch)).join("")}
        </select>
        <small>Nenhum selecionado significa todos habilitados.</small>
      </label>
      <label>
        Itens raros habilitados
        <select name="enabledRareItems" multiple size="12">
          ${rareItems.map((item) => renderItemOption(item, rules.enabledItems.rare)).join("")}
        </select>
        <small>Nenhum selecionado significa todos habilitados.</small>
      </label>
      <button type="submit">Salvar configuracoes</button>
    </form>
  `;
}

function renderLimitInput(label, key, value) {
  return `
    <label>
      ${escapeHtml(label)}
      <input type="number" min="0" name="limit_${escapeHtml(key)}" value="${Number(value || 0)}">
    </label>
  `;
}

function renderItemOption(item, selectedItems) {
  return `<option value="${escapeHtml(item)}" ${selectedItems.includes(item) ? "selected" : ""}>${escapeHtml(item)}</option>`;
}

function renderSubscription(subscription) {
  return `
    <section class="panel">
      <h2>Assinatura</h2>
      <dl>
        <dt>Plano</dt><dd>${escapeHtml(subscription?.plan || "free")}</dd>
        <dt>Status</dt><dd>${escapeHtml(subscription?.status || "trial")}</dd>
        <dt>Validade</dt><dd>${subscription?.current_period_ends_at ? escapeHtml(String(subscription.current_period_ends_at)) : "Sem data definida"}</dd>
      </dl>
    </section>
  `;
}

function renderQueues(queues) {
  return `
    <section class="panel">
      <h2>Filas</h2>
      ${queues.length ? `
        <table>
          <thead><tr><th>Tipo</th><th>Item</th><th>Jogadores</th></tr></thead>
          <tbody>${queues.map((row) => `
            <tr><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.item_name)}</td><td>${Number(row.total || 0)}</td></tr>
          `).join("")}</tbody>
        </table>
      ` : "<p>Nenhuma fila ativa.</p>"}
    </section>
  `;
}

function renderDeliveries(deliveries) {
  return `
    <section class="panel">
      <h2>Historico de entregas</h2>
      ${deliveries.length ? `
        <table>
          <thead><tr><th>Tipo</th><th>Item</th><th>Player</th><th>Data</th></tr></thead>
          <tbody>${deliveries.map((row) => `
            <tr><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.item_name)}</td><td>${escapeHtml(row.player_name)}</td><td>${escapeHtml(row.delivered_at_text)}</td></tr>
          `).join("")}</tbody>
        </table>
      ` : "<p>Nenhuma entrega registrada.</p>"}
    </section>
  `;
}

async function requireSession(req, res) {
  const session = await getSession(req);
  if (session) return session;
  redirect(res, "/login");
  return null;
}

function canAccessGuild(session, guildId) {
  return Boolean(findSessionGuild(session, guildId));
}

function findSessionGuild(session, guildId) {
  return (session.guilds || []).find((guild) => String(guild.id) === String(guildId));
}

async function readForm(req) {
  const body = await readBody(req);
  return new URLSearchParams(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function renderPage({ title, session, body }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | TLGM Bot</title>
  <style>${CSS}</style>
</head>
<body>
  <header>
    <a class="brand" href="/dashboard">TLGM Bot</a>
    <nav>${session ? `<span>${escapeHtml(session.user?.username || "Discord")}</span><a href="/logout">Sair</a>` : ""}</nav>
  </header>
  <main>${body}</main>
</body>
</html>`;
}

function sendHtml(res, status, html, headers = {}) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", ...headers });
  res.end(html);
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function sendCsv(res, filename, csv) {
  res.writeHead(200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });
  res.end(csv);
}

function redirect(res, location, cookies = []) {
  const headers = { Location: location };
  if (cookies.length) headers["Set-Cookie"] = cookies;
  res.writeHead(302, headers);
  res.end();
}

function getRequestBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  return `${proto}://${host}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CSS = `
*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#18212f;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}header{height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:#101823;color:#fff}header a{color:#fff;text-decoration:none}.brand{font-weight:800;font-size:18px}nav{display:flex;gap:16px;align-items:center;color:#d6dde8}main{max-width:1240px;margin:0 auto;padding:28px}.topline{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;margin-bottom:18px}.topline h1{margin:0 0 6px;font-size:30px}.topline p{margin:0;color:#5c6778}.backlink{display:inline-block;margin-bottom:10px;color:#2d5f9a;text-decoration:none}.actions{display:flex;gap:10px;flex-wrap:wrap}.button,button{appearance:none;border:0;border-radius:6px;background:#235a8f;color:#fff;padding:10px 14px;text-decoration:none;font-weight:700;cursor:pointer}.button{display:inline-block}.grid{display:grid;gap:14px}.guild-grid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}.guild-card,.panel{background:#fff;border:1px solid #dfe5ee;border-radius:8px;box-shadow:0 1px 2px rgba(16,24,35,.04)}.guild-card{display:flex;flex-direction:column;gap:8px;padding:18px;color:#18212f;text-decoration:none}.guild-card strong{font-size:18px}.guild-card span{color:#667386}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}.stats div{background:#fff;border:1px solid #dfe5ee;border-radius:8px;padding:16px}.stats span{display:block;color:#667386;font-size:13px}.stats strong{display:block;font-size:28px;margin-top:4px}.layout{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(320px,.8fr);gap:18px;margin-bottom:18px}.panel{padding:18px;overflow:auto}.panel h2{font-size:18px;margin:0 0 16px}label{display:block;font-weight:700;margin:0 0 14px}input,select{width:100%;margin-top:6px;border:1px solid #ccd5e1;border-radius:6px;padding:9px 10px;background:#fff;color:#18212f}select[multiple]{min-height:160px}small{display:block;color:#667386;margin-top:6px;font-weight:500}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;border-bottom:1px solid #e7ecf3;padding:10px 8px;vertical-align:top}th{color:#526073;font-size:12px;text-transform:uppercase}dl{display:grid;grid-template-columns:100px 1fr;gap:10px;margin:0}dt{color:#667386}dd{margin:0;font-weight:700}code{background:#edf1f7;border-radius:4px;padding:2px 5px}@media(max-width:820px){main{padding:18px}.topline,.layout{display:block}.actions{margin-top:14px}.stats{grid-template-columns:repeat(2,1fr)}.panel{margin-bottom:16px}.form-grid{grid-template-columns:1fr}}
`;

module.exports = {
  startWebServer,
  stopWebServer,
};
