#!/usr/bin/env node
// Pre-render every concept's Mermaid diagram to static SVG (dark + light), so the site ships
// zero diagram JavaScript. Output: content/diagrams/<id>.<dark|light>.svg, each starting with a
// hash comment of its source; unchanged diagrams are skipped. Usage: npm run diagrams [-- --force]
import fs from "node:fs";
import path from "node:path";
import { listConceptFiles, launchBrowser, diagramHash, readDiagramHash, DIAGRAMS, ROOT } from "./content-lib.mjs";

const force = process.argv.includes("--force");
// --only a,b re-renders just those concepts (for previewing a style change).
const only = (() => { const i = process.argv.indexOf("--only"); return i > 0 ? new Set(process.argv[i + 1].split(",")) : null; })();
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

// Style v2: every node gets a "kind" from its label (and shape): who/what it is — a user, a model,
// a store, a cache, a queue… The kind becomes a class (colored by globals.css, theme-aware) and a
// small emoji sticker on the node's corner, so each diagram reads at a glance and none look alike.
// Most specific first: an "Authenticated session" is security before it is a user, and a "Human
// agent" is a person before it is a model.
const KINDS = [
  ["user", "technologist", "\\b(humans?|people|person|reviewers?|operators?|on-?call|engineers?|analysts?)\\b"],
  ["security", "shield", "\\b(auth\\w*|tokens?|permissions?|guard\\w*|polic(y|ies)|secrets?|keys?|encrypt\\w*|tls|firewall|sandbox\\w*|allow\\w*|deny|redact\\w*|pii|injection|attack\\w*|rbac|acl)\\b"],
  ["model", "robot", "\\b(llms?|models?|gpt|claude|gemini|agents?|planner|embed\\w*|encoder|decoder|transformer|rerankers?|cross-encoder|judge|classifier|generator|tokeni[sz]er|lora|fine-?tun\\w*|slm|vlm)\\b"],
  ["cache", "high-voltage", "\\b(cache[sd]?|caching|redis|memcached|cdn|lru|edge|kv cache|hot)\\b"],
  ["queue", "incoming-envelope", "\\b(queues?|kafka|streams?|topics?|pub/?sub|sqs|kinesis|events?|outbox|logs?|broker|bus|wal)\\b"],
  ["search", "magnifying-glass-tilted-left", "\\b(rag|search|retriev\\w*|bm25|vectors?|ann|hnsw|index\\w*|rank\\w*|query|queries|lookup|top-?k|similarity)\\b"],
  ["store", "file-cabinet", "\\b(db|dbs|database\\w*|stores?|storage|tables?|postgres\\w*|mysql|dynamo\\w*|cassandra|kv|s3|buckets?|warehouse|lake|ledger|replicas?|shards?|disk|ssd|blob|objects?|snapshot)\\b"],
  ["result", "check-mark-button", "\\b(answers?|responses?|results?|outputs?|return\\w*|done|success|ok|200|302|ack|commit\\w*|reply|replies|final)\\b"],
  ["user", "technologist", "\\b(users?|clients?|browsers?|caller|customers?|humans?|person|reviewers?|riders?|drivers?|players?|viewers?|readers?|you|your code|mobile|app|frontend|ui)\\b"],
  ["money", "money-bag", "\\b(pay\\w*|wallet|billing|costs?|price\\w*|money|cards?|charge\\w*|refunds?|budget)\\b"],
  ["time", "stopwatch", "\\b(cron|timers?|schedul\\w*|retry|retries|backoff|timeouts?|ttl|clock|deadline|wait\\w*|delay\\w*)\\b"],
  ["service", "gear", "\\b(api|apis|services?|servers?|gateway|load balancer|lb|proxy|router|endpoint|workers?|backend|scheduler|orchestrator|coordinator|leader|followers?|nodes?|pods?|gpus?|cpu)\\b"],
  ["metrics", "bar-chart", "\\b(evals?|evaluat\\w*|metrics?|monitor\\w*|alerts?|dashboards?|tests?|scores?|latency|slos?|traces?|tracing|observab\\w*|grader|benchmark\\w*)\\b"],
  ["doc", "page-facing-up", "\\b(docs?|documents?|chunks?|pdfs?|files?|text|prompts?|context|pages?|records?|messages?|emails?|dataset|samples?|examples?|html|json|schema)\\b"],
];
const emojiSet = JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules/@iconify-json/fluent-emoji-flat/icons.json"), "utf8"));
const STICKERS = Object.fromEntries([...KINDS.map(([k, e]) => [k, e]), ["decision", "red-question-mark"]].map(([k, e]) => [k, emojiSet.icons[e].body]));

fs.mkdirSync(DIAGRAMS, { recursive: true });
const jobs = [];
const graphJobs = [];
const wanted = new Set();
for (const f of listConceptFiles()) {
  const c = JSON.parse(fs.readFileSync(f, "utf8"));
  if (!c.diagram?.code) continue;
  if (only && !only.has(c.id)) { for (const m of ["dark", "light"]) wanted.add(`${c.id}.${m}.svg`); wanted.add(`${c.id}.graph.json`); continue; }
  const h = diagramHash(c.diagram.code);
  for (const mode of ["dark", "light"]) {
    const out = path.join(DIAGRAMS, `${c.id}.${mode}.svg`);
    wanted.add(path.basename(out));
    if (force || readDiagramHash(out) !== h) jobs.push({ id: c.id, mode, code: c.diagram.code, out, h });
  }
  // The node/edge graph powers the "rebuild the diagram" exercise (flowcharts only).
  if (/^\s*(flowchart|graph)\b/.test(c.diagram.code)) {
    const gout = path.join(DIAGRAMS, `${c.id}.graph.json`);
    wanted.add(path.basename(gout));
    let gh = null;
    try { gh = JSON.parse(fs.readFileSync(gout, "utf8")).h; } catch { /* missing */ }
    if (force || gh !== h) graphJobs.push({ id: c.id, code: c.diagram.code, out: gout, h });
  }
}
for (const f of fs.readdirSync(DIAGRAMS)) if ((f.endsWith(".svg") || f.endsWith(".graph.json")) && !wanted.has(f)) { fs.unlinkSync(path.join(DIAGRAMS, f)); console.log("removed orphan", f); }
if (!jobs.length && !graphJobs.length) { console.log("diagrams: all up to date"); process.exit(0); }

const browser = await launchBrowser();
const page = await browser.newPage();
await page.setContent(`<html><body style="font-family:${FONT}"></body></html>`);
await page.addScriptTag({ path: path.join(ROOT, "node_modules/mermaid/dist/mermaid.min.js") });
let failed = 0;
for (const j of jobs) {
  const res = await page.evaluate(async ({ id, mode, code, theme, kinds, stickers }) => {
    try {
      mermaid.initialize({
        startOnLoad: false, theme: "base", themeVariables: theme, securityLevel: "strict",
        flowchart: { htmlLabels: false, padding: 14, nodeSpacing: 40, rankSpacing: 46, curve: "basis" },
        sequence: { useMaxWidth: true, mirrorActors: false, actorMargin: 40 },
      });
      const { svg } = await mermaid.render(`dg-${id}-${mode}`, code);
      const host = document.createElement("div");
      host.style.cssText = "position:absolute;left:-99999px;top:0";
      host.innerHTML = svg;
      document.body.appendChild(host);
      const root = host.querySelector("svg");
      const NS = "http://www.w3.org/2000/svg";
      const kindOf = (label, shape) => {
        for (const [k, , re] of kinds) if (new RegExp(re, "i").test(label)) return k;
        if (shape === "polygon" || /\?\s*$/.test(label)) return "decision";
        if (shape === "path") return "store"; // cylinders
        return null;
      };
      let n = 0;
      const sticker = (target, kind, x, y) => {
        const pre = `${id}-${mode}-s${n++}-`;
        const g = document.createElementNS(NS, "g");
        g.setAttribute("class", "dg-sticker");
        g.setAttribute("transform", `translate(${x.toFixed(1)}, ${y.toFixed(1)})`);
        const body = stickers[kind].replace(/id="([^"]+)"/g, `id="${pre}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${pre}$1)`).replace(/href="#([^"]+)"/g, `href="#${pre}$1"`);
        g.innerHTML = `<circle r="14" cx="0" cy="0"></circle><svg x="-10" y="-10" width="20" height="20" viewBox="0 0 32 32">${body}</svg>`;
        // Mermaid's own CSS paints every ".node path" with the node colors; inline styles keep
        // the emoji's real colors (a style attribute beats a stylesheet rule without !important).
        for (const el of g.querySelectorAll("svg *")) {
          const f = el.getAttribute("fill"), st = el.getAttribute("stroke");
          if (["stop", "linearGradient", "radialGradient", "defs"].includes(el.tagName)) continue;
          el.setAttribute("style", `fill:${f ?? "inherit"};stroke:${st ?? "none"}`);
        }
        target.appendChild(g);
      };
      // Flowchart nodes: kind from the label (and shape), rounded corners, a sticker top-left.
      for (const node of root.querySelectorAll("g.node")) {
        const shapeEl = node.querySelector("rect, polygon, path, circle, ellipse");
        if (!shapeEl) continue;
        // Multi-line labels are separate text nodes (<tspan>s, or <br> in an HTML label): join them
        // with spaces, or "gateway<br>schema" reads as one word.
        const parts = [];
        const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        for (let t = walk.nextNode(); t; t = walk.nextNode()) parts.push(t.data);
        const label = parts.join(" ").replace(/\s+/g, " ").trim();
        const kind = kindOf(label, shapeEl.tagName);
        for (const r of node.querySelectorAll("rect.label-container, rect.basic")) { r.setAttribute("rx", "10"); r.setAttribute("ry", "10"); }
        if (!kind) continue;
        node.classList.add("dg-k", `k-${kind}`);
        // The node's own box (children's transforms included): cylinders draw their path offset.
        const b = node.getBBox();
        // A diamond's box corner is empty space: put its sticker on the left vertex instead.
        if (shapeEl.tagName === "polygon") sticker(node, kind, b.x + 2, b.y + b.height / 2);
        else sticker(node, kind, b.x + 3, b.y + 2);
      }
      // Sequence diagram actors: the same, on the top box.
      for (const rect of root.querySelectorAll("rect.actor")) {
        const g = rect.parentNode;
        const label = (g.querySelector("text")?.textContent ?? "").replace(/\s+/g, " ").trim();
        const kind = kindOf(label, "rect");
        rect.setAttribute("rx", "10"); rect.setAttribute("ry", "10");
        if (!kind) continue;
        g.classList.add("dg-k", `k-${kind}`);
        const x = Number(rect.getAttribute("x")), y = Number(rect.getAttribute("y"));
        if (y < 40) sticker(g, kind, x + 2, y + 1);
      }
      for (const r of root.querySelectorAll("g.edgeLabel rect, .labelBkg")) { r.setAttribute("rx", "7"); r.setAttribute("ry", "7"); }
      root.classList.add("dg-v2");
      const out = root.outerHTML;
      host.remove();
      return { svg: out };
    } catch (e) { return { error: String(e.message || e) }; }
  }, { id: j.id, mode: j.mode, code: j.code, theme: THEMES[j.mode], kinds: KINDS, stickers: STICKERS });
  if (res.error) { failed++; console.log(`✗ ${j.id} (${j.mode}): ${res.error.split("\n").slice(0, 3).join(" | ")}`); continue; }
  // Mermaid renders a label like "1. ok" as the literal text "Unsupported markdown: list".
  if (/Unsupported markdown/.test(res.svg)) { failed++; console.log(`✗ ${j.id} (${j.mode}): a label was parsed as markdown (e.g. "1. x") — reword it`); continue; }
  const svg = res.svg.replace(/<svg /, `<svg aria-hidden="true" focusable="false" `);
  fs.writeFileSync(j.out, `<!-- h:${j.h} -->\n${svg}\n`);
}
for (const g of graphJobs) {
  const res = await page.evaluate(async (code) => {
    try {
      mermaid.initialize({ startOnLoad: false });
      const d = await mermaid.mermaidAPI.getDiagramFromText(code);
      const v = d.db.getVertices();
      const nodes = [...(v instanceof Map ? v.values() : Object.values(v))].map((n) => ({ id: n.id, label: String(n.text ?? n.id) }));
      const edges = d.db.getEdges().map((e) => ({ from: e.start, to: e.end }));
      return { nodes, edges };
    } catch (e) { return { error: String(e.message || e) }; }
  }, g.code);
  if (res.error) { failed++; console.log(`✗ ${g.id} (graph): ${res.error.split("\n")[0]}`); continue; }
  const clean = (s) => s.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/gi, " ").replace(/^["']|["']$/g, "").replace(/\s+/g, " ").trim();
  fs.writeFileSync(g.out, JSON.stringify({ h: g.h, nodes: res.nodes.map((n) => ({ id: n.id, label: clean(n.label) })), edges: res.edges }) + "\n");
}
await browser.close();
if (graphJobs.length) console.log(`graphs: extracted ${graphJobs.length}`);
console.log(`diagrams: rendered ${jobs.length - failed}/${jobs.length}${failed ? `, ${failed} failed` : ""}`);
process.exit(failed ? 1 : 0);
