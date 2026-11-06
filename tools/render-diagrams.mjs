#!/usr/bin/env node
// Pre-render every concept's Mermaid diagram to static SVG (dark + light), so the site ships
// zero diagram JavaScript. Output: content/diagrams/<id>.<dark|light>.svg, each starting with a
// hash comment of its source; unchanged diagrams are skipped. Usage: npm run diagrams [-- --force]
import fs from "node:fs";
import path from "node:path";
import { listConceptFiles, launchBrowser, diagramHash, readDiagramHash, DIAGRAMS, ROOT } from "./content-lib.mjs";

const force = process.argv.includes("--force");
const FONT = "Arial, Helvetica, 'Liberation Sans', sans-serif";
const THEMES = {
  dark: {
    background: "transparent", fontFamily: FONT, fontSize: "14px",
    primaryColor: "#1a2030", primaryTextColor: "#e7e9ef", primaryBorderColor: "#4a5470",
    secondaryColor: "#20283b", secondaryTextColor: "#e7e9ef", secondaryBorderColor: "#4a5470",
    tertiaryColor: "#151a27", tertiaryTextColor: "#e7e9ef", tertiaryBorderColor: "#3a4258",
    lineColor: "#8a93a8", textColor: "#e7e9ef", mainBkg: "#1a2030", nodeBorder: "#4a5470",
    clusterBkg: "#141925", clusterBorder: "#38405a", titleColor: "#e7e9ef",
    edgeLabelBackground: "#10141d", nodeTextColor: "#e7e9ef",
    actorBkg: "#1a2030", actorBorder: "#4a5470", actorTextColor: "#e7e9ef", actorLineColor: "#5b6480",
    signalColor: "#c4cad8", signalTextColor: "#e7e9ef", labelBoxBkgColor: "#1a2030", labelBoxBorderColor: "#4a5470",
    labelTextColor: "#e7e9ef", loopTextColor: "#e7e9ef", noteBkgColor: "#2b2a1c", noteTextColor: "#f1e6b8", noteBorderColor: "#6d6538",
    activationBkgColor: "#283149", activationBorderColor: "#5b6480", sequenceNumberColor: "#10141d",
  },
  light: {
    background: "transparent", fontFamily: FONT, fontSize: "14px",
    primaryColor: "#eef1f7", primaryTextColor: "#1b1f29", primaryBorderColor: "#9aa3b8",
    secondaryColor: "#f5f6fa", secondaryTextColor: "#1b1f29", secondaryBorderColor: "#9aa3b8",
    tertiaryColor: "#f8f9fb", tertiaryTextColor: "#1b1f29", tertiaryBorderColor: "#c3c9d6",
    lineColor: "#5f687c", textColor: "#1b1f29", mainBkg: "#eef1f7", nodeBorder: "#9aa3b8",
    clusterBkg: "#f7f8fb", clusterBorder: "#c3c9d6", titleColor: "#1b1f29",
    edgeLabelBackground: "#ffffff", nodeTextColor: "#1b1f29",
    actorBkg: "#eef1f7", actorBorder: "#9aa3b8", actorTextColor: "#1b1f29", actorLineColor: "#9aa3b8",
    signalColor: "#3d4455", signalTextColor: "#1b1f29", labelBoxBkgColor: "#eef1f7", labelBoxBorderColor: "#9aa3b8",
    labelTextColor: "#1b1f29", loopTextColor: "#1b1f29", noteBkgColor: "#fff6d6", noteTextColor: "#4a3f12", noteBorderColor: "#d9c27a",
    activationBkgColor: "#e2e7f1", activationBorderColor: "#9aa3b8", sequenceNumberColor: "#ffffff",
  },
};

fs.mkdirSync(DIAGRAMS, { recursive: true });
const jobs = [];
const wanted = new Set();
for (const f of listConceptFiles()) {
  const c = JSON.parse(fs.readFileSync(f, "utf8"));
  if (!c.diagram?.code) continue;
  const h = diagramHash(c.diagram.code);
  for (const mode of ["dark", "light"]) {
    const out = path.join(DIAGRAMS, `${c.id}.${mode}.svg`);
    wanted.add(path.basename(out));
    if (force || readDiagramHash(out) !== h) jobs.push({ id: c.id, mode, code: c.diagram.code, out, h });
  }
}
for (const f of fs.readdirSync(DIAGRAMS)) if (f.endsWith(".svg") && !wanted.has(f)) { fs.unlinkSync(path.join(DIAGRAMS, f)); console.log("removed orphan", f); }
if (!jobs.length) { console.log("diagrams: all up to date"); process.exit(0); }

const browser = await launchBrowser();
const page = await browser.newPage();
await page.setContent(`<html><body style="font-family:${FONT}"></body></html>`);
await page.addScriptTag({ path: path.join(ROOT, "node_modules/mermaid/dist/mermaid.min.js") });
let failed = 0;
for (const j of jobs) {
  const res = await page.evaluate(async ({ id, mode, code, theme }) => {
    try {
      mermaid.initialize({
        startOnLoad: false, theme: "base", themeVariables: theme, securityLevel: "strict",
        flowchart: { htmlLabels: false, padding: 14, nodeSpacing: 40, rankSpacing: 46, curve: "basis" },
        sequence: { useMaxWidth: true, mirrorActors: false, actorMargin: 40 },
      });
      const { svg } = await mermaid.render(`dg-${id}-${mode}`, code);
      return { svg };
    } catch (e) { return { error: String(e.message || e) }; }
  }, { id: j.id, mode: j.mode, code: j.code, theme: THEMES[j.mode] });
  if (res.error) { failed++; console.log(`✗ ${j.id} (${j.mode}): ${res.error.split("\n").slice(0, 3).join(" | ")}`); continue; }
  // Mermaid renders a label like "1. ok" as the literal text "Unsupported markdown: list".
  if (/Unsupported markdown/.test(res.svg)) { failed++; console.log(`✗ ${j.id} (${j.mode}): a label was parsed as markdown (e.g. "1. x") — reword it`); continue; }
  const svg = res.svg.replace(/<svg /, `<svg aria-hidden="true" focusable="false" `);
  fs.writeFileSync(j.out, `<!-- h:${j.h} -->\n${svg}\n`);
}
await browser.close();
console.log(`diagrams: rendered ${jobs.length - failed}/${jobs.length}${failed ? `, ${failed} failed` : ""}`);
process.exit(failed ? 1 : 0);
