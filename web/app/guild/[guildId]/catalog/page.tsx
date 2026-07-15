import Link from "next/link";
import { ListTree, Package } from "lucide-react";
import { requireGuildAccess } from "@/lib/guild-access";
import { buildBotInviteUrl, fetchBotGuild } from "@/lib/discord";
import { getCatalog, getGuildSettings } from "@/lib/data";
import { tr } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GuildHeader } from "@/components/guild/guild-ui";

export default async function GuildCatalogPage({ params }: { params: Promise<{ guildId: string }> }) {
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
            <CardDescription>{tr(locale, "Convide o bot antes de configurar o catalogo.", "Invite the bot before configuring the catalog.")}</CardDescription>
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
      <GuildHeader title={sessionGuild.name} description={tr(locale, "Armas Archboss, itens raros, categorias, limites e autocomplete.", "Archboss weapons, rare items, categories, limits, and autocomplete.")} locale={locale} />
      <div className="grid gap-4 md:grid-cols-2">
        <Link href={`/guild/${guildId}/catalog/categories`}>
          <Card className="transition hover:border-primary">
            <CardHeader className="flex flex-row items-center gap-3 border-b border-border">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-muted text-primary">
                <ListTree className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{tr(locale, "Categorias", "Categories")}</CardTitle>
                <CardDescription>{catalog.categories.length} {tr(locale, "categorias cadastradas", "registered categories")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-5 text-sm text-muted-foreground">{tr(locale, "Configurar agrupamentos, limites e ordem.", "Configure groups, limits, and order.")}</CardContent>
          </Card>
        </Link>
        <Link href={`/guild/${guildId}/catalog/items`}>
          <Card className="transition hover:border-primary">
            <CardHeader className="flex flex-row items-center gap-3 border-b border-border">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-muted text-primary">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{tr(locale, "Itens", "Items")}</CardTitle>
                <CardDescription>{catalog.items.length} {tr(locale, "itens cadastrados", "registered items")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-5 text-sm text-muted-foreground">{tr(locale, "Gerenciar imagens e status no autocomplete.", "Manage images and autocomplete status.")}</CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
