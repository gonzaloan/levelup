// The Gym result as an image (1200×630, the size link previews use): drawn on a canvas in the
// browser, then shared as a file (phones) or downloaded. Same facts as the text share: day number,
// score, time, one square per rep, streak — never the answers. Layout is pure and tested; the
// drawing takes any 2D context.
import { clock, gymNumber, type Challenge } from "./share";

export const CARD = { w: 1200, h: 630 } as const;
const COLORS = { ok: "#4ade80", mid: "#fbbf24", bad: "#f87171" };
export const squareColor = (s: number) => (s >= 1 ? COLORS.ok : s > 0 ? COLORS.mid : COLORS.bad);

/** Square size and positions for n reps, centered, wrapping after 10. */
export function squaresLayout(n: number) {
  const perRow = Math.min(Math.max(n, 1), 10), size = 72, gap = 16;
  const rowW = perRow * size + (perRow - 1) * gap;
  const x0 = (CARD.w - rowW) / 2, y0 = 300;
  return Array.from({ length: n }, (_, i) => ({ x: x0 + (i % perRow) * (size + gap), y: y0 + Math.floor(i / perRow) * (size + gap), size }));
}

export function drawCard(ctx: CanvasRenderingContext2D, c: Challenge, scores: number[], streak: number, host: string, locale: "en" | "es") {
  const es = locale === "es";
  const g = ctx.createLinearGradient(0, 0, CARD.w, CARD.h);
  g.addColorStop(0, "#0b0f17"); g.addColorStop(1, "#1a1408");
  ctx.fillStyle = g; ctx.fillRect(0, 0, CARD.w, CARD.h);
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffb547"; ctx.font = "700 34px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText(`levelup Gym #${gymNumber(c.date)}`, CARD.w / 2, 96);
  ctx.fillStyle = "#e8eaf0"; ctx.font = "800 120px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText(`${c.pct}%`, CARD.w / 2, 228);
  ctx.fillStyle = "#b9c0ce"; ctx.font = "500 30px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText(`${clock(c.secs)}${streak > 1 ? `  ·  🔥 ${streak} ${es ? "días seguidos" : "days in a row"}` : ""}`, CARD.w / 2, 272);
  for (const [i, p] of squaresLayout(scores.length).entries()) {
    ctx.fillStyle = squareColor(scores[i]);
    ctx.beginPath(); ctx.roundRect(p.x, p.y, p.size, p.size, 14); ctx.fill();
  }
  ctx.fillStyle = "#8b94a7"; ctx.font = "500 26px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText(es ? "Sin IA, sin calculadora · ¿me ganas?" : "No AI, no calculator · can you beat it?", CARD.w / 2, 520);
  ctx.fillStyle = "#e8eaf0"; ctx.font = "600 28px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText(host, CARD.w / 2, 572);
}

/** The card as a PNG blob, or null where canvas isn't available. */
export async function cardBlob(c: Challenge, scores: number[], streak: number, host: string, locale: "en" | "es"): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD.w; canvas.height = CARD.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  drawCard(ctx, c, scores, streak, host, locale);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}
