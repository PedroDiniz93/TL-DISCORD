export type Locale = "pt-BR" | "en-US";

export function normalizeLocale(value: string | null | undefined): Locale {
  return String(value || "").toLowerCase().startsWith("en") ? "en-US" : "pt-BR";
}

export function tr(locale: string | null | undefined, ptBr: string, enUs: string) {
  return normalizeLocale(locale) === "en-US" ? enUs : ptBr;
}

export const WEB_LOCALE_COOKIE = "tlgm_web_locale";
