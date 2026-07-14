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

export function CategoryManager({ guildId, categories }: { guildId: string; categories: Category[] }) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Categorias</h2>
          <p className="mt-1 text-sm text-muted-foreground">Configure agrupamentos, limites por jogador e ordem de exibicao.</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Adicionar categoria</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {categories.map((category) => (
          <Card key={category.id} className="overflow-hidden">
            <CardHeader className="border-b border-border">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{category.name}</CardTitle>
                  <CardDescription>{category.key}</CardDescription>
                </div>
                <StatusPill active={category.active} activeText="Ativa" inactiveText="Inativa" />
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 pt-5 text-sm">
              <Metric label="Tipo" value={category.type} />
              <Metric label="Limite" value={String(category.limitPerUser)} />
              <Metric label="Ordem" value={String(category.sortOrder)} />
              <div className="col-span-3 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditing(category)}><Edit3 className="h-4 w-4" />Editar</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!categories.length ? <EmptyState text="Nenhuma categoria cadastrada." /> : null}

      <Modal title="Adicionar categoria" open={creating} onClose={() => setCreating(false)}>
        <CategoryForm guildId={guildId} />
      </Modal>
      <Modal title="Editar categoria" open={Boolean(editing)} onClose={() => setEditing(null)}>
        {editing ? (
          <div className="space-y-4">
            <CategoryForm guildId={guildId} category={editing} />
            <DeleteCategoryForm guildId={guildId} id={editing.id} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export function ItemManager({ guildId, categories, items }: { guildId: string; categories: Category[]; items: GuildItem[] }) {
  const [editing, setEditing] = useState<GuildItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(12);
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
        ...item.aliases,
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
          <h2 className="text-2xl font-bold">Itens</h2>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie imagens, categorias, aliases e disponibilidade no autocomplete.</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Adicionar item</Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_150px_190px_150px_120px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filtrar por nome, alias ou categoria"
                className="pl-9"
              />
            </label>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-10 rounded-md border border-input bg-card px-3 text-sm">
              <option value="all">Todos os tipos</option>
              <option value="arch">Archboss</option>
              <option value="rare">Item raro</option>
            </select>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-10 rounded-md border border-input bg-card px-3 text-sm">
              <option value="all">Todas categorias</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-md border border-input bg-card px-3 text-sm">
              <option value="all">Todos status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="h-10 rounded-md border border-input bg-card px-3 text-sm">
              <option value={12}>12 por pagina</option>
              <option value={24}>24 por pagina</option>
              <option value={48}>48 por pagina</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span><strong className="text-foreground">{filteredItems.length}</strong> de {items.length} itens encontrados</span>
            <span>Pagina {safePage} de {totalPages}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {pageItems.map((item) => (
          <ItemCard key={item.id} item={item} onEdit={() => setEditing(item)} />
        ))}
      </div>

      {!filteredItems.length ? <EmptyState text="Nenhum item encontrado com os filtros atuais." /> : null}

      {filteredItems.length ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredItems.length)} de {filteredItems.length}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              <ChevronLeft className="h-4 w-4" />Anterior
            </Button>
            <div className="rounded-md border border-border px-3 py-2 text-sm font-semibold">{safePage}/{totalPages}</div>
            <Button type="button" variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
              Proxima<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <Modal title="Adicionar item" open={creating} onClose={() => setCreating(false)}>
        <ItemForm guildId={guildId} categories={categories} />
      </Modal>
      <Modal title="Editar item" open={Boolean(editing)} onClose={() => setEditing(null)}>
        {editing ? (
          <div className="space-y-4">
            <ItemForm guildId={guildId} categories={categories} item={editing} />
            <DeleteItemForm guildId={guildId} id={editing.id} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function ItemCard({ item, onEdit }: { item: GuildItem; onEdit: () => void }) {
  return (
    <Card className="group overflow-hidden transition hover:border-primary">
      <CardContent className="p-0">
        <div className="border-b border-border bg-muted/40 p-2">
          <ItemImage src={item.imageUrl} alt={item.name} className="aspect-[5/3] w-full rounded-md border-border bg-card" />
        </div>
        <div className="space-y-2.5 p-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-2 min-h-8 text-[13px] font-bold leading-tight">{item.name}</h3>
              <p className="mt-1 truncate text-xs text-muted-foreground">{item.categoryName || "Sem categoria"}</p>
            </div>
            <StatusPill active={item.active} activeText="Ativo" inactiveText="Inativo" />
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-md border border-border bg-muted/30 p-2 text-xs">
            <Metric label="Tipo" value={item.type} />
            <Metric label="Ordem" value={String(item.sortOrder)} />
            <Metric label="Aliases" value={String(item.aliases.length)} />
          </div>
          <div className="min-h-8">
            {item.aliases.length ? (
              <p className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">{item.aliases.join(", ")}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">Sem aliases cadastrados.</p>
            )}
          </div>
          <div className="flex justify-end border-t border-border pt-2.5">
            <Button variant="outline" size="sm" onClick={onEdit}><Edit3 className="h-4 w-4" />Editar</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryForm({ guildId, category }: { guildId: string; category?: Category }) {
  return (
    <form action={saveCategory.bind(null, guildId)} className="grid gap-4">
      <input type="hidden" name="id" defaultValue={category?.id || ""} />
      <Label className="grid gap-2">Tipo
        <select name="type" defaultValue={category?.type || "rare"} className="rounded-md border border-input bg-card px-3 py-2">
          <option value="arch">Archboss</option>
          <option value="rare">Item raro</option>
        </select>
      </Label>
      <Label className="grid gap-2">Nome
        <Input name="name" defaultValue={category?.name || ""} required />
      </Label>
      <Label className="grid gap-2">Chave
        <Input name="key" placeholder="gerada pelo nome se ficar vazia" defaultValue={category?.key || ""} />
      </Label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="grid gap-2">Limite por jogador
          <Input type="number" min="0" name="limitPerUser" defaultValue={category?.limitPerUser ?? 1} />
        </Label>
        <Label className="grid gap-2">Ordem
          <Input type="number" name="sortOrder" defaultValue={category?.sortOrder || 0} />
        </Label>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={category?.active ?? true} /> Categoria ativa</label>
      <Button type="submit"><PackagePlus className="h-4 w-4" />Salvar categoria</Button>
    </form>
  );
}

function ItemForm({ guildId, categories, item }: { guildId: string; categories: Category[]; item?: GuildItem }) {
  return (
    <form action={saveItem.bind(null, guildId)} className="grid gap-4">
      <input type="hidden" name="id" defaultValue={item?.id || ""} />
      <input type="hidden" name="imageUrl" defaultValue={item?.imageUrl || ""} />
      {item?.imageUrl ? (
        <div className="grid gap-3 sm:grid-cols-[96px_1fr] sm:items-center">
          <ItemImage src={item.imageUrl} alt={item.name} />
          <div className="text-sm text-muted-foreground">Imagem atual do item. Envie outro arquivo para substituir.</div>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="grid gap-2">Tipo
          <select name="type" defaultValue={item?.type || "rare"} className="rounded-md border border-input bg-card px-3 py-2">
            <option value="arch">Archboss</option>
            <option value="rare">Item raro</option>
          </select>
        </Label>
        <Label className="grid gap-2">Categoria
          <select name="categoryId" defaultValue={item?.categoryId || ""} className="rounded-md border border-input bg-card px-3 py-2">
            <option value="">Sem categoria</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </Label>
      </div>
      <Label className="grid gap-2">Nome usado no bot
        <Input name="name" defaultValue={item?.name || ""} required />
      </Label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="grid gap-2">Nome PT
          <Input name="namePt" defaultValue={item?.namePt || ""} />
        </Label>
        <Label className="grid gap-2">Nome EN
          <Input name="nameEn" defaultValue={item?.nameEn || ""} />
        </Label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="grid gap-2">Ordem
          <Input name="sortOrder" type="number" defaultValue={item?.sortOrder || 0} />
        </Label>
        <Label className="grid gap-2">Upload de imagem
          <Input name="imageFile" type="file" accept="image/*" />
        </Label>
      </div>
      <Label className="grid gap-2">Aliases
        <textarea name="aliases" defaultValue={(item?.aliases || []).join(", ")} className="min-h-24 rounded-md border border-input bg-card px-3 py-2 text-sm" />
      </Label>
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={item?.active ?? true} /> Item ativo</label>
      <Button type="submit"><ImagePlus className="h-4 w-4" />Salvar item</Button>
    </form>
  );
}

function DeleteCategoryForm({ guildId, id }: { guildId: string; id: number }) {
  return (
    <form action={deleteCategory.bind(null, guildId)} className="border-t border-border pt-4">
      <input type="hidden" name="id" value={id} />
      <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" />Remover categoria</Button>
    </form>
  );
}

function DeleteItemForm({ guildId, id }: { guildId: string; id: number }) {
  return (
    <form action={deleteItem.bind(null, guildId)} className="border-t border-border pt-4">
      <input type="hidden" name="id" value={id} />
      <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" />Remover item</Button>
    </form>
  );
}

function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
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
