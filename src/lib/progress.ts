// Browser-only progress (localStorage). Every access is guarded: private mode / blocked storage
// must never break the page.
const KEY = "fg.mastered.v1";
const CARDS = "fg.cards.v1";
export const PROGRESS_EVENT = "fg-progress";

function read<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function write(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
  try { window.dispatchEvent(new Event(PROGRESS_EVENT)); } catch { /* ignore */ }
}

export const getMastered = (): Record<string, 1> => read(KEY, {});
export function setMastered(id: string, on: boolean) {
  const m = getMastered();
  if (on) m[id] = 1; else delete m[id];
  write(KEY, m);
}

/** Leitner box per practice card: 0 = new/missed … 4 = solid. */
export const getCards = (): Record<string, number> => read(CARDS, {});
export function gradeCard(key: string, knew: boolean) {
  const c = getCards();
  c[key] = knew ? Math.min(4, (c[key] ?? 0) + 1) : 0;
  write(CARDS, c);
}
export const resetCards = () => write(CARDS, {});
