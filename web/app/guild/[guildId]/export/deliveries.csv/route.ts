import { NextResponse } from "next/server";
import { ensureGuild } from "@/lib/data";
import { query } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await ensureGuild(guildId);
  const result = await query<Record<string, string>>(
    `SELECT type, delivered_at_text, player_name, item_name, discord_user_id
     FROM deliveries
     WHERE guild_id = $1
     ORDER BY created_at ASC, id ASC`,
    [guild.id]
  );
  return csvResponse("deliveries.csv", ["type", "delivered_at_text", "player_name", "item_name", "discord_user_id"], result.rows);
}

function csvResponse(filename: string, headers: string[], rows: Record<string, string>[]) {
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header] || "")).join(",")),
  ].join("\n");
  return new NextResponse(`${csv}\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}

function escapeCsv(value: string) {
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}
