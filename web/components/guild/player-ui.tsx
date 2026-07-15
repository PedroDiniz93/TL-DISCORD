"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, UserRound } from "lucide-react";
import type { GuildPlayer } from "@/lib/data";
import { tr } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function PlayerGrid({ players, locale }: { players: GuildPlayer[]; locale?: string }) {
  const [selectedPlayer, setSelectedPlayer] = useState<GuildPlayer | null>(null);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(15);
  const [page, setPage] = useState(1);

  const filteredPlayers = useMemo(() => {
    const term = normalizeSearch(query);
    return players.filter((player) => {
      if (!term) return true;
      return normalizeSearch([
        player.nickname,
        player.discordUserId,
        ...player.activeItems.map((item) => item.itemName),
        ...player.deliveryHistory.map((item) => item.itemName),
      ].join(" ")).includes(term);
    });
  }, [players, query]);

  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagePlayers = filteredPlayers.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [pageSize, query]);

  if (!players.length) {
    return <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">{tr(locale, "Nenhum jogador encontrado.", "No players found.")}</div>;
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_140px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={tr(locale, "Filtrar por jogador, Discord ID ou item", "Filter by player, Discord ID, or item")}
                className="pl-9"
              />
            </label>
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="h-10 rounded-md border border-input bg-card px-3 text-sm">
              <option value={15}>{tr(locale, "15 por pagina", "15 per page")}</option>
              <option value={30}>{tr(locale, "30 por pagina", "30 per page")}</option>
              <option value={60}>{tr(locale, "60 por pagina", "60 per page")}</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span><strong className="text-foreground">{filteredPlayers.length}</strong> {tr(locale, "de", "of")} {players.length} {tr(locale, "jogadores encontrados", "players found")}</span>
            <span>{tr(locale, "Pagina", "Page")} {safePage} {tr(locale, "de", "of")} {totalPages}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {pagePlayers.map((player) => (
          <button key={player.key} type="button" onClick={() => setSelectedPlayer(player)} className="text-left">
            <Card className="h-full overflow-hidden transition hover:border-primary">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold">{player.nickname || tr(locale, "Sem nome", "No name")}</h3>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{player.discordUserId || tr(locale, "Sem Discord ID", "No Discord ID")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-muted/30 p-2 text-xs">
                  <Metric label={tr(locale, "Lista atual", "Current list")} value={String(player.activeItems.length)} />
                  <Metric label={tr(locale, "Recebidos", "Delivered")} value={String(player.deliveryHistory.length)} />
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {!filteredPlayers.length ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">{tr(locale, "Nenhum jogador encontrado com os filtros atuais.", "No players found with the current filters.")}</div>
      ) : null}

      {filteredPlayers.length ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {tr(locale, "Mostrando", "Showing")} {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredPlayers.length)} {tr(locale, "de", "of")} {filteredPlayers.length}
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

      <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} locale={locale} />
    </div>
  );
}

function PlayerModal({ player, onClose, locale }: { player: GuildPlayer | null; onClose: () => void; locale?: string }) {
  if (!player) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h3 className="text-lg font-bold">{player.nickname || tr(locale, "Sem nome", "No name")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{player.discordUserId || tr(locale, "Sem Discord ID", "No Discord ID")}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>{tr(locale, "Fechar", "Close")}</Button>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <PlayerSection
            title={tr(locale, "Lista atual", "Current list")}
            emptyText={tr(locale, "Nenhum item ativo na lista.", "No active items in the list.")}
            headers={[tr(locale, "Tipo", "Type"), "Item", tr(locale, "Registro", "Registered")]}
            rows={player.activeItems.map((item) => [item.type, item.itemName, item.registeredAtText || formatDate(item.createdAt)])}
          />
          <PlayerSection
            title={tr(locale, "Historico de recebimento", "Delivery history")}
            emptyText={tr(locale, "Nenhum recebimento registrado.", "No deliveries registered.")}
            headers={[tr(locale, "Tipo", "Type"), "Item", tr(locale, "Data", "Date")]}
            rows={player.deliveryHistory.map((item) => [item.type, item.itemName, item.deliveredAtText || formatDate(item.createdAt)])}
          />
        </div>
      </div>
    </div>
  );
}

function PlayerSection({ title, emptyText, headers, rows }: { title: string; emptyText: string; headers: string[]; rows: string[][] }) {
  return (
    <section className="rounded-md border border-border">
      <div className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-bold">{title}</div>
      {rows.length ? (
        <div className="overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>{headers.map((header) => <th key={header} className="border-b px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">{header}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="hover:bg-muted/30">
                  {row.map((cell, cellIndex) => <td key={cellIndex} className="border-b px-3 py-2 align-top">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 text-sm text-muted-foreground">{emptyText}</div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-semibold">{value}</div>
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
