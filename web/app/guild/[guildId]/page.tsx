import Link from "next/link";
import { redirect } from "next/navigation";
import { Box, CheckCircle2, Download, Gem, PackagePlus, Plus, ShieldCheck, Swords, Users } from "lucide-react";
import { getSession } from "@/lib/session";
import { buildBotInviteUrl, fetchBotGuild, fetchGuildChannels, fetchGuildRoles } from "@/lib/discord";
import { getCatalog, getGuildSettings, getPanelData, type Category, type GuildItem } from "@/lib/data";
import { deleteCategory, deleteItem, saveCategory, saveItem, saveSettings } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function GuildPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  const sessionGuild = session.guilds.find((guild) => guild.id === guildId);
  if (!sessionGuild) redirect("/dashboard");

  const botGuild = await fetchBotGuild(guildId);
  if (!botGuild) {
    return (
      <div className="space-y-6">
        <BackHeader title={sessionGuild.name} description="O bot ainda nao esta instalado neste servidor." />
        <Card>
          <CardHeader>
            <CardTitle>Convidar bot</CardTitle>
            <CardDescription>Convide o bot antes de configurar canais, cargos, itens e filas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href={buildBotInviteUrl(guildId)}>Convidar para {sessionGuild.name}</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [channels, roles, settings, panelData, catalog] = await Promise.all([
    fetchGuildChannels(guildId),
    fetchGuildRoles(guildId),
    getGuildSettings(guildId),
    getPanelData(guildId),
    getCatalog(guildId),
  ]);

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <BackHeader title={sessionGuild.name} description="Bot conectado a esta guild." />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href={`/guild/${guildId}/export/wishlist.csv`}>
                <Download className="h-4 w-4" />
                Exportar filas
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/guild/${guildId}/export/deliveries.csv`}>
                <Download className="h-4 w-4" />
                Exportar entregas
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <Stats counts={panelData.counts} queues={panelData.queues.length} />
      <div id="settings" className="grid scroll-mt-24 gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <SettingsCard guildId={guildId} channels={channels} roles={roles} settings={settings} />
        <SubscriptionCard subscription={panelData.subscription} />
      </div>
      <div id="catalog" className="grid scroll-mt-24 gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <CategoriesCard guildId={guildId} categories={catalog.categories} />
        <ItemsCard guildId={guildId} categories={catalog.categories} items={catalog.items} />
      </div>
      <div id="queues" className="grid scroll-mt-24 gap-6 lg:grid-cols-2">
        <QueuesCard queues={panelData.queues} />
        <div id="reports" className="scroll-mt-24">
        <DeliveriesCard deliveries={panelData.deliveries} />
        </div>
      </div>
    </div>
  );
}

function BackHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <Link href="/dashboard" className="text-sm font-medium text-primary">
        Voltar
      </Link>
      <h1 className="mt-2 text-3xl font-bold">{title}</h1>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </div>
  );
}

function Stats({ counts, queues }: { counts: { arch_count: number; rare_count: number; player_count: number }; queues: number }) {
  const stats = [
    ["Archboss", counts.arch_count],
    ["Itens raros", counts.rare_count],
    ["Jogadores", counts.player_count],
    ["Filas", queues],
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(([label, value], index) => (
        <Card key={label}>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <div className="text-sm text-muted-foreground">{label}</div>
              <div className="mt-1 text-3xl font-bold">{value}</div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-muted text-primary">
              {[<Swords key="a" />, <Gem key="b" />, <Users key="c" />, <Box key="d" />][index]}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SettingsCard({
  guildId,
  channels,
  roles,
  settings,
}: {
  guildId: string;
  channels: Array<{ id: string; name: string }>;
  roles: Array<{ id: string; name: string }>;
  settings: { allowedChannelId: string; adminRoleIds: string[] };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuracao do bot</CardTitle>
        <CardDescription>Canal de uso e cargos que podem administrar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={saveSettings.bind(null, guildId)} className="space-y-4">
          <Label className="grid gap-2">
            Canal permitido
            <select name="allowedChannelId" defaultValue={settings.allowedChannelId} className="mt-2 w-full rounded-md border-input">
              <option value="">Sem canal fixo</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.name}
                </option>
              ))}
            </select>
          </Label>
          <Label className="grid gap-2">
            Cargos administradores
            <select name="adminRoleIds" multiple defaultValue={settings.adminRoleIds} className="mt-2 w-full rounded-md border-input">
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </Label>
          <Button type="submit">
            <ShieldCheck className="h-4 w-4" />
            Salvar configuracoes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SubscriptionCard({ subscription }: { subscription: { plan: string; status: string; current_period_ends_at: Date | null } }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assinatura</CardTitle>
        <CardDescription>Status comercial da guild.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-[110px_1fr] gap-3 text-sm">
        <span className="text-muted-foreground">Plano</span><strong>{subscription.plan}</strong>
        <span className="text-muted-foreground">Status</span><strong>{subscription.status}</strong>
        <span className="text-muted-foreground">Validade</span><strong>{subscription.current_period_ends_at ? String(subscription.current_period_ends_at) : "Sem data"}</strong>
      </CardContent>
    </Card>
  );
}

function CategoriesCard({ guildId, categories }: { guildId: string; categories: Category[] }) {
  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle>Categorias</CardTitle>
        <CardDescription>Limite por jogador e agrupamento dos itens.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border bg-muted/30 p-4">
          <CategoryForm guildId={guildId} />
        </div>
        <DataTable
          headers={["Tipo", "Categoria", "Limite", "Ordem", "Status", "Editar"]}
          rows={categories.map((category) => [
            category.type,
            <div key="name">{category.name}<div className="text-xs text-muted-foreground">{category.key}</div></div>,
            category.limitPerUser,
            category.sortOrder,
            category.active ? "Ativa" : "Inativa",
            <details key="edit"><summary>Editar</summary><CategoryForm guildId={guildId} category={category} /><DeleteCategoryForm guildId={guildId} id={category.id} /></details>,
          ])}
        />
      </CardContent>
    </Card>
  );
}

function ItemsCard({ guildId, categories, items }: { guildId: string; categories: Category[]; items: GuildItem[] }) {
  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle>Itens</CardTitle>
        <CardDescription>Catalogo usado no autocomplete e no painel do Discord.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border bg-muted/30 p-4">
          <ItemForm guildId={guildId} categories={categories} />
        </div>
        <DataTable
          headers={["Tipo", "Item", "Categoria", "Ordem", "Status", "Editar"]}
          rows={items.map((item) => [
            item.type,
            <div key="item">{item.name}<div className="text-xs text-muted-foreground">{item.aliases.join(", ")}</div></div>,
            item.categoryName,
            item.sortOrder,
            item.active ? "Ativo" : "Inativo",
            <details key="edit"><summary>Editar</summary><ItemForm guildId={guildId} categories={categories} item={item} /><DeleteItemForm guildId={guildId} id={item.id} /></details>,
          ])}
        />
      </CardContent>
    </Card>
  );
}

function CategoryForm({ guildId, category }: { guildId: string; category?: Category }) {
  return (
    <form action={saveCategory.bind(null, guildId)} className="grid gap-3 md:grid-cols-[120px_1fr_130px_90px_92px_auto]">
      <input type="hidden" name="id" defaultValue={category?.id || ""} />
      <select name="type" defaultValue={category?.type || "rare"} className="rounded-md border-input">
        <option value="arch">Archboss</option>
        <option value="rare">Item raro</option>
      </select>
      <Input name="name" placeholder="Nome" defaultValue={category?.name || ""} required />
      <Input name="key" placeholder="chave" defaultValue={category?.key || ""} />
      <Input type="number" min="0" name="limitPerUser" defaultValue={category?.limitPerUser ?? 1} />
      <Input type="number" name="sortOrder" defaultValue={category?.sortOrder || 0} />
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={category?.active ?? true} /> Ativa</label>
      <Button type="submit"><PackagePlus className="h-4 w-4" />{category ? "Salvar" : "Adicionar"}</Button>
    </form>
  );
}

function ItemForm({ guildId, categories, item }: { guildId: string; categories: Category[]; item?: GuildItem }) {
  return (
    <form action={saveItem.bind(null, guildId)} className="grid gap-3 md:grid-cols-4">
      <input type="hidden" name="id" defaultValue={item?.id || ""} />
      <select name="type" defaultValue={item?.type || "rare"} className="rounded-md border-input">
        <option value="arch">Archboss</option>
        <option value="rare">Item raro</option>
      </select>
      <select name="categoryId" defaultValue={item?.categoryId || ""} className="rounded-md border-input">
        <option value="">Sem categoria</option>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select>
      <Input name="name" placeholder="Nome usado no bot" defaultValue={item?.name || ""} required />
      <Input name="sortOrder" type="number" defaultValue={item?.sortOrder || 0} />
      <Input name="namePt" placeholder="Nome PT" defaultValue={item?.namePt || ""} />
      <Input name="nameEn" placeholder="Nome EN" defaultValue={item?.nameEn || ""} />
      <Input name="imageUrl" placeholder="URL da imagem/icone" defaultValue={item?.imageUrl || ""} />
      <textarea name="aliases" placeholder="Aliases" defaultValue={(item?.aliases || []).join(", ")} className="rounded-md border-input md:col-span-2" />
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={item?.active ?? true} /> Ativo</label>
      <Button type="submit"><Plus className="h-4 w-4" />{item ? "Salvar" : "Adicionar"}</Button>
    </form>
  );
}

function DeleteCategoryForm({ guildId, id }: { guildId: string; id: number }) {
  return <form action={deleteCategory.bind(null, guildId)} className="mt-2"><input type="hidden" name="id" value={id} /><Button variant="destructive" size="sm">Remover</Button></form>;
}

function DeleteItemForm({ guildId, id }: { guildId: string; id: number }) {
  return <form action={deleteItem.bind(null, guildId)} className="mt-2"><input type="hidden" name="id" value={id} /><Button variant="destructive" size="sm">Remover</Button></form>;
}

function QueuesCard({ queues }: { queues: Array<{ type: string; item_name: string; total: number }> }) {
  return <Card><CardHeader className="border-b border-border"><CardTitle>Filas</CardTitle><CardDescription>Itens com jogadores aguardando.</CardDescription></CardHeader><CardContent className="pt-5"><DataTable headers={["Tipo", "Item", "Jogadores"]} rows={queues.map((row) => [row.type, row.item_name, <strong key="total">{row.total}</strong>])} /></CardContent></Card>;
}

function DeliveriesCard({ deliveries }: { deliveries: Array<{ type: string; item_name: string; player_name: string; delivered_at_text: string }> }) {
  return <Card><CardHeader className="border-b border-border"><CardTitle>Historico de entregas</CardTitle><CardDescription>Ultimas entregas marcadas pelos administradores.</CardDescription></CardHeader><CardContent className="pt-5"><DataTable headers={["Tipo", "Item", "Player", "Data"]} rows={deliveries.map((row) => [row.type, row.item_name, row.player_name, row.delivered_at_text])} /></CardContent></Card>;
}

function DataTable({ headers, rows }: { headers: string[]; rows: Array<Array<React.ReactNode>> }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>;
  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/50">
          <tr>{headers.map((header) => <th key={header} className="border-b px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-muted/30">{row.map((cell, cellIndex) => <td key={cellIndex} className="border-b px-3 py-2 align-top">{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
