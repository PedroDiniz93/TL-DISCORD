import { requireGuildAccess } from "@/lib/guild-access";
import { buildBotInviteUrl, fetchBotGuild } from "@/lib/discord";
import { getCatalog } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryManager } from "@/components/guild/catalog-ui";
import { GuildHeader } from "@/components/guild/guild-ui";

export default async function GuildCatalogCategoriesPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const { sessionGuild } = await requireGuildAccess(guildId);

  const botGuild = await fetchBotGuild(guildId);
  if (!botGuild) {
    return (
      <div className="space-y-6">
        <GuildHeader title={sessionGuild.name} description="O bot ainda nao esta instalado neste servidor." />
        <Card>
          <CardHeader>
            <CardTitle>Convidar bot</CardTitle>
            <CardDescription>Convide o bot antes de configurar categorias.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><a href={buildBotInviteUrl(guildId)}>Convidar para {sessionGuild.name}</a></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const catalog = await getCatalog(guildId);

  return (
    <div className="space-y-8">
      <GuildHeader title={sessionGuild.name} description="Categorias configuraveis para Archboss e itens raros." />
      <CategoryManager guildId={guildId} categories={catalog.categories} />
    </div>
  );
}
