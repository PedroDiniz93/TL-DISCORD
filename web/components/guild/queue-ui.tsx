"use client";

import { useState } from "react";
import { ImagePlus, Users } from "lucide-react";
import type { QueueGroup } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function QueueGrid({ queues }: { queues: QueueGroup[] }) {
  const [selectedQueue, setSelectedQueue] = useState<QueueGroup | null>(null);

  if (!queues.length) {
    return <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">Nenhuma fila ativa encontrada.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {queues.map((queue) => (
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
                  <span className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" />Jogadores</span>
                  <span className="text-2xl font-bold text-primary">{queue.total}</span>
                </button>
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setSelectedQueue(queue)}>
                  Ver fila
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <QueueModal queue={selectedQueue} onClose={() => setSelectedQueue(null)} />
    </div>
  );
}

function QueueModal({ queue, onClose }: { queue: QueueGroup | null; onClose: () => void }) {
  if (!queue) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h3 className="text-lg font-bold">{queue.item_name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{queue.total} jogadores na fila</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
        </div>
        <div className="p-5">
          <div className="overflow-auto rounded-md border border-border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="border-b px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Posicao</th>
                  <th className="border-b px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Jogador</th>
                  <th className="border-b px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Discord ID</th>
                  <th className="border-b px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Registro</th>
                </tr>
              </thead>
              <tbody>
                {queue.players.map((player, index) => (
                  <tr key={player.id} className="hover:bg-muted/30">
                    <td className="border-b px-3 py-2 font-semibold">{index + 1}</td>
                    <td className="border-b px-3 py-2">{player.nickname || "Sem nome"}</td>
                    <td className="border-b px-3 py-2 text-muted-foreground">{player.discordUserId}</td>
                    <td className="border-b px-3 py-2 text-muted-foreground">{player.registeredAtText || formatDate(player.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
