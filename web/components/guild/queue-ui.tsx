"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ImagePlus, Search, Trash2, Users } from "lucide-react";
import { markQueuePlayerDelivered, removeQueuePlayerRegistration } from "@/lib/actions";
import type { QueueGroup } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { tr } from "@/lib/i18n";

export function QueueGrid({ guildId, queues, locale }: { guildId: string; queues: QueueGroup[]; locale?: string }) {
  const [selectedQueue, setSelectedQueue] = useState<QueueGroup | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filteredQueues = useMemo(() => {
    const term = normalizeSearch(query);
    return queues.filter((queue) => {
      const matchesTerm = !term || normalizeSearch([
        queue.item_name,
        queue.type,
        ...queue.players.map((player) => `${player.nickname} ${player.discordUserId}`),
      ].join(" ")).includes(term);
      const matchesType = typeFilter === "all" || queue.type === typeFilter;
      return matchesTerm && matchesType;
    });
  }, [query, queues, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredQueues.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageQueues = filteredQueues.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [pageSize, query, typeFilter]);

  if (!queues.length) {
    return <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">{tr(locale, "Nenhuma fila ativa encontrada.", "No active queues found.")}</div>;
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_170px_140px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={tr(locale, "Filtrar por item, jogador ou Discord ID", "Filter by item, player, or Discord ID")}
                className="pl-9"
              />
            </label>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-10 rounded-md border border-input bg-card px-3 text-sm">
              <option value="all">{tr(locale, "Todos os tipos", "All types")}</option>
              <option value="arch">Archboss</option>
              <option value="rare">{tr(locale, "Item raro", "Rare item")}</option>
            </select>
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="h-10 rounded-md border border-input bg-card px-3 text-sm">
              <option value={10}>{tr(locale, "10 por pagina", "10 per page")}</option>
              <option value={20}>{tr(locale, "20 por pagina", "20 per page")}</option>
              <option value={40}>{tr(locale, "40 por pagina", "40 per page")}</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span><strong className="text-foreground">{filteredQueues.length}</strong> {tr(locale, "de", "of")} {queues.length} {tr(locale, "filas encontradas", "queues found")}</span>
            <span>{tr(locale, "Pagina", "Page")} {safePage} {tr(locale, "de", "of")} {totalPages}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {pageQueues.map((queue) => (
          <Card key={`${queue.type}:${queue.item_name}`} className="overflow-hidden transition hover:border-primary">
            <CardContent className="p-0">
              <div className="border-b border-border bg-muted/40 p-2">
                <QueueImage src={queue.imageUrl} alt={queue.item_name} />
              </div>
              <div className="space-y-3 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 min-h-9 text-sm font-bold leading-tight">{queue.item_name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{queue.type}</p>
                  </div>
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">{queue.type}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedQueue(queue)}
                  className="flex w-full items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-3 text-left transition hover:border-primary hover:bg-muted"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" />{tr(locale, "Jogadores", "Players")}</span>
                  <span className="text-2xl font-bold text-primary">{queue.total}</span>
                </button>
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setSelectedQueue(queue)}>
                  {tr(locale, "Ver fila", "View queue")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!filteredQueues.length ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">{tr(locale, "Nenhuma fila encontrada com os filtros atuais.", "No queues found with the current filters.")}</div>
      ) : null}

      {filteredQueues.length ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {tr(locale, "Mostrando", "Showing")} {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredQueues.length)} {tr(locale, "de", "of")} {filteredQueues.length}
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

      <QueueModal guildId={guildId} queue={selectedQueue} onClose={() => setSelectedQueue(null)} locale={locale} />
    </div>
  );
}

function QueueModal({ guildId, queue, onClose, locale }: { guildId: string; queue: QueueGroup | null; onClose: () => void; locale?: string }) {
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);

  useEffect(() => {
    setExpandedPlayerId(null);
  }, [queue?.type, queue?.item_name]);

  if (!queue) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h3 className="text-lg font-bold">{queue.item_name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{queue.total} {tr(locale, "jogadores na fila", "players in queue")}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>{tr(locale, "Fechar", "Close")}</Button>
        </div>
        <div className="p-5">
          <div className="overflow-auto rounded-md border border-border">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="border-b px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">{tr(locale, "Posicao", "Position")}</th>
                  <th className="border-b px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">{tr(locale, "Jogador", "Player")}</th>
                  <th className="border-b px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Discord ID</th>
                  <th className="border-b px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">{tr(locale, "Registro", "Registered")}</th>
                  <th className="border-b px-3 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">{tr(locale, "Acao", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {queue.players.map((player, index) => {
                  const expanded = expandedPlayerId === player.id;
                  return (
                    <Fragment key={player.id}>
                      <tr className="hover:bg-muted/30">
                        <td className="border-b px-3 py-2 font-semibold">{index + 1}</td>
                        <td className="border-b px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setExpandedPlayerId(expanded ? null : player.id)}
                            className="inline-flex items-center gap-2 font-semibold text-primary hover:underline"
                          >
                            {player.nickname || tr(locale, "Sem nome", "No name")}
                            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                          </button>
                        </td>
                        <td className="border-b px-3 py-2 text-muted-foreground">{player.discordUserId}</td>
                        <td className="border-b px-3 py-2 text-muted-foreground">{player.registeredAtText || formatDate(player.createdAt)}</td>
                        <td className="border-b px-3 py-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <form action={removeQueuePlayerRegistration.bind(null, guildId)}>
                              <input type="hidden" name="entryId" value={player.id} />
                              <Button type="submit" size="sm" variant="destructive" className="w-full sm:w-auto">
                                <Trash2 className="h-4 w-4" />{tr(locale, "Remover", "Remove")}
                              </Button>
                            </form>
                            <form action={markQueuePlayerDelivered.bind(null, guildId)}>
                              <input type="hidden" name="entryId" value={player.id} />
                              <Button type="submit" size="sm" className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto">
                                <CheckCircle2 className="h-4 w-4" />{tr(locale, "Marcar entregue", "Mark delivered")}
                              </Button>
                            </form>
                          </div>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr key={`${player.id}:history`}>
                          <td className="border-b bg-muted/20 px-3 py-3" colSpan={5}>
                            <PlayerHistory playerName={player.nickname || tr(locale, "Sem nome", "No name")} history={player.deliveryHistory} locale={locale} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerHistory({ playerName, history, locale }: { playerName: string; history: QueueGroup["players"][number]["deliveryHistory"]; locale?: string }) {
  if (!history.length) {
    return <div className="rounded-md border border-dashed border-border bg-card p-3 text-sm text-muted-foreground">{tr(locale, "Nenhum ganho registrado para", "No delivery history for")} {playerName}.</div>;
  }

  return (
    <div className="rounded-md border border-border bg-card">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">{tr(locale, "Historico de ganhos", "Delivery history")}</div>
      <div className="divide-y divide-border">
        {history.map((item) => (
          <div key={item.id} className="grid gap-1 px-3 py-2 text-sm sm:grid-cols-[90px_minmax(180px,1fr)_160px] sm:items-center">
            <span className="font-semibold">{item.type}</span>
            <span>{item.itemName}</span>
            <span className="text-muted-foreground">{item.deliveredAtText || formatDate(item.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QueueImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md border border-border bg-card">
      {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : <ImagePlus className="h-7 w-7 text-muted-foreground" />}
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function normalizeSearch(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
