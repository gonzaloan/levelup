// Page metadata in one shape: title, description, canonical + language alternates, and the
// Open Graph / Twitter tags that make a shared link show a preview. A child page's `openGraph`
// replaces the parent's whole object in Next, so every page builds its own through this helper.
import type { Metadata } from "next";
import type { Locale } from "./types";

export const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: "levelup — Staff Engineer & AI Architect Field Guide" };

export function pageMeta(locale: Locale, path: string, title: string, description?: string, opts: { absolute?: boolean; article?: boolean; noindex?: boolean } = {}): Metadata {
  const url = `/${locale}${path}`;
  return {
    title: opts.absolute ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages: { en: `/en${path}`, es: `/es${path}` } },
    openGraph: { title, description, url, siteName: "levelup", locale: locale === "es" ? "es_419" : "en_US", type: opts.article ? "article" : "website", images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
    ...(opts.noindex ? { robots: { index: false } } : {}),
  };
}
