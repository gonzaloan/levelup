"use client";
// Sets <html lang> to match the active locale. The root <html> lives above the
// [locale] segment (static export), so we set it client-side from the locale —
// cheap, correct for a11y/SEO, and it updates when the locale route changes.
import { useEffect } from "react";
import type { Locale } from "@/i18n/config";

export function HtmlLang({ locale }: { locale: Locale }) {
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return null;
}
