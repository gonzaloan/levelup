// Find Fluent Emoji Flat names for illustrations: node tools/emoji-search.mjs key lock database
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { icons, aliases = {} } = require("@iconify-json/fluent-emoji-flat/icons.json");
const names = [...Object.keys(icons), ...Object.keys(aliases)];
for (const q of process.argv.slice(2)) console.log(`${q}: ${names.filter((n) => n.includes(q.toLowerCase())).slice(0, 40).join(" ") || "(none)"}`);
