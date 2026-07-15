import { requireGuildAccess } from "@/lib/guild-access";
import { buildBotInviteUrl, fetchBotGuild } from "@/lib/discord";
import { getCatalog, getGuildSettings } from "@/lib/data";
import { tr } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ItemManager } from "@/components/guild/catalog-ui";
import { GuildHeader } from "@/components/guild/guild-ui";

export default async function GuildCatalogItemsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const { sessionGuild } = await requireGuildAccess(guildId);
  const settings = await getGuildSettings(guildId);
  const locale = settings.locale;

  const botGuild = await fetchBotGuild(guildId);
  if (!botGuild) {
    return (
      <div className="space-y-6">
        <GuildHeader title={sessionGuild.name} description={tr(locale, "O bot ainda nao esta instalado neste servidor.", "The bot is not installed on this server yet.")} locale={locale} />
        <Card>
          <CardHeader>
            <CardTitle>{tr(locale, "Convidar bot", "Invite bot")}</CardTitle>
            <CardDescription>{tr(locale, "Convide o bot antes de configurar itens.", "Invite the bot before configuring items.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><a href={buildBotInviteUrl(guildId)}>{tr(locale, "Convidar para", "Invite to")} {sessionGuild.name}</a></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const catalog = await getCatalog(guildId);

  return (
    <div className="space-y-8">
      <GuildHeader title={sessionGuild.name} description={tr(locale, "Itens usados pelo autocomplete, filas e painel do Discord.", "Items used by autocomplete, queues, and the Discord panel.")} locale={locale} />
      <ItemManager guildId={guildId} categories={catalog.categories} items={catalog.items} locale={locale} />
    </div>
  );
}
