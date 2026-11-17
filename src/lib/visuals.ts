// Server-only: colorful illustrations (Fluent Emoji Flat, MIT) and technology/company logos
// (Iconify "logos", CC0), inlined as static SVG at build time. Zero client JS.
import fs from "node:fs";
import path from "node:path";
import { replaceIDs } from "@iconify/utils";
import type { Concept } from "./types";

type IconSet = { icons: Record<string, { body: string; width?: number; height?: number }>; aliases?: Record<string, { parent: string }>; width?: number; height?: number };
const sets = new Map<string, IconSet>();
function set(prefix: string): IconSet {
  if (!sets.has(prefix)) {
    const pkg = prefix === "fe" ? "@iconify-json/fluent-emoji-flat" : "@iconify-json/logos";
    sets.set(prefix, JSON.parse(fs.readFileSync(path.join(process.cwd(), "node_modules", pkg, "icons.json"), "utf8")));
  }
  return sets.get(prefix)!;
}

export interface Svg { body: string; viewBox: string }
/** "fe:key" (Fluent Emoji Flat) or "logos:redis". Ids are made unique so two icons never clash. */
export function svgOf(ref: string): Svg | null {
  const [prefix, name0] = ref.split(":");
  const s = set(prefix === "logos" ? "logos" : "fe");
  const name = s.icons[name0] ? name0 : s.aliases?.[name0]?.parent;
  const icon = name ? s.icons[name] : undefined;
  if (!icon) return null;
  return { body: replaceIDs(icon.body, `${name}-`), viewBox: `0 0 ${icon.width ?? s.width ?? 16} ${icon.height ?? s.height ?? 16}` };
}

/* ------------------------------------------------------------------ illustrations */
let ill: Record<string, string> | null = null;
const illustrations = () => (ill ??= (() => {
  const f = path.join(process.cwd(), "content", "illustrations.json");
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
})());
/** The concept's illustration (a Fluent emoji), if one is assigned. */
export const illustrationOf = (id: string): Svg | null => (illustrations()[id] ? svgOf(`fe:${illustrations()[id]}`) : null);

/* ------------------------------------------------------------------ stack + real-world logos */
export interface Tech { id: string; kind: "tech" | "company"; name: string; icon: string; match: string[] }
let techs: Tech[] | null = null;
const allTech = (): Tech[] => (techs ??= JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "tech.json"), "utf8")) as Tech[]);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Technologies and companies the concept itself mentions, most-mentioned first. Derived from the
 *  content (no new claims): tools from anything incl. code; companies only from the prose. */
export function stackOf(c: Concept): { tech: Tech[]; companies: Tech[] } {
  const prose = [c.title.en, c.tldr.en, c.explain.en, c.example.en, ...(c.keyPoints ?? []).map((p) => p.en), ...(c.numbers ?? []).map((n) => n.en),
    ...(c.deepDive ?? []).map((d) => d.body.en), ...c.interview.map((q) => q.a.en)].join("\n");
  const all = `${prose}\n${c.aliases.join(" ")}\n${c.code?.source ?? ""}`;
  const count = (t: Tech, text: string) => t.match.reduce((n, m) => n + (text.match(new RegExp(`(?<![\\w-])${esc(m)}(?![\\w-])`, "g"))?.length ?? 0), 0);
  const rank = (kind: Tech["kind"], text: string, max: number) =>
    allTech().filter((t) => t.kind === kind).map((t) => ({ t, n: count(t, text) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, max).map((x) => x.t);
  return { tech: rank("tech", all, 6), companies: rank("company", prose, 4) };
}
