import Link from "next/link";
import type { ReactNode } from "react";
import { Bot, Box, CheckCircle2, Gem, PackagePlus, Plus, RefreshCw, Send, ShieldCheck, Swords, Users, XCircle } from "lucide-react";
import { deleteCategory, deleteItem, resendControlPanel, saveCategory, saveItem, saveSettings, testConfiguredChannel } from "@/lib/actions";
import type { Category, GuildItem } from "@/lib/data";
import type { GuildBotStatus } from "@/lib/discord";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tr } from "@/lib/i18n";

export function GuildHeader({ title, description, locale }: { title: string; description: string; locale?: string }) {
  return (
    <div>
      <Link href="/dashboard" className="text-sm font-medium text-primary">{tr(locale, "Voltar", "Back")}</Link>
      <h1 className="mt-2 text-3xl font-bold">{title}</h1>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </div>
  );
}

export function Stats({ counts, queues, locale }: { counts: { arch_count: number; rare_count: number; player_count: number }; queues: number; locale?: string }) {
  const stats = [
    ["Archboss", counts.arch_count, <Swords key="a" />],
    [tr(locale, "Itens raros", "Rare items"), counts.rare_count, <Gem key="b" />],
    [tr(locale, "Jogadores", "Players"), counts.player_count, <Users key="c" />],
    [tr(locale, "Filas", "Queues"), queues, <Box key="d" />],
  ] as const;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(([label, value, icon]) => (
        <Card key={label}>
          <CardContent className="flex items-center justify-between p-5">
            <div><div className="text-sm text-muted-foreground">{label}</div><div className="mt-1 text-3xl font-bold">{value}</div></div>
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-muted text-primary">{icon}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SettingsCard({ guildId, channels, roles, settings }: {
  guildId: string;
  channels: Array<{ id: string; name: string }>;
  roles: Array<{ id: string; name: string }>;
  settings: { allowedChannelId: string; adminRoleIds: string[]; locale: string };
}) {
  const locale = settings.locale;
  return (
    <Card>
      <CardHeader><CardTitle>{tr(locale, "Configuracao do bot", "Bot settings")}</CardTitle><CardDescription>{tr(locale, "Canal de uso, idioma e cargos que podem administrar.", "Usage channel, language, and roles that can administer.")}</CardDescription></CardHeader>
      <CardContent>
        <form action={saveSettings.bind(null, guildId)} className="space-y-4">
          <Label className="grid gap-2">{tr(locale, "Canal permitido", "Allowed channel")}
            <select name="allowedChannelId" defaultValue={settings.allowedChannelId} className="mt-2 w-full rounded-md border-input">
              <option value="">{tr(locale, "Sem canal fixo", "No fixed channel")}</option>
              {channels.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}
            </select>
          </Label>
          <Label className="grid gap-2">{tr(locale, "Idioma", "Language")}
            <select name="locale" defaultValue={settings.locale || "pt-BR"} className="mt-2 w-full rounded-md border-input">
              <option value="pt-BR">{tr(locale, "Português", "Portuguese")}</option>
              <option value="en-US">English</option>
            </select>
          </Label>
          <Label className="grid gap-2">{tr(locale, "Cargos administradores", "Administrator roles")}
            <select name="adminRoleIds" multiple defaultValue={settings.adminRoleIds} className="mt-2 w-full rounded-md border-input">
              {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
          </Label>
          <Button type="submit"><ShieldCheck className="h-4 w-4" />{tr(locale, "Salvar configuracoes", "Save settings")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function GuildAdministrationCard({ guildId, status, locale }: { guildId: string; status: GuildBotStatus; locale?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />{tr(locale, "Administracao da Guild", "Guild Administration")}</CardTitle>
        <CardDescription>{tr(locale, "Status do bot, canal configurado e acoes do painel.", "Bot status, configured channel, and panel actions.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 text-sm">
          <StatusRow locale={locale} label={tr(locale, "Bot na guild", "Bot in guild")} ok={status.botInstalled} value={status.botInstalled ? tr(locale, "Instalado", "Installed") : tr(locale, "Nao instalado", "Not installed")} />
          <StatusRow locale={locale} label={tr(locale, "Canal configurado", "Configured channel")} ok={status.channelExists} value={status.configuredChannelId ? status.channelExists ? `#${status.channelName}` : tr(locale, "Canal nao encontrado", "Channel not found") : tr(locale, "Sem canal", "No channel")} />
          <StatusRow locale={locale} label={tr(locale, "Ver canal", "View channel")} ok={status.permissions.viewChannel} />
          <StatusRow locale={locale} label={tr(locale, "Enviar mensagens", "Send messages")} ok={status.permissions.sendMessages} />
          <StatusRow locale={locale} label={tr(locale, "Enviar embeds", "Send embeds")} ok={status.permissions.embedLinks} />
          <StatusRow locale={locale} label={tr(locale, "Ler historico", "Read history")} ok={status.permissions.readMessageHistory} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <form action={testConfiguredChannel.bind(null, guildId)}>
            <Button type="submit" variant="outline" className="w-full" disabled={!status.canSendPanel}>
              <Send className="h-4 w-4" />{tr(locale, "Testar envio", "Test send")}
            </Button>
          </form>
          <form action={resendControlPanel.bind(null, guildId)}>
            <Button type="submit" className="w-full" disabled={!status.canSendPanel}>
              <RefreshCw className="h-4 w-4" />{tr(locale, "Reenviar painel", "Resend panel")}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusRow({ label, ok, value, locale }: { label: string; ok: boolean; value?: string; locale?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={ok ? "inline-flex items-center gap-2 font-semibold text-emerald-700" : "inline-flex items-center gap-2 font-semibold text-destructive"}>
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        {value || (ok ? "OK" : tr(locale, "Falha", "Failed"))}
      </span>
    </div>
  );
}

export function SubscriptionCard({ subscription, locale }: { subscription: { plan: string; status: string; current_period_ends_at: Date | null }; locale?: string }) {
  return (
    <Card>
      <CardHeader><CardTitle>{tr(locale, "Assinatura", "Subscription")}</CardTitle><CardDescription>{tr(locale, "Status comercial da guild.", "Guild billing status.")}</CardDescription></CardHeader>
      <CardContent className="grid grid-cols-[110px_1fr] gap-3 text-sm">
        <span className="text-muted-foreground">{tr(locale, "Plano", "Plan")}</span><strong>{subscription.plan}</strong>
        <span className="text-muted-foreground">Status</span><strong>{subscription.status}</strong>
        <span className="text-muted-foreground">{tr(locale, "Validade", "Expires")}</span><strong>{subscription.current_period_ends_at ? String(subscription.current_period_ends_at) : tr(locale, "Sem data", "No date")}</strong>
      </CardContent>
    </Card>
  );
}

export function CategoriesCard({ guildId, categories, locale }: { guildId: string; categories: Category[]; locale?: string }) {
  return (
    <Card>
      <CardHeader className="border-b border-border"><CardTitle>{tr(locale, "Categorias", "Categories")}</CardTitle><CardDescription>{tr(locale, "Limite por jogador e agrupamento dos itens.", "Player limits and item grouping.")}</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border bg-muted/30 p-4"><CategoryForm guildId={guildId} locale={locale} /></div>
        <DataTable locale={locale} headers={[tr(locale, "Tipo", "Type"), tr(locale, "Categoria", "Category"), tr(locale, "Limite", "Limit"), tr(locale, "Ordem", "Order"), "Status", tr(locale, "Editar", "Edit")]} rows={categories.map((category) => [
          category.type,
          <div key="name">{category.name}<div className="text-xs text-muted-foreground">{category.key}</div></div>,
          category.limitPerUser,
          category.sortOrder,
          category.active ? tr(locale, "Ativa", "Active") : tr(locale, "Inativa", "Inactive"),
          <details key="edit"><summary>{tr(locale, "Editar", "Edit")}</summary><CategoryForm guildId={guildId} category={category} locale={locale} /><DeleteCategoryForm guildId={guildId} id={category.id} locale={locale} /></details>,
        ])} />
      </CardContent>
    </Card>
  );
}

export function ItemsCard({ guildId, categories, items, locale }: { guildId: string; categories: Category[]; items: GuildItem[]; locale?: string }) {
  return (
    <Card>
      <CardHeader className="border-b border-border"><CardTitle>{tr(locale, "Itens", "Items")}</CardTitle><CardDescription>{tr(locale, "Catalogo usado no autocomplete e no painel do Discord.", "Catalog used by autocomplete and the Discord panel.")}</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border bg-muted/30 p-4"><ItemForm guildId={guildId} categories={categories} locale={locale} /></div>
        <DataTable locale={locale} headers={[tr(locale, "Tipo", "Type"), "Item", tr(locale, "Categoria", "Category"), tr(locale, "Ordem", "Order"), "Status", tr(locale, "Editar", "Edit")]} rows={items.map((item) => [
          item.type,
          <div key="item">{item.name}</div>,
          item.categoryName,
          item.sortOrder,
          item.active ? tr(locale, "Ativo", "Active") : tr(locale, "Inativo", "Inactive"),
          <details key="edit"><summary>{tr(locale, "Editar", "Edit")}</summary><ItemForm guildId={guildId} categories={categories} item={item} locale={locale} /><DeleteItemForm guildId={guildId} id={item.id} locale={locale} /></details>,
        ])} />
      </CardContent>
    </Card>
  );
}

export function CategoryForm({ guildId, category, locale }: { guildId: string; category?: Category; locale?: string }) {
  return (
    <form action={saveCategory.bind(null, guildId)} className="grid gap-3 md:grid-cols-[120px_1fr_130px_90px_92px_auto]">
      <input type="hidden" name="id" defaultValue={category?.id || ""} />
      <select name="type" defaultValue={category?.type || "rare"} className="rounded-md border-input"><option value="arch">Archboss</option><option value="rare">{tr(locale, "Item raro", "Rare item")}</option></select>
      <Input name="name" placeholder={tr(locale, "Nome", "Name")} defaultValue={category?.name || ""} required />
      <Input name="key" placeholder={tr(locale, "chave", "key")} defaultValue={category?.key || ""} />
      <Input type="number" min="0" name="limitPerUser" defaultValue={category?.limitPerUser ?? 1} />
      <Input type="number" name="sortOrder" defaultValue={category?.sortOrder || 0} />
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={category?.active ?? true} /> {tr(locale, "Ativa", "Active")}</label>
      <Button type="submit"><PackagePlus className="h-4 w-4" />{category ? tr(locale, "Salvar", "Save") : tr(locale, "Adicionar", "Add")}</Button>
    </form>
  );
}

export function ItemForm({ guildId, categories, item, locale }: { guildId: string; categories: Category[]; item?: GuildItem; locale?: string }) {
  return (
    <form action={saveItem.bind(null, guildId)} className="grid gap-3 md:grid-cols-4">
      <input type="hidden" name="id" defaultValue={item?.id || ""} />
      <select name="type" defaultValue={item?.type || "rare"} className="rounded-md border-input"><option value="arch">Archboss</option><option value="rare">{tr(locale, "Item raro", "Rare item")}</option></select>
      <select name="categoryId" defaultValue={item?.categoryId || ""} className="rounded-md border-input"><option value="">{tr(locale, "Sem categoria", "No category")}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
      <Input name="name" placeholder={tr(locale, "Nome usado no bot", "Name used by the bot")} defaultValue={item?.name || ""} required />
      <Input name="sortOrder" type="number" defaultValue={item?.sortOrder || 0} />
      <Input name="namePt" placeholder={tr(locale, "Nome PT", "PT name")} defaultValue={item?.namePt || ""} />
      <Input name="nameEn" placeholder={tr(locale, "Nome EN", "EN name")} defaultValue={item?.nameEn || ""} />
      <Input name="imageUrl" placeholder={tr(locale, "URL da imagem/icone", "Image/icon URL")} defaultValue={item?.imageUrl || ""} />
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={item?.active ?? true} /> {tr(locale, "Ativo", "Active")}</label>
      <Button type="submit"><Plus className="h-4 w-4" />{item ? tr(locale, "Salvar", "Save") : tr(locale, "Adicionar", "Add")}</Button>
    </form>
  );
}

function DeleteCategoryForm({ guildId, id, locale }: { guildId: string; id: number; locale?: string }) {
  return <form action={deleteCategory.bind(null, guildId)} className="mt-2"><input type="hidden" name="id" value={id} /><Button variant="destructive" size="sm">{tr(locale, "Remover", "Remove")}</Button></form>;
}

function DeleteItemForm({ guildId, id, locale }: { guildId: string; id: number; locale?: string }) {
  return <form action={deleteItem.bind(null, guildId)} className="mt-2"><input type="hidden" name="id" value={id} /><Button variant="destructive" size="sm">{tr(locale, "Remover", "Remove")}</Button></form>;
}

export function QueuesCard({ queues, locale }: { queues: Array<{ type: string; item_name: string; total: number }>; locale?: string }) {
  return <Card><CardHeader className="border-b border-border"><CardTitle>{tr(locale, "Filas", "Queues")}</CardTitle><CardDescription>{tr(locale, "Itens com jogadores aguardando.", "Items with waiting players.")}</CardDescription></CardHeader><CardContent className="pt-5"><DataTable locale={locale} headers={[tr(locale, "Tipo", "Type"), "Item", tr(locale, "Jogadores", "Players")]} rows={queues.map((row) => [row.type, row.item_name, <strong key="total">{row.total}</strong>])} /></CardContent></Card>;
}

export function DeliveriesCard({ deliveries, locale }: { deliveries: Array<{ type: string; item_name: string; player_name: string; delivered_at_text: string }>; locale?: string }) {
  return <Card><CardHeader className="border-b border-border"><CardTitle>{tr(locale, "Historico de entregas", "Delivery history")}</CardTitle><CardDescription>{tr(locale, "Ultimas entregas marcadas pelos administradores.", "Latest deliveries marked by administrators.")}</CardDescription></CardHeader><CardContent className="pt-5"><DataTable locale={locale} headers={[tr(locale, "Tipo", "Type"), "Item", "Player", tr(locale, "Data", "Date")]} rows={deliveries.map((row) => [row.type, row.item_name, row.player_name, row.delivered_at_text])} /></CardContent></Card>;
}

export function DataTable({ headers, rows, locale }: { headers: string[]; rows: Array<Array<ReactNode>>; locale?: string }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{tr(locale, "Nenhum registro encontrado.", "No records found.")}</p>;
  return (
    <div className="overflow-auto"><table className="w-full border-collapse text-sm"><thead className="bg-muted/50"><tr>{headers.map((header) => <th key={header} className="border-b px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="hover:bg-muted/30">{row.map((cell, cellIndex) => <td key={cellIndex} className="border-b px-3 py-2 align-top">{cell}</td>)}</tr>)}</tbody></table></div>
  );
}
