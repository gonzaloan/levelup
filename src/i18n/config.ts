// i18n foundation. Two locales, statically exported. Content-as-data carries
// bilingual strings inline ({en, es}); UI chrome uses the message catalogs.

export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(x: string): x is Locale {
  return (LOCALES as readonly string[]).includes(x);
}

/** A bilingual string as stored in content-as-data. */
export type I18nText = { en: string; es: string };

/** Pick the locale's text, falling back to EN if a translation is missing. */
export function t(text: I18nText | undefined, locale: Locale): string {
  if (!text) return "";
  return text[locale] || text.en || "";
}

export const LOCALE_LABEL: Record<Locale, string> = { en: "EN", es: "ES" };
export const OTHER_LOCALE: Record<Locale, Locale> = { en: "es", es: "en" };
