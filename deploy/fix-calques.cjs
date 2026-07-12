#!/usr/bin/env node
// One-shot: replace contract-banned ES calques in content JSON (blocker fix).
// correctitud->corrección, librería->biblioteca, robusto/a->confiable,
// with the statistics idiom "robust to outliers" mapped to the correct ES term.
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "src", "content", "data");
const FILES = ["curriculum.json", "lessons.json", "checks.json", "ai-l5.json", "general-l5.json"];

// Ordered: specific stats idioms first so they win over the generic robusto rule.
const RULES = [
  // "robustez a los (valores) atípicos" -> "resistencia a los valores atípicos"
  [/robustez a los (valores )?atípicos/gi, "resistencia a los valores atípicos"],
  // "robusta/o a los (valores) atípicos" -> "resistente a los valores atípicos"
  [/robust[oa] a los (valores )?atípicos/gi, "resistente a los valores atípicos"],
  // generic robustez -> fiabilidad ; robusto/a -> confiable (preserve capitalization)
  [/Robustez/g, "Fiabilidad"],
  [/robustez/g, "fiabilidad"],
  [/Robusto/g, "Confiable"],
  [/Robusta/g, "Confiable"],
  [/robusto/g, "confiable"],
  [/robusta/g, "confiable"],
  // librería (software) -> biblioteca (preserve capitalization)
  [/Librería/g, "Biblioteca"],
  [/librería/g, "biblioteca"],
  [/Librerías/g, "Bibliotecas"],
  [/librerías/g, "bibliotecas"],
  // correctitud -> corrección (preserve capitalization)
  [/Correctitud/g, "Corrección"],
  [/correctitud/g, "corrección"],
];

let grand = 0;
for (const f of FILES) {
  const p = path.join(DIR, f);
  let s = fs.readFileSync(p, "utf8");
  const before = s;
  let fileCount = 0;
  for (const [re, rep] of RULES) {
    s = s.replace(re, (m) => { fileCount++; return rep; });
  }
  // Validate it is still valid JSON before writing.
  JSON.parse(s);
  if (s !== before) {
    fs.writeFileSync(p, s);
    console.log(`${f}: ${fileCount} replacements`);
    grand += fileCount;
  } else {
    console.log(`${f}: 0`);
  }
}
console.log(`TOTAL: ${grand}`);
