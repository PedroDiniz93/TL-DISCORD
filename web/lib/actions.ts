"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query, transaction } from "@/lib/db";
import { ensureGuild } from "@/lib/data";
import { sendGuildChannelTest, sendGuildControlPanel } from "@/lib/discord";
import { requireGuildAccess } from "@/lib/guild-access";
import { getItemUploadDir, getItemUploadUrl } from "@/lib/uploads";
import { WEB_LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";

export async function saveSettings(guildId: string, formData: FormData) {
  const guild = await ensureGuild(guildId);
  const adminRoleIds = formData.getAll("adminRoleIds").map(String).filter(Boolean);
  const locale = normalizeLocale(String(formData.get("locale") || "pt-BR"));
  await query(
    `UPDATE guild_settings
     SET allowed_channel_id = $2,
         admin_role_id = $3,
         rules = jsonb_set(COALESCE(rules, '{}'::jsonb), '{adminRoleIds}', $4::jsonb, true),
         locale = $5,
         updated_at = now()
     WHERE guild_id = $1`,
    [
      guild.id,
      String(formData.get("allowedChannelId") || ""),
      adminRoleIds[0] || "",
      JSON.stringify(adminRoleIds),
      locale,
    ]
  );
  const cookieStore = await cookies();
  cookieStore.set(WEB_LOCALE_COOKIE, locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
  revalidatePath(`/guild/${guildId}/settings`);
  redirect(`/guild/${guildId}/settings`);
}

export async function testConfiguredChannel(guildId: string) {
  await requireGuildAccess(guildId);
  const settings = await getActionGuildSettings(guildId);
  if (settings.allowedChannelId) {
    await sendGuildChannelTest(guildId, settings.allowedChannelId);
  }
  revalidatePath(`/guild/${guildId}/settings`);
  redirect(`/guild/${guildId}/settings`);
}

export async function resendControlPanel(guildId: string) {
  await requireGuildAccess(guildId);
  const settings = await getActionGuildSettings(guildId);
  if (settings.allowedChannelId) {
    await sendGuildControlPanel(guildId, settings.allowedChannelId, settings.locale);
  }
  revalidatePath(`/guild/${guildId}/settings`);
  redirect(`/guild/${guildId}/settings`);
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
  revalidatePath(`/guild/${guildId}/catalog`);
  revalidatePath(`/guild/${guildId}/catalog/categories`);
  redirect(`/guild/${guildId}/catalog/categories`);
}

export async function saveItem(guildId: string, formData: FormData) {
  const guild = await ensureGuild(guildId);
  const id = Number(formData.get("id") || 0);
  const uploadedImageUrl = await saveUploadedItemImage(formData.get("imageFile"));
  const imageUrl = uploadedImageUrl || String(formData.get("imageUrl") || "").trim();
  const values = [
    guild.id,
    Number(formData.get("categoryId") || 0) || null,
    String(formData.get("type") || "rare"),
    String(formData.get("name") || "").trim(),
    String(formData.get("namePt") || "").trim(),
    String(formData.get("nameEn") || "").trim(),
    [],
    imageUrl,
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
  revalidatePath(`/guild/${guildId}/catalog`);
  revalidatePath(`/guild/${guildId}/catalog/items`);
  redirect(`/guild/${guildId}/catalog/items`);
}

export async function deleteCategory(guildId: string, formData: FormData) {
  const guild = await ensureGuild(guildId);
  await query("DELETE FROM item_categories WHERE guild_id = $1 AND id = $2", [guild.id, Number(formData.get("id"))]);
  revalidatePath(`/guild/${guildId}/catalog`);
  revalidatePath(`/guild/${guildId}/catalog/categories`);
  redirect(`/guild/${guildId}/catalog/categories`);
}

export async function deleteItem(guildId: string, formData: FormData) {
  const guild = await ensureGuild(guildId);
  await query("DELETE FROM guild_items WHERE guild_id = $1 AND id = $2", [guild.id, Number(formData.get("id"))]);
  revalidatePath(`/guild/${guildId}/catalog`);
  revalidatePath(`/guild/${guildId}/catalog/items`);
  redirect(`/guild/${guildId}/catalog/items`);
}

export async function markQueuePlayerDelivered(guildId: string, formData: FormData) {
  const { session } = await requireGuildAccess(guildId);
  const guild = await ensureGuild(guildId);
  const entryId = Number(formData.get("entryId") || 0);
  if (!entryId) redirect(`/guild/${guildId}/queues`);

  await transaction(async (client) => {
    const removed = await client.query<{
      id: number;
      type: string;
      item_name: string;
      nickname: string;
      discord_user_id: string;
    }>(
      `UPDATE wishlist_entries
       SET deleted_at = now(),
           deleted_by_discord_user_id = $3
       WHERE guild_id = $1
         AND id = $2
         AND deleted_at IS NULL
       RETURNING id, type, item_name, nickname, discord_user_id`,
      [guild.id, entryId, session.user.id]
    );

    const row = removed.rows[0];
    if (!row) return;

    await client.query(
      `INSERT INTO deliveries (
         guild_id,
         wishlist_entry_id,
         type,
         item_name,
         player_name,
         discord_user_id,
         delivered_at_text,
         delivered_by_discord_user_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        guild.id,
        row.id,
        row.type,
        row.item_name,
        row.nickname,
        row.discord_user_id,
        nowBrasilia(),
        session.user.id,
      ]
    );
  });

  revalidatePath(`/guild/${guildId}`);
  revalidatePath(`/guild/${guildId}/queues`);
  revalidatePath(`/guild/${guildId}/history`);
  redirect(`/guild/${guildId}/queues`);
}

export async function removeQueuePlayerRegistration(guildId: string, formData: FormData) {
  const { session } = await requireGuildAccess(guildId);
  const guild = await ensureGuild(guildId);
  const entryId = Number(formData.get("entryId") || 0);
  if (!entryId) redirect(`/guild/${guildId}/queues`);

  await query(
    `UPDATE wishlist_entries
     SET deleted_at = now(),
         deleted_by_discord_user_id = $3
     WHERE guild_id = $1
       AND id = $2
       AND deleted_at IS NULL`,
    [guild.id, entryId, session.user.id]
  );

  revalidatePath(`/guild/${guildId}`);
  revalidatePath(`/guild/${guildId}/queues`);
  redirect(`/guild/${guildId}/queues`);
}

async function saveUploadedItemImage(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) return "";
  if (!value.type.startsWith("image/")) return "";

  const extension = path.extname(value.name).toLowerCase().replace(/[^.\w]/g, "") || ".png";
  const fileName = `${crypto.randomUUID()}${extension}`;
  const uploadDir = getItemUploadDir();
  await mkdir(uploadDir, { recursive: true });
  const bytes = await value.arrayBuffer();
  await writeFile(path.join(uploadDir, fileName), Buffer.from(bytes));
  return getItemUploadUrl(fileName);
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() || "categoria";
}

function nowBrasilia() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

async function getActionGuildSettings(guildId: string) {
  const guild = await ensureGuild(guildId);
  const result = await query<{ allowed_channel_id: string; locale: string }>(
    `SELECT allowed_channel_id, locale FROM guild_settings WHERE guild_id = $1`,
    [guild.id]
  );
  return {
    allowedChannelId: result.rows[0]?.allowed_channel_id || "",
    locale: result.rows[0]?.locale || "pt-BR",
  };
}
