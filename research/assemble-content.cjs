#!/usr/bin/env node
// Wires the fleet-authored content into the app's content-as-data shape:
//  - retrieval: 2 items per module drawn from its primary axis
//  - prerequisites: a light chain by order so the star-chart gates unlock
//  - room / fieldWork: linked by matching axis
// Reads a raw content JSON, writes src/content/data/general-l5.json.
const fs = require("fs");
const path = require("path");

const src = process.argv[2] || path.join(__dirname, "05-content-polished.json");
const outDir = path.join(__dirname, "..", "src", "content", "data");
const out = path.join(outDir, "general-l5.json");

const data = JSON.parse(fs.readFileSync(src, "utf8"));
const items = data.items || [];
const modules = (data.modules || []).slice().sort((a, b) => a.order - b.order);
const rooms = data.rooms || [];
const fieldwork = data.fieldwork || [];

// Group items by axis for retrieval assignment.
const itemsByAxis = {};
for (const it of items) (itemsByAxis[it.axis] ??= []).push(it);
const usedForRetrieval = new Set();

for (let i = 0; i < modules.length; i++) {
  const mod = modules[i];
  mod.track = mod.track || "general";
  mod.level = mod.level || "L5";

  // retrieval: up to 2 unused items from the module's primary axis
  const pool = (itemsByAxis[mod.axis.primary] || []).filter((x) => !usedForRetrieval.has(x.id));
  const chosen = pool.slice(0, 2);
  chosen.forEach((x) => usedForRetrieval.add(x.id));
  mod.retrieval = chosen.map((x) => x.id);

  // prerequisites: chain each module to the previous one (light gate).
  mod.prerequisites = i === 0 ? [] : [modules[i - 1].id];

  // room: a Room whose axes include this module's primary axis.
  const room = rooms.find((r) => (r.axes || []).includes(mod.axis.primary));
  if (room) mod.room = room.id;

  // fieldWork: a Field Work matching this module's primary axis.
  const fw = fieldwork.find((f) => f.axis === mod.axis.primary);
  if (fw) mod.fieldWork = fw.id;
}

// The 30% Gauntlet (axis 3) should be reachable from the delivery module even
// if another axis-3 fieldwork exists; ensure M5 (Reliability) links a room and
// the gauntlet is surfaced on the delivery module.
const m5 = modules.find((m) => m.id === "gen-l5-m5");
if (m5 && fieldwork.find((f) => f.id === "gen-l5-fw-gauntlet")) m5.fieldWork = "gen-l5-fw-gauntlet";
const m6 = modules.find((m) => m.id === "gen-l5-m6");
if (m6 && fieldwork.find((f) => f.id === "gen-l5-fw-rfc")) m6.fieldWork = "gen-l5-fw-rfc";

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(out, JSON.stringify({ items, modules, rooms, fieldwork }, null, 2));

console.log(
  `wired: ${items.length} items, ${modules.length} modules ` +
    `(retrieval assigned: ${modules.filter((m) => m.retrieval.length).length}, ` +
    `rooms linked: ${modules.filter((m) => m.room).length}, ` +
    `fieldwork linked: ${modules.filter((m) => m.fieldWork).length}), ` +
    `${rooms.length} rooms, ${fieldwork.length} fieldwork`
);
