import { requireGuildAccess } from "@/lib/guild-access";
import { buildBotInviteUrl, fetchBotGuild, fetchGuildChannels, fetchGuildRoles, getGuildBotStatus } from "@/lib/discord";
import { getGuildSettings, getPanelData } from "@/lib/data";
import { tr } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GuildAdministrationCard, GuildHeader, SettingsCard, SubscriptionCard } from "@/components/guild/guild-ui";

export default async function GuildSettingsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const { sessionGuild } = await requireGuildAccess(guildId);
  const baseSettings = await getGuildSettings(guildId);
  const locale = baseSettings.locale;

  const botGuild = await fetchBotGuild(guildId);
  if (!botGuild) {
    return (
      <div className="space-y-6">
        <GuildHeader title={sessionGuild.name} description={tr(locale, "O bot ainda nao esta instalado neste servidor.", "The bot is not installed on this server yet.")} locale={locale} />
        <Card>
          <CardHeader>
            <CardTitle>{tr(locale, "Convidar bot", "Invite bot")}</CardTitle>
            <CardDescription>{tr(locale, "Convide o bot antes de configurar canais e cargos.", "Invite the bot before configuring channels and roles.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><a href={buildBotInviteUrl(guildId)}>{tr(locale, "Convidar para", "Invite to")} {sessionGuild.name}</a></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [channels, roles, settings, panelData] = await Promise.all([
    fetchGuildChannels(guildId),
    fetchGuildRoles(guildId),
    getGuildSettings(guildId),
    getPanelData(guildId),
  ]);
  const botStatus = await getGuildBotStatus(guildId, settings.allowedChannelId);

  return (
    <div className="space-y-8">
      <GuildHeader title={sessionGuild.name} description={tr(locale, "Configuracao do bot e status comercial da guild.", "Bot settings and guild billing status.")} locale={locale} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <GuildAdministrationCard guildId={guildId} status={botStatus} locale={locale} />
          <SettingsCard guildId={guildId} channels={channels} roles={roles} settings={settings} />
        </div>
        <SubscriptionCard subscription={panelData.subscription} locale={locale} />
      </div>
    </div>
  );
}
