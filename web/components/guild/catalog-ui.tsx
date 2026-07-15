"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Edit3, ImagePlus, PackagePlus, Plus, Search, Trash2 } from "lucide-react";
import { deleteCategory, deleteItem, saveCategory, saveItem } from "@/lib/actions";
import type { Category, GuildItem } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tr } from "@/lib/i18n";

export function CategoryManager({ guildId, categories, locale }: { guildId: string; categories: Category[]; locale?: string }) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">{tr(locale, "Categorias", "Categories")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tr(locale, "Configure agrupamentos, limites por jogador e ordem de exibicao.", "Configure groups, player limits, and display order.")}</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />{tr(locale, "Adicionar categoria", "Add category")}</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {categories.map((category) => (
          <Card key={category.id} className="overflow-hidden">
            <CardHeader className="border-b border-border">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{category.name}</CardTitle>
                  <CardDescription>{category.key}</CardDescription>
                </div>
                <StatusPill active={category.active} activeText={tr(locale, "Ativa", "Active")} inactiveText={tr(locale, "Inativa", "Inactive")} />
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 pt-5 text-sm">
              <Metric label={tr(locale, "Tipo", "Type")} value={category.type} />
              <Metric label={tr(locale, "Limite", "Limit")} value={String(category.limitPerUser)} />
              <Metric label={tr(locale, "Ordem", "Order")} value={String(category.sortOrder)} />
              <div className="col-span-3 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditing(category)}><Edit3 className="h-4 w-4" />{tr(locale, "Editar", "Edit")}</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!categories.length ? <EmptyState text={tr(locale, "Nenhuma categoria cadastrada.", "No categories registered.")} /> : null}

      <Modal title={tr(locale, "Adicionar categoria", "Add category")} open={creating} onClose={() => setCreating(false)} locale={locale}>
        <CategoryForm guildId={guildId} locale={locale} />
      </Modal>
      <Modal title={tr(locale, "Editar categoria", "Edit category")} open={Boolean(editing)} onClose={() => setEditing(null)} locale={locale}>
        {editing ? (
          <div className="space-y-4">
            <CategoryForm guildId={guildId} category={editing} locale={locale} />
            <DeleteCategoryForm guildId={guildId} id={editing.id} locale={locale} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export function ItemManager({ guildId, categories, items, locale }: { guildId: string; categories: Category[]; items: GuildItem[]; locale?: string }) {
  const [editing, setEditing] = useState<GuildItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(15);
  const [page, setPage] = useState(1);

  const filteredItems = useMemo(() => {
    const term = normalizeSearch(query);
    return items.filter((item) => {
      const matchesTerm = !term || normalizeSearch([
        item.name,
        item.namePt,
        item.nameEn,
        item.categoryName,
        item.type,
      ].join(" ")).includes(term);
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesCategory = categoryFilter === "all" || String(item.categoryId || "") === categoryFilter;
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? item.active : !item.active);
      return matchesTerm && matchesType && matchesCategory && matchesStatus;
    });
  }, [categoryFilter, items, query, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredItems.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, pageSize, query, statusFilter, typeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">{tr(locale, "Itens", "Items")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tr(locale, "Gerencie imagens, categorias e disponibilidade no autocomplete.", "Manage images, categories, and autocomplete availability.")}</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />{tr(locale, "Adicionar item", "Add item")}</Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_150px_190px_150px_120px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={tr(locale, "Filtrar por nome ou categoria", "Filter by name or category")}
                className="pl-9"
              />
            </label>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-10 rounded-md border border-input bg-card px-3 text-sm">
              <option value="all">{tr(locale, "Todos os tipos", "All types")}</option>
              <option value="arch">Archboss</option>
              <option value="rare">{tr(locale, "Item raro", "Rare item")}</option>
            </select>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-10 rounded-md border border-input bg-card px-3 text-sm">
              <option value="all">{tr(locale, "Todas categorias", "All categories")}</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-md border border-input bg-card px-3 text-sm">
              <option value="all">{tr(locale, "Todos status", "All statuses")}</option>
              <option value="active">{tr(locale, "Ativos", "Active")}</option>
              <option value="inactive">{tr(locale, "Inativos", "Inactive")}</option>
            </select>
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="h-10 rounded-md border border-input bg-card px-3 text-sm">
              <option value={15}>{tr(locale, "15 por pagina", "15 per page")}</option>
              <option value={25}>{tr(locale, "25 por pagina", "25 per page")}</option>
              <option value={50}>{tr(locale, "50 por pagina", "50 per page")}</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span><strong className="text-foreground">{filteredItems.length}</strong> {tr(locale, "de", "of")} {items.length} {tr(locale, "itens encontrados", "items found")}</span>
            <span>{tr(locale, "Pagina", "Page")} {safePage} {tr(locale, "de", "of")} {totalPages}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {pageItems.map((item) => (
          <ItemCard key={item.id} item={item} onEdit={() => setEditing(item)} locale={locale} />
        ))}
      </div>

      {!filteredItems.length ? <EmptyState text={tr(locale, "Nenhum item encontrado com os filtros atuais.", "No items found with the current filters.")} /> : null}

      {filteredItems.length ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {tr(locale, "Mostrando", "Showing")} {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredItems.length)} {tr(locale, "de", "of")} {filteredItems.length}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              <ChevronLeft className="h-4 w-4" />{tr(locale, "Anterior", "Previous")}
            </Button>
            <div className="rounded-md border border-border px-3 py-2 text-sm font-semibold">{safePage}/{totalPages}</div>
            <Button type="button" variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
              {tr(locale, "Proxima", "Next")}<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <Modal title={tr(locale, "Adicionar item", "Add item")} open={creating} onClose={() => setCreating(false)} locale={locale}>
        <ItemForm guildId={guildId} categories={categories} locale={locale} />
      </Modal>
      <Modal title={tr(locale, "Editar item", "Edit item")} open={Boolean(editing)} onClose={() => setEditing(null)} locale={locale}>
        {editing ? (
          <div className="space-y-4">
            <ItemForm guildId={guildId} categories={categories} item={editing} locale={locale} />
            <DeleteItemForm guildId={guildId} id={editing.id} locale={locale} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function ItemCard({ item, onEdit, locale }: { item: GuildItem; onEdit: () => void; locale?: string }) {
  return (
    <Card className="group overflow-hidden transition hover:border-primary">
      <CardContent className="p-0">
        <div className="border-b border-border bg-muted/40 p-1.5">
          <ItemImage src={item.imageUrl} alt={item.name} className="aspect-[2/1] w-full rounded-md border-border bg-card" />
        </div>
        <div className="space-y-2 p-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-2 min-h-8 text-xs font-bold leading-tight">{item.name}</h3>
              <p className="mt-1 truncate text-xs text-muted-foreground">{item.categoryName || tr(locale, "Sem categoria", "No category")}</p>
            </div>
            <StatusPill active={item.active} activeText={tr(locale, "Ativo", "Active")} inactiveText={tr(locale, "Inativo", "Inactive")} />
          </div>
          <div className="grid grid-cols-2 gap-1.5 rounded-md border border-border bg-muted/30 p-1.5 text-[11px]">
            <Metric label={tr(locale, "Tipo", "Type")} value={item.type} />
            <Metric label={tr(locale, "Ordem", "Order")} value={String(item.sortOrder)} />
          </div>
          <div className="flex justify-end border-t border-border pt-2">
            <Button variant="outline" size="sm" onClick={onEdit}><Edit3 className="h-4 w-4" />{tr(locale, "Editar", "Edit")}</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryForm({ guildId, category, locale }: { guildId: string; category?: Category; locale?: string }) {
  return (
    <form action={saveCategory.bind(null, guildId)} className="grid gap-4">
      <input type="hidden" name="id" defaultValue={category?.id || ""} />
      <Label className="grid gap-2">{tr(locale, "Tipo", "Type")}
        <select name="type" defaultValue={category?.type || "rare"} className="rounded-md border border-input bg-card px-3 py-2">
          <option value="arch">Archboss</option>
          <option value="rare">{tr(locale, "Item raro", "Rare item")}</option>
        </select>
      </Label>
      <Label className="grid gap-2">{tr(locale, "Nome", "Name")}
        <Input name="name" defaultValue={category?.name || ""} required />
      </Label>
      <Label className="grid gap-2">{tr(locale, "Chave", "Key")}
        <Input name="key" placeholder={tr(locale, "gerada pelo nome se ficar vazia", "generated from the name if left blank")} defaultValue={category?.key || ""} />
      </Label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="grid gap-2">{tr(locale, "Limite por jogador", "Limit per player")}
          <Input type="number" min="0" name="limitPerUser" defaultValue={category?.limitPerUser ?? 1} />
        </Label>
        <Label className="grid gap-2">{tr(locale, "Ordem", "Order")}
          <Input type="number" name="sortOrder" defaultValue={category?.sortOrder || 0} />
        </Label>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={category?.active ?? true} /> {tr(locale, "Categoria ativa", "Active category")}</label>
      <Button type="submit"><PackagePlus className="h-4 w-4" />{tr(locale, "Salvar categoria", "Save category")}</Button>
    </form>
  );
}

function ItemForm({ guildId, categories, item, locale }: { guildId: string; categories: Category[]; item?: GuildItem; locale?: string }) {
  return (
    <form action={saveItem.bind(null, guildId)} className="grid gap-4">
      <input type="hidden" name="id" defaultValue={item?.id || ""} />
      <input type="hidden" name="imageUrl" defaultValue={item?.imageUrl || ""} />
      {item?.imageUrl ? (
        <div className="grid gap-3 sm:grid-cols-[96px_1fr] sm:items-center">
          <ItemImage src={item.imageUrl} alt={item.name} />
          <div className="text-sm text-muted-foreground">{tr(locale, "Imagem atual do item. Envie outro arquivo para substituir.", "Current item image. Upload another file to replace it.")}</div>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="grid gap-2">{tr(locale, "Tipo", "Type")}
          <select name="type" defaultValue={item?.type || "rare"} className="rounded-md border border-input bg-card px-3 py-2">
            <option value="arch">Archboss</option>
            <option value="rare">{tr(locale, "Item raro", "Rare item")}</option>
          </select>
        </Label>
        <Label className="grid gap-2">{tr(locale, "Categoria", "Category")}
          <select name="categoryId" defaultValue={item?.categoryId || ""} className="rounded-md border border-input bg-card px-3 py-2">
            <option value="">{tr(locale, "Sem categoria", "No category")}</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </Label>
      </div>
      <Label className="grid gap-2">{tr(locale, "Nome usado no bot", "Name used by the bot")}
        <Input name="name" defaultValue={item?.name || ""} required />
      </Label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="grid gap-2">{tr(locale, "Nome PT", "PT name")}
          <Input name="namePt" defaultValue={item?.namePt || ""} />
        </Label>
        <Label className="grid gap-2">{tr(locale, "Nome EN", "EN name")}
          <Input name="nameEn" defaultValue={item?.nameEn || ""} />
        </Label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="grid gap-2">{tr(locale, "Ordem", "Order")}
          <Input name="sortOrder" type="number" defaultValue={item?.sortOrder || 0} />
        </Label>
        <Label className="grid gap-2">{tr(locale, "Upload de imagem", "Image upload")}
          <Input name="imageFile" type="file" accept="image/*" />
        </Label>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={item?.active ?? true} /> {tr(locale, "Item ativo", "Active item")}</label>
      <Button type="submit"><ImagePlus className="h-4 w-4" />{tr(locale, "Salvar item", "Save item")}</Button>
    </form>
  );
}

function DeleteCategoryForm({ guildId, id, locale }: { guildId: string; id: number; locale?: string }) {
  return (
    <form action={deleteCategory.bind(null, guildId)} className="border-t border-border pt-4">
      <input type="hidden" name="id" value={id} />
      <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" />{tr(locale, "Remover categoria", "Remove category")}</Button>
    </form>
  );
}

function DeleteItemForm({ guildId, id, locale }: { guildId: string; id: number; locale?: string }) {
  return (
    <form action={deleteItem.bind(null, guildId)} className="border-t border-border pt-4">
      <input type="hidden" name="id" value={id} />
      <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" />{tr(locale, "Remover item", "Remove item")}</Button>
    </form>
  );
}

function Modal({ title, open, onClose, children, locale }: { title: string; open: boolean; onClose: () => void; children: ReactNode; locale?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>{tr(locale, "Fechar", "Close")}</Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ItemImage({ src, alt, className = "" }: { src?: string; alt: string; className?: string }) {
  return (
    <div className={`flex aspect-square items-center justify-center overflow-hidden rounded-md border border-border bg-muted ${className}`}>
      {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : <ImagePlus className="h-7 w-7 text-muted-foreground" />}
    </div>
  );
}

function StatusPill({ active, activeText, inactiveText }: { active: boolean; activeText: string; inactiveText: string }) {
  return (
    <span className={active ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700" : "rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground"}>
      {active ? activeText : inactiveText}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate font-semibold">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">{text}</div>;
}

function normalizeSearch(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
