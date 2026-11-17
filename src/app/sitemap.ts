import type { MetadataRoute } from "next";
import { allConcepts, getDomains, getLabs } from "@/lib/content";
import { LOCALES } from "@/lib/i18n";

export const dynamic = "force-static";
const ORIGIN = "https://levelup.skillrealm.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "path/", "map/", "cheatsheet/", "interview/", "questions/", "practice/", "labs/", "graph/",
    ...getLabs().map((l) => `labs/${l.id}/`),
    ...getDomains().map((d) => `d/${d.id}/`), ...allConcepts().map((c) => `c/${c.id}/`)];
  return LOCALES.flatMap((l) => paths.map((p) => ({ url: `${ORIGIN}/${l}/${p}` })));
}
