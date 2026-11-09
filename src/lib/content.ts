// Server-only: reads the content-as-data at build time. Never import from a client component.
import fs from "node:fs";
import path from "node:path";
import type { Concept, Domain, I18n } from "./types";

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");

let cache: { domains: Domain[]; concepts: Map<string, Concept> } | null = null;

function load() {
  if (cache) return cache;
  const raw: Domain[] = JSON.parse(fs.readFileSync(path.join(CONTENT, "domains.json"), "utf8"));
  const concepts = new Map<string, Concept>();
  for (const d of raw) {
    for (const id of d.concepts) {
      const f = path.join(CONTENT, "concepts", d.id, `${id}.json`);
      if (fs.existsSync(f)) concepts.set(id, JSON.parse(fs.readFileSync(f, "utf8")));
    }
  }
  // Only list concepts that exist (lets `npm run dev` work while content is being authored).
  const domains = raw.map((d) => ({ ...d, concepts: d.concepts.filter((id) => concepts.has(id)) }));
  cache = { domains, concepts };
  return cache;
}

export const getDomains = () => load().domains;
export const getDomain = (id: string) => load().domains.find((d) => d.id === id);
export const getConcept = (id: string) => load().concepts.get(id);
export const allConcepts = () => load().domains.flatMap((d) => d.concepts.map((id) => load().concepts.get(id)!));
export const conceptsOf = (domainId: string) => (getDomain(domainId)?.concepts ?? []).map((id) => getConcept(id)!);
export const titleOf = (id: string) => getConcept(id)?.title;

/** Pre-rendered diagram SVGs (see tools/render-diagrams.mjs). */
export function getDiagram(id: string): { dark: string; light: string } | null {
  const read = (mode: string) => {
    const f = path.join(CONTENT, "diagrams", `${id}.${mode}.svg`);
    return fs.existsSync(f) ? fs.readFileSync(f, "utf8").replace(/^<!--[^>]*-->\n/, "") : null;
  };
  const dark = read("dark"), light = read("light");
  return dark && light ? { dark, light } : null;
}

/** Domain position in the syllabus (0-based); drives its hue. */
export const domainIndex = (id: string) => load().domains.findIndex((d) => d.id === id);
export const domainCount = () => load().domains.length;

export interface MapGroup { id: string; title: I18n; note?: I18n; items: string[] }
export interface ArchitectureMap { title: I18n; subtitle: I18n; hub: string; layers: MapGroup[]; crosscutting: MapGroup[] }

/** The clickable reference-architecture map (content/architecture-map.json); unknown ids are dropped. */
export function getArchitectureMap(): ArchitectureMap {
  const m: ArchitectureMap = JSON.parse(fs.readFileSync(path.join(CONTENT, "architecture-map.json"), "utf8"));
  const keep = (g: MapGroup) => ({ ...g, items: g.items.filter((id) => load().concepts.has(id)) });
  return { ...m, layers: m.layers.map(keep), crosscutting: m.crosscutting.map(keep) };
}

export function neighbors(id: string) {
  const c = getConcept(id);
  if (!c) return { prev: undefined, next: undefined };
  const list = getDomain(c.domain)!.concepts;
  const i = list.indexOf(id);
  return { prev: list[i - 1] ? getConcept(list[i - 1]) : undefined, next: list[i + 1] ? getConcept(list[i + 1]) : undefined };
}

export interface PathModule { id: string; title: I18n; concepts: string[] }
export interface PathPhase { id: string; title: I18n; goal: I18n; modules: PathModule[] }

/** The study path (content/path.json): every concept exactly once, in learning order. */
export function getPath(): PathPhase[] {
  const p = JSON.parse(fs.readFileSync(path.join(CONTENT, "path.json"), "utf8")) as { phases: PathPhase[] };
  return p.phases.map((ph) => ({ ...ph, modules: ph.modules.map((m) => ({ ...m, concepts: m.concepts.filter((id) => load().concepts.has(id)) })) }));
}
