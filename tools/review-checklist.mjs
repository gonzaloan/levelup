#!/usr/bin/env node
// A checklist for a human expert's review (docs/review/checklist.md): every concept, core level
// first, grouped by topic, with the facts to check (its "numbers"), its sources and four boxes.
// The figures were verified when authored, but nobody with Staff experience has read them all:
// this makes that pass fast and trackable (tick boxes in the file, commit it).
// Usage: node tools/review-checklist.mjs [--level core]   (default: all levels)
import fs from "node:fs";
import path from "node:path";
import { loadDomains, conceptPath, ROOT } from "./content-lib.mjs";

const lvlArg = (() => { const i = process.argv.indexOf("--level"); return i > 0 ? process.argv[i + 1] : null; })();
const ORDER = { core: 0, advanced: 1, staff: 2 };
const site = "https://levelup.skillrealm.dev/es/c";
const out = ["# Revisión humana del contenido", "",
  "Para un revisor con experiencia Staff / AI Architect. Por concepto: lee la página (link), revisa",
  "las cifras listadas contra sus fuentes y marca las casillas. Si algo está mal, anota la corrección",
  "debajo del concepto: se corrige en `content/concepts/<tema>/<id>.json` (en ES y EN).", "",
  "Casillas: **[R]** resumen y puntos clave correctos · **[C]** cifras verificadas · **[F]** fuentes",
  "vigentes · **[E]** español natural.", "",
  "Generado con `node tools/review-checklist.mjs`" + (lvlArg ? ` --level ${lvlArg}` : "") + ". Prioridad: nivel `core` primero.", ""];
let total = 0;
for (const d of loadDomains()) {
  const cs = d.concepts.map((id) => { try { return JSON.parse(fs.readFileSync(conceptPath(d.id, id), "utf8")); } catch { return null; } })
    .filter((c) => c && (!lvlArg || c.level === lvlArg))
    .sort((a, b) => ORDER[a.level] - ORDER[b.level]);
  if (!cs.length) continue;
  out.push(`## ${d.title.es} (${cs.length})`, "");
  for (const c of cs) {
    total++;
    out.push(`### [ ] ${c.title.es} — \`${c.level}\``, `[Ver página](${site}/${c.id}/) · \`content/concepts/${d.id}/${c.id}.json\``, "",
      "- [ ] R  - [ ] C  - [ ] F  - [ ] E");
    for (const n of c.numbers ?? []) out.push(`- ${n.es.replace(/\n/g, " ")}`);
    if (c.sources?.length) out.push(`- Fuentes: ${c.sources.map((s) => `[${s.title}](${s.url})`).join(" · ")}`);
    out.push("");
  }
}
const file = path.join(ROOT, "docs", "review", "checklist.md");
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, out.join("\n"));
console.log(`review checklist: ${total} concepts → ${path.relative(ROOT, file)}`);
