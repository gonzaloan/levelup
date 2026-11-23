// Coding practice state in this browser: which problems are solved and the drafts in progress.
const KEY = "fg.code.v1";
export interface CodeSaved { solved: Record<string, number>; drafts: Record<string, string> }

export function loadCode(): CodeSaved {
  try { const s = JSON.parse(localStorage.getItem(KEY) ?? "null"); if (s?.solved) return { solved: s.solved, drafts: s.drafts ?? {} }; } catch { /* ignore */ }
  return { solved: {}, drafts: {} };
}
export function saveCode(s: CodeSaved) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }
