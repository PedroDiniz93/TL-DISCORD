"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { ensureGuild } from "@/lib/data";

export async function saveSettings(guildId: string, formData: FormData) {
  const guild = await ensureGuild(guildId);
  const adminRoleIds = formData.getAll("adminRoleIds").map(String).filter(Boolean);
  await query(
    `UPDATE guild_settings
     SET allowed_channel_id = $2,
         admin_role_id = $3,
         rules = jsonb_set(COALESCE(rules, '{}'::jsonb), '{adminRoleIds}', $4::jsonb, true),
         updated_at = now()
     WHERE guild_id = $1`,
    [
      guild.id,
      String(formData.get("allowedChannelId") || ""),
      adminRoleIds[0] || "",
      JSON.stringify(adminRoleIds),
    ]
  );
  revalidatePath(`/guild/${guildId}`);
  redirect(`/guild/${guildId}`);
}

export async function saveCategory(guildId: string, formData: FormData) {
  const guild = await ensureGuild(guildId);
  const id = Number(formData.get("id") || 0);
  const values = [
    guild.id,
    String(formData.get("type") || "rare"),
    slugify(String(formData.get("key") || formData.get("name") || "")),
    String(formData.get("name") || "").trim(),
    Number(formData.get("limitPerUser") || 0),
    Number(formData.get("sortOrder") || 0),
    formData.get("active") === "on",
  ];
  if (id) {
    await query(
      `UPDATE item_categories
       SET type = $2, key = $3, name = $4, limit_per_user = $5, sort_order = $6, active = $7, updated_at = now()
       WHERE guild_id = $1 AND id = $8`,
      [...values, id]
    );
  } else {
    await query(
      `INSERT INTO item_categories (guild_id, type, key, name, limit_per_user, sort_order, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (guild_id, key)
       DO UPDATE SET type = EXCLUDED.type, name = EXCLUDED.name, limit_per_user = EXCLUDED.limit_per_user,
                     sort_order = EXCLUDED.sort_order, active = EXCLUDED.active, updated_at = now()`,
      values
    );
  }
  revalidatePath(`/guild/${guildId}`);
  redirect(`/guild/${guildId}`);
}

export async function saveItem(guildId: string, formData: FormData) {
  const guild = await ensureGuild(guildId);
  const id = Number(formData.get("id") || 0);
  const aliases = String(formData.get("aliases") || "")
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
  const values = [
    guild.id,
    Number(formData.get("categoryId") || 0) || null,
    String(formData.get("type") || "rare"),
    String(formData.get("name") || "").trim(),
    String(formData.get("namePt") || "").trim(),
    String(formData.get("nameEn") || "").trim(),
    aliases,
    String(formData.get("imageUrl") || "").trim(),
    formData.get("active") === "on",
    Number(formData.get("sortOrder") || 0),
  ];
  if (id) {
    await query(
      `UPDATE guild_items
       SET category_id = $2, type = $3, name = $4, name_pt = $5, name_en = $6,
           aliases = $7, image_url = $8, active = $9, sort_order = $10, updated_at = now()
       WHERE guild_id = $1 AND id = $11`,
      [...values, id]
    );
  } else {
    await query(
      `INSERT INTO guild_items (guild_id, category_id, type, name, name_pt, name_en, aliases, image_url, active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (guild_id, type, name)
       DO UPDATE SET category_id = EXCLUDED.category_id, name_pt = EXCLUDED.name_pt, name_en = EXCLUDED.name_en,
                     aliases = EXCLUDED.aliases, image_url = EXCLUDED.image_url, active = EXCLUDED.active,
                     sort_order = EXCLUDED.sort_order, updated_at = now()`,
      values
    );
  }
  revalidatePath(`/guild/${guildId}`);
  redirect(`/guild/${guildId}`);
}

export async function deleteCategory(guildId: string, formData: FormData) {
  const guild = await ensureGuild(guildId);
  await query("DELETE FROM item_categories WHERE guild_id = $1 AND id = $2", [guild.id, Number(formData.get("id"))]);
  revalidatePath(`/guild/${guildId}`);
  redirect(`/guild/${guildId}`);
}

export async function deleteItem(guildId: string, formData: FormData) {
  const guild = await ensureGuild(guildId);
  await query("DELETE FROM guild_items WHERE guild_id = $1 AND id = $2", [guild.id, Number(formData.get("id"))]);
  revalidatePath(`/guild/${guildId}`);
  redirect(`/guild/${guildId}`);
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() || "categoria";
}
