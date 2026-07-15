import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, Boxes, ClipboardList, LayoutDashboard, ListTree, Package, Settings, Users } from "lucide-react";
import { getGuildSettings } from "@/lib/data";
import { tr } from "@/lib/i18n";

export default async function GuildLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const settings = await getGuildSettings(guildId);
  const locale = settings.locale;
  const links = [
    { href: `/guild/${guildId}`, label: tr(locale, "Visao geral", "Overview"), icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: `/guild/${guildId}/settings`, label: tr(locale, "Configuracao", "Settings"), icon: <Settings className="h-4 w-4" /> },
    { href: `/guild/${guildId}/catalog`, label: tr(locale, "Catalogo", "Catalog"), icon: <Boxes className="h-4 w-4" /> },
  ];
  const catalogLinks = [
    { href: `/guild/${guildId}/catalog/categories`, label: tr(locale, "Categorias", "Categories"), icon: <ListTree className="h-4 w-4" /> },
    { href: `/guild/${guildId}/catalog/items`, label: tr(locale, "Itens", "Items"), icon: <Package className="h-4 w-4" /> },
  ];
  const reportLinks = [
    { href: `/guild/${guildId}/queues`, label: tr(locale, "Filas", "Queues"), icon: <ClipboardList className="h-4 w-4" /> },
    { href: `/guild/${guildId}/players`, label: tr(locale, "Jogadores", "Players"), icon: <Users className="h-4 w-4" /> },
    { href: `/guild/${guildId}/history`, label: tr(locale, "Historico", "History"), icon: <BarChart3 className="h-4 w-4" /> },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[220px_1fr]">
      <aside className="rounded-lg border border-border bg-card p-3 shadow-sm xl:sticky xl:top-24 xl:h-fit">
        <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr(locale, "Areas da guild", "Guild areas")}</div>
        <nav className="grid gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
          <div className="ml-4 grid gap-1 border-l border-border pl-3">
            {catalogLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>
          {reportLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section>{children}</section>
    </div>
  );
}
