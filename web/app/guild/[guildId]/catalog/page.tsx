import Link from "next/link";
import { ListTree, Package } from "lucide-react";
import { requireGuildAccess } from "@/lib/guild-access";
import { buildBotInviteUrl, fetchBotGuild } from "@/lib/discord";
import { getCatalog } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GuildHeader } from "@/components/guild/guild-ui";

export default async function GuildCatalogPage({ params }: { params: Promise<{ guildId: string }> }) {
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
            <CardDescription>Convide o bot antes de configurar o catalogo.</CardDescription>
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
      <GuildHeader title={sessionGuild.name} description="Armas Archboss, itens raros, categorias, limites e autocomplete." />
      <div className="grid gap-4 md:grid-cols-2">
        <Link href={`/guild/${guildId}/catalog/categories`}>
          <Card className="transition hover:border-primary">
            <CardHeader className="flex flex-row items-center gap-3 border-b border-border">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-muted text-primary">
                <ListTree className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Categorias</CardTitle>
                <CardDescription>{catalog.categories.length} categorias cadastradas</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-5 text-sm text-muted-foreground">Configurar agrupamentos, limites e ordem.</CardContent>
          </Card>
        </Link>
        <Link href={`/guild/${guildId}/catalog/items`}>
          <Card className="transition hover:border-primary">
            <CardHeader className="flex flex-row items-center gap-3 border-b border-border">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-muted text-primary">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Itens</CardTitle>
                <CardDescription>{catalog.items.length} itens cadastrados</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-5 text-sm text-muted-foreground">Gerenciar imagens, aliases e status no autocomplete.</CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
