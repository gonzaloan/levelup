// Coding practice state in this browser: which problems are solved, the drafts in progress, and
// when each solved problem comes back to be re-solved from memory (src/lib/practice/resolve.ts).
import type { Reviews } from "./resolve";

const KEY = "fg.code.v1";
export interface CodeSaved { solved: Record<string, number>; drafts: Record<string, string>; reviews: Reviews }

export function loadCode(): CodeSaved {
  try { const s = JSON.parse(localStorage.getItem(KEY) ?? "null"); if (s?.solved) return { solved: s.solved, drafts: s.drafts ?? {}, reviews: s.reviews ?? {} }; } catch { /* ignore */ }
  return { solved: {}, drafts: {}, reviews: {} };
}
export function saveCode(s: CodeSaved) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }
