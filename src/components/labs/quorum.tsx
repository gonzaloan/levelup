"use client";
// Leaderless quorums: N replicas, a write acknowledged by W of them, a read answered by R. The read
// is drawn as the worst case (the R healthy replicas furthest from the write), so an overlap on
// screen is the R + W > N guarantee at work, not luck. The live cycle plays it as messages: the
// write goes to all N, commits at W acks, the copies outside W are still in flight (the worst
// case), then the read fans out to R replicas and keeps the newest version it hears back.
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type { Locale } from "@/lib/types";
import { Bar, Insight, LabGrid, LabMore, Range, Seg, Stat } from "./ui";
import { useReducedMotion } from "./motion";
import s from "./quorum.module.css";

const LAT = [6, 9, 5, 14, 7, 30, 11]; // ms per replica: illustrative, R6 is the straggler
const STAND_IN_MS = 30; // illustrative: a stand-in sits further along the ring
const CX = 125, CY = 125, RING = 92, RAD = 25; // SVG layout; stand-ins get the right-hand column
type Mode = "strict" | "sloppy";

const T = {
  en: {
    n: "Replicas (N)", w: "Write quorum (W)", r: "Read quorum (R)", wHint: "Acks a write waits for.", rHint: "Replies a read waits for.",
    down: "Fail a replica (or tap it)", mode: "When replicas are down", strict: "Strict quorum", sloppy: "Sloppy quorum + hinted handoff",
    fresh: "Read always sees the last write?", yes: "Yes", no: "No", hinted: "stand-ins in use", blocked: "an operation is unavailable",
    overlap: (k: number) => `worst-case overlap: ${k}`, home: (x: number, n: number) => `home copies + R = ${x} ${x > n ? ">" : "≤"} N = ${n}`,
    writes: "Writes", reads: "Reads", ok: "OK", fail: "Unavailable",
    survive: (k: number) => `tolerates ${k} down`, need: (q: number, up: number) => `need ${q}, ${up} up`, via: (k: number) => `${k} via hinted handoff`,
    wWait: "Write waits", rWait: "Read waits", client: "client", off: "down", hint: "hint",
    lw: "write set (W)", lr: "read set (R)", lo: "overlap", ld: "down", ls: "stand-in",
    aria: (n: number, d: number) => `${n} replicas, ${d} down`,
    formula: "R + W > N ⇒ every read set overlaps the last write set · writes survive N − W replicas down, reads N − R · an operation waits for the slowest replica it needs",
    yesI: (s: string) => `${s}: the read set always shares a replica with the last write, so the read can find the newest version.`,
    yesMore: "Still not linearizable: sloppy quorums, concurrent writers and last-write-wins can return stale or lost data.",
    noI: (s: string) => `${s}: a read can miss the last write entirely.`,
    noMore: "That buys latency and availability; read repair and anti-entropy make the replicas converge later (eventual consistency).",
    sloppyI: (hw: number) => `Hinted handoff kept the write available, but only ${hw} of its W copies landed on home replicas. R + W > N alone is no longer a guarantee.`,
    sloppyMore: "When the down replicas return, a read of R home replicas can miss the write until the hints are handed back.",
    dynamo: " Dynamo's common (N, R, W) is (3, 2, 2): overlap, and one replica down is tolerated for reads and writes.",
    note: "Replica latencies are illustrative. The write is acked by the first W healthy replicas; the read shows the worst case, the R healthy replicas furthest from it. Facts from the replication, consistency models and key-value store concepts (Dynamo, SOSP 2007).",
    play: "Play", pause: "Pause", restart: "Restart", speed: "Speed", live: "Live: one write, then one read",
    acks: "acks", replies: "replies",
    idle: "Every replica holds v1. The client is about to write v2.",
    writing: (n: number, w: number, k: number) => `Write v2 goes to all ${n} replicas; it commits at W = ${w} acks (${k}/${w}). Down replicas drop it.`,
    committed: (w: number) => `Committed at ${w} ack${w === 1 ? "" : "s"}. Worst case: the other copies are still in flight.`,
    wFailed: (k: number, w: number) => `Write unavailable: ${k} of W = ${w} acks. It still landed on ${k} replica${k === 1 ? "" : "s"}.`,
    reading: (r: number, k: number) => `Read asks R = ${r} replica${r === 1 ? "" : "s"}, the furthest from the write (${k}/${r} replies); the newest version wins.`,
    gotOverlap: (names: string, k: number) => `Read returned v2: ${names} ${k === 1 ? "is" : "are"} in both the write set and the read set. That overlap is what R + W > N guarantees.`,
    gotHint: "Read returned v2, but only from a stand-in's hint: once the down replicas return, a read of R home replicas can miss it.",
    gotPartial: "Read returned v2 although the write failed: a write that reached only some replicas can be seen by one reader and missed by the next.",
    stale: (sum: boolean) => `Read returned v1 (stale): no replica it asked has the write yet${sum ? ", and with R + W ≤ N nothing forces an overlap" : ""}.`,
    rFailed: (k: number, r: number) => `Read unavailable: ${k} of R = ${r} replies.`,
    converge: "Later the remaining replicas catch up (read repair, anti-entropy).",
    lm: "write v2 / ack", lread: "read / reply", lstale: "stale reply (v1)", llate: "copy still in flight",
    anim: " Animation: writes go to all N and the coordinator waits for W acks; the worst case is drawn, so the copies outside the write set arrive only after the read. Its timing is illustrative.",
  },
  es: {
    n: "Réplicas (N)", w: "Quórum de escritura (W)", r: "Quórum de lectura (R)", wHint: "Acks que espera una escritura.", rHint: "Respuestas que espera una lectura.",
    down: "Haz caer una réplica (o tócala)", mode: "Con réplicas caídas", strict: "Quórum estricto", sloppy: "Sloppy quorum + hinted handoff",
    fresh: "¿La lectura siempre ve la última escritura?", yes: "Sí", no: "No", hinted: "con suplentes", blocked: "una operación no está disponible",
    overlap: (k: number) => `solapamiento en el peor caso: ${k}`, home: (x: number, n: number) => `copias propias + R = ${x} ${x > n ? ">" : "≤"} N = ${n}`,
    writes: "Escrituras", reads: "Lecturas", ok: "OK", fail: "No disponible",
    survive: (k: number) => `tolera ${k} ${k === 1 ? "caída" : "caídas"}`, need: (q: number, up: number) => `necesita ${q}, hay ${up} activas`, via: (k: number) => `${k} vía hinted handoff`,
    wWait: "Espera escritura", rWait: "Espera lectura", client: "cliente", off: "caída", hint: "hint",
    lw: "escritura (W)", lr: "lectura (R)", lo: "solapamiento", ld: "caída", ls: "suplente",
    aria: (n: number, d: number) => `${n} réplicas, ${d} caídas`,
    formula: "R + W > N ⇒ toda lectura se solapa con la última escritura · las escrituras aguantan N − W réplicas caídas; las lecturas, N − R · cada operación espera a la réplica más lenta que necesita",
    yesI: (s: string) => `${s}: el conjunto de lectura siempre comparte una réplica con la última escritura, así que la lectura puede encontrar la versión más nueva.`,
    yesMore: "Igual no es linealizable: sloppy quorums, escritores concurrentes y last-write-wins pueden devolver datos viejos o perdidos.",
    noI: (s: string) => `${s}: una lectura puede no ver la última escritura.`,
    noMore: "A cambio ganas latencia y disponibilidad; read repair y anti-entropy hacen que las réplicas converjan después (consistencia eventual).",
    sloppyI: (hw: number) => `Hinted handoff mantuvo la escritura disponible, pero solo ${hw} de sus W copias quedaron en réplicas propias. R + W > N por sí solo ya no es garantía.`,
    sloppyMore: "Cuando vuelvan las réplicas caídas, una lectura de R réplicas propias puede no ver la escritura hasta que se devuelvan los hints.",
    dynamo: " El (N, R, W) común de Dynamo es (3, 2, 2): hay solapamiento y tolera una réplica caída en lecturas y escrituras.",
    note: "Las latencias por réplica son ilustrativas. La escritura la confirman las primeras W réplicas sanas; la lectura muestra el peor caso: las R réplicas sanas más lejos de ella. Datos de los conceptos de replicación, modelos de consistencia y key-value store distribuido (Dynamo, SOSP 2007).",
    play: "Reproducir", pause: "Pausar", restart: "Reiniciar", speed: "Velocidad", live: "En vivo: una escritura y luego una lectura",
    acks: "acks", replies: "resp.",
    idle: "Todas las réplicas tienen v1. El cliente va a escribir v2.",
    writing: (n: number, w: number, k: number) => `La escritura v2 va a las ${n} réplicas; se confirma con W = ${w} acks (${k}/${w}). Las réplicas caídas la pierden.`,
    committed: (w: number) => `Confirmada con ${w} ack${w === 1 ? "" : "s"}. Peor caso: las demás copias siguen en camino.`,
    wFailed: (k: number, w: number) => `Escritura no disponible: ${k} de W = ${w} acks. Igual quedó en ${k} réplica${k === 1 ? "" : "s"}.`,
    reading: (r: number, k: number) => `La lectura le pregunta a R = ${r} réplica${r === 1 ? "" : "s"}, las más lejanas a la escritura (${k}/${r} respuestas); gana la versión más nueva.`,
    gotOverlap: (names: string, k: number) => `La lectura devolvió v2: ${names} ${k === 1 ? "está" : "están"} en el conjunto de escritura y en el de lectura. Ese solapamiento es lo que garantiza R + W > N.`,
    gotHint: "La lectura devolvió v2, pero solo por el hint de un suplente: cuando vuelvan las réplicas caídas, una lectura de R réplicas propias puede no verla.",
    gotPartial: "La lectura devolvió v2 aunque la escritura falló: una escritura que llegó solo a algunas réplicas puede verla un lector y no el siguiente.",
    stale: (sum: boolean) => `La lectura devolvió v1 (dato viejo): ninguna réplica consultada tiene la escritura todavía${sum ? ", y con R + W ≤ N nada obliga a que se solapen" : ""}.`,
    rFailed: (k: number, r: number) => `Lectura no disponible: ${k} de R = ${r} respuestas.`,
    converge: "Después, las demás réplicas se ponen al día (read repair, anti-entropy).",
    lm: "escritura v2 / ack", lread: "lectura / respuesta", lstale: "respuesta vieja (v1)", llate: "copia todavía en camino",
    anim: " Animación: las escrituras van a las N réplicas y el coordinador espera W acks; se dibuja el peor caso, así que las copias fuera del conjunto de escritura llegan recién después de la lectura. Sus tiempos son ilustrativos.",
  },
};
type Tx = (typeof T)["en"];

const Sw = ({ fill, stroke, dash }: { fill: string; stroke: string; dash?: boolean }) => (
  <i aria-hidden style={{ display: "inline-block", width: 11, height: 11, borderRadius: 99, background: fill, border: `2px ${dash ? "dashed" : "solid"} ${stroke}`, margin: "0 4px -1px 0" }} />
);

/** One legend entry: its swatch never wraps away from its label. */
const K = ({ children }: { children: ReactNode }) => <span style={{ whiteSpace: "nowrap" }}>{children}</span>;

export default function QuorumLab({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [n, setN] = useState(3);
  const [w, setW] = useState(2);
  const [r, setR] = useState(2);
  const [down, setDown] = useState<number[]>([]);
  const [mode, setMode] = useState<Mode>("strict");
  const resize = (v: number) => { setN(v); setW((x) => Math.min(x, v)); setR((x) => Math.min(x, v)); setDown((d) => d.filter((i) => i < v)); };
  const toggle = (i: number) => setDown((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));

  const q = useMemo(() => {
    const up = Array.from({ length: n }, (_, i) => i).filter((i) => !down.includes(i));
    const wHints = Math.max(0, w - up.length), rHints = Math.max(0, r - up.length);
    const sloppy = mode === "sloppy", hinted = sloppy && wHints + rHints > 0;
    const writeOk = !wHints || sloppy, readOk = !rHints || sloppy; // a strict quorum fails short of W / R
    const ws = writeOk ? up.slice(0, w) : [], rs = readOk ? up.slice(Math.max(0, up.length - r)) : [];
    // Copies parked on stand-ins don't count: once the down replicas return, only home copies overlap.
    const hw = Math.min(w, up.length);
    const slowest = (set: number[], hints: number) => Math.max(0, ...set.map((i) => LAT[i]), hints ? STAND_IN_MS : 0);
    return {
      up, ws, rs, wHints, rHints, hw, hinted, writeOk, readOk, overlap: ws.filter((i) => rs.includes(i)).length,
      guaranteed: sloppy && wHints ? hw + r > n : r + w > n, wMs: slowest(ws, wHints), rMs: slowest(rs, rHints),
    };
  }, [n, w, r, down, mode]);

  const sum = `R + W = ${r + w} ${r + w > n ? ">" : "≤"} N = ${n}`;
  // Whole units: Node and the browser can disagree in the last digit of Math.cos (hydration).
  const pos = useMemo(() => Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [Math.round(CX + RING * Math.cos(a)), Math.round(CY + RING * Math.sin(a))] as const;
  }), [n]);
  const standCount = mode === "sloppy" ? Math.max(q.wHints, q.rHints) : 0;
  const stand = useMemo(() => Array.from({ length: standCount }, (_, j) => [278, 22 + j * 34] as const), [standCount]);
  const opStat = (ok: boolean, hints: number, need: number) =>
    ({ value: ok ? t.ok : t.fail, tone: !ok ? "bad" as const : hints ? "warn" as const : "good" as const, sub: hints && ok ? t.via(hints) : ok ? t.survive(n - need) : t.need(need, q.up.length) });

  return (
    <LabGrid
      controls={
        <>
          <Range label={t.n} value={n} min={1} max={7} onChange={resize} />
          <Range label={t.w} value={w} min={1} max={n} onChange={setW} hint={t.wHint} />
          <Range label={t.r} value={r} min={1} max={n} onChange={setR} hint={t.rHint} />
          <div className="lab-seg" role="group" aria-label={t.down}>
            <span className="ls-label">{t.down}</span>
            <div className="ls-opts">
              {pos.map((_, i) => <button key={i} type="button" className={down.includes(i) ? "on" : undefined} aria-pressed={down.includes(i)} onClick={() => toggle(i)}>R{i + 1}</button>)}
            </div>
          </div>
          <Seg label={t.mode} value={mode} onChange={setMode} options={(["strict", "sloppy"] as const).map((m) => ({ value: m, label: t[m] }))} />
        </>
      }
    >
      <Live q={q} n={n} w={w} r={r} down={down} pos={pos} stand={stand} toggle={toggle} t={t} />
      <div className="lab-stats" aria-live="polite">
        <Stat label={t.fresh} value={q.guaranteed ? t.yes : t.no} tone={q.guaranteed ? "good" : "bad"} sub={mode === "sloppy" && q.wHints ? t.home(q.hw + r, n) : `${sum} · ${q.hinted ? t.hinted : q.writeOk && q.readOk ? t.overlap(q.overlap) : t.blocked}`} />
        <Stat label={t.writes} {...opStat(q.writeOk, q.wHints, w)} />
        <Stat label={t.reads} {...opStat(q.readOk, q.rHints, r)} />
      </div>
      <div className="lab-bars">
        <Bar label={t.wWait} value={q.writeOk ? q.wMs : 0} max={STAND_IN_MS} text={q.writeOk ? `${q.wMs} ms` : "—"} />
        <Bar label={t.rWait} value={q.readOk ? q.rMs : 0} max={STAND_IN_MS} text={q.readOk ? `${q.rMs} ms` : "—"} />
      </div>
      <Insight>{r + w <= n ? t.noI(sum) : q.guaranteed ? t.yesI(sum) : t.sloppyI(q.hw)}</Insight>
      <LabMore locale={locale} formula={t.formula}>
        <p className="lab-note">{r + w <= n ? t.noMore : q.guaranteed ? t.yesMore : t.sloppyMore}{t.dynamo}</p>
        <p className="lab-note">{t.note}{t.anim}</p>
      </LabMore>
    </LabGrid>
  );
}

/* ------------------------------------------------------------------ the live cycle */
type Q = { up: number[]; ws: number[]; rs: number[]; wHints: number; rHints: number; writeOk: boolean; readOk: boolean };
type XY = readonly [number, number];
type Tone = "v2" | "v1" | "none";
/** One message dot: from → to starting at t0, taking dur ms. A dropped one dies at a down replica;
 *  a parked one (worst case) stops at `park` of the way until `resume`. */
interface Msg { from: XY; to: XY; t0: number; dur: number; kind: "write" | "ack" | "read" | "reply"; tone?: Tone; drop?: boolean; park?: number; resume?: number; rep?: number }
interface Plan {
  msgs: Msg[]; v2At: number[]; hintAt: number[]; acks: number[]; replies: { at: number; tone: Tone; home: number }[];
  w0: number; writeEnd: number; r0: number; readEnd: number; conv: number; late: boolean; end: number;
  result: "overlap" | "hint" | "partial" | "stale" | "fail"; overlapAt: Map<number, number>;
}

const W0 = 500, SPEEDS = [0.5, 1, 2] as const;
const trav = (lat: number) => 260 + lat * 22; // animation ms for one hop: illustrative, grows with latency
/** Client edge → replica edge along the spoke. */
function spoke(p: XY, r: number): [XY, XY] {
  const dx = p[0] - CX, dy = p[1] - CY, l = Math.hypot(dx, dy) || 1;
  return [[CX + (dx / l) * 25, CY + (dy / l) * 25], [p[0] - (dx / l) * (r + 1), p[1] - (dy / l) * (r + 1)]];
}

function plan(q: Q, n: number, w: number, r: number, down: number[], pos: XY[], stand: XY[]): Plan {
  const msgs: Msg[] = [], v2At = new Array<number>(n).fill(Infinity), hintAt = stand.map(() => Infinity), acks: number[] = [];
  const late: Msg[] = [];
  // Healthy replicas that store the write in time: the write set, or every healthy one if the
  // write fails (the copies that landed are not taken back).
  const promptly = (i: number) => !down.includes(i) && (q.writeOk ? q.ws.includes(i) : true);
  for (let i = 0; i < n; i++) {
    const d = trav(LAT[i]), [a, b] = spoke(pos[i], RAD);
    if (down.includes(i)) { msgs.push({ from: a, to: b, t0: W0, dur: d, kind: "write", drop: true }); continue; }
    if (promptly(i)) {
      msgs.push({ from: a, to: b, t0: W0, dur: d, kind: "write" }, { from: b, to: a, t0: W0 + d, dur: d, kind: "ack" });
      v2At[i] = W0 + d;
      acks.push(W0 + 2 * d);
    } else {
      const m: Msg = { from: a, to: b, t0: W0, dur: d, kind: "write", park: 0.42, rep: i };
      msgs.push(m);
      late.push(m);
    }
  }
  for (let j = 0; j < q.wHints && j < stand.length; j++) {
    const d = trav(STAND_IN_MS), [a, b] = spoke(stand[j], 13);
    msgs.push({ from: a, to: b, t0: W0, dur: d, kind: "write" }, { from: b, to: a, t0: W0 + d, dur: d, kind: "ack" });
    hintAt[j] = W0 + d;
    acks.push(W0 + 2 * d);
  }
  acks.sort((x, y) => x - y);
  const writeEnd = q.writeOk ? acks[Math.min(w, acks.length) - 1] ?? W0 : (acks[acks.length - 1] ?? W0 + trav(10)) + 500;
  const r0 = writeEnd + 700;
  const replies: Plan["replies"] = [];
  const targets = q.readOk ? q.rs : Array.from({ length: n }, (_, i) => i);
  for (const i of targets) {
    const d = trav(LAT[i]), [a, b] = spoke(pos[i], RAD);
    if (down.includes(i)) { msgs.push({ from: a, to: b, t0: r0, dur: d, kind: "read", drop: true }); continue; }
    const tone: Tone = v2At[i] <= r0 + d ? "v2" : "v1";
    msgs.push({ from: a, to: b, t0: r0, dur: d, kind: "read" }, { from: b, to: a, t0: r0 + d, dur: d, kind: "reply", tone });
    replies.push({ at: r0 + 2 * d, tone, home: i });
  }
  for (let j = 0; q.readOk && j < q.rHints && j < stand.length; j++) {
    const d = trav(STAND_IN_MS), [a, b] = spoke(stand[j], 13), tone: Tone = j < q.wHints ? "v2" : "none";
    msgs.push({ from: a, to: b, t0: r0, dur: d, kind: "read" }, { from: b, to: a, t0: r0 + d, dur: d, kind: "reply", tone });
    replies.push({ at: r0 + 2 * d, tone, home: -1 });
  }
  replies.sort((x, y) => x.at - y.at);
  const heard = q.readOk ? replies.slice(0, r) : replies;
  const readEnd = q.readOk ? heard[heard.length - 1]?.at ?? r0 : (replies[replies.length - 1]?.at ?? r0 + trav(10)) + 500;
  const overlapAt = new Map<number, number>();
  heard.forEach((x) => { if (x.tone === "v2" && x.home >= 0 && q.ws.includes(x.home)) overlapAt.set(x.home, x.at); });
  const v2 = heard.filter((x) => x.tone === "v2");
  const result = !q.readOk ? "fail" : !v2.length ? "stale" : overlapAt.size ? "overlap" : v2.some((x) => x.home >= 0) ? "partial" : "hint";
  const conv = readEnd + 1100;
  let end = readEnd + 2600;
  for (const m of late) {
    m.resume = conv;
    const at = conv + m.dur * (1 - (m.park ?? 0));
    v2At[m.rep ?? 0] = at;
    end = Math.max(end, at + 1500);
  }
  return { msgs, v2At, hintAt, acks, replies: heard, w0: W0, writeEnd, r0, readEnd, conv, late: late.length > 0, end, result, overlapAt };
}

/** Where a message dot is at time c, or null when it is not on screen. */
function where(m: Msg, c: number): { x: number; y: number; dying: number } | null {
  if (c < m.t0) return null;
  let f = (c - m.t0) / m.dur;
  if (m.park !== undefined) f = c < (m.resume ?? Infinity) ? Math.min(m.park, f) : m.park + (c - (m.resume ?? 0)) / m.dur;
  if (f >= 1 && !(m.drop && f < 1 + 380 / m.dur)) return null;
  const k = Math.min(1, f);
  return { x: m.from[0] + (m.to[0] - m.from[0]) * k, y: m.from[1] + (m.to[1] - m.from[1]) * k, dying: m.drop && f >= 1 ? (f - 1) / (380 / m.dur) : 0 };
}

/** One requestAnimationFrame loop while `on`; it sleeps while the tab is hidden or the element is
 *  off-screen, and stops on unmount. `tick` gets the real ms since the previous frame. */
function useFrames(ref: RefObject<HTMLElement | null>, on: boolean, tick: (dt: number) => void) {
  const cb = useRef(tick);
  useEffect(() => { cb.current = tick; });
  useEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    let raf = 0, last = 0, seen = false;
    const frame = (now: number) => { const dt = last ? Math.min(50, now - last) : 0; last = now; cb.current(dt); if (raf) raf = requestAnimationFrame(frame); };
    const sync = () => {
      const run = seen && document.visibilityState === "visible";
      if (run && !raf) { last = 0; raf = requestAnimationFrame(frame); }
      else if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", sync); cancelAnimationFrame(raf); raf = 0; };
  }, [on, ref]);
}

function Live({ q, n, w, r, down, pos, stand, toggle, t }: {
  q: Q; n: number; w: number; r: number; down: number[]; pos: XY[]; stand: XY[]; toggle: (i: number) => void; t: Tx;
}) {
  const reduced = useReducedMotion();
  const box = useRef<HTMLElement>(null);
  const p = useMemo(() => plan(q, n, w, r, down, pos, stand), [q, n, w, r, down, pos, stand]);
  const [c, setC] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const clock = useRef(0);
  const seek = (x: number) => { clock.current = x; setC(x); };
  // A new setup replays from the start; with reduced motion it shows the read's outcome at once.
  useEffect(() => { const x = reduced ? p.conv - 1 : 0; clock.current = x; setC(x); }, [p, reduced]);
  useFrames(box, playing && !reduced, (dt) => { const x = clock.current + dt * speed; seek(x >= p.end ? 0 : x); });

  const acks = p.acks.filter((a) => a <= c).length, heard = p.replies.filter((x) => x.at <= c).length;
  const phase = c < W0 ? "idle" : c < p.writeEnd ? "write" : c < p.r0 ? "wrote" : c < p.readEnd ? "read" : c < p.conv || !p.late ? "result" : "converge";
  const names = [...p.overlapAt.keys()].map((i) => `R${i + 1}`).join(", ");
  const msg = phase === "idle" ? t.idle : phase === "write" ? t.writing(n, w, Math.min(acks, w)) : phase === "wrote" ? (q.writeOk ? t.committed(w) : t.wFailed(acks, w))
    : phase === "read" ? t.reading(r, Math.min(heard, r)) : phase === "converge" ? t.converge
    : p.result === "fail" ? t.rFailed(heard, r) : p.result === "overlap" ? t.gotOverlap(names, p.overlapAt.size) : p.result === "hint" ? t.gotHint : p.result === "partial" ? t.gotPartial : t.stale(r + w <= n);
  const step = { idle: -1, write: 0, wrote: 0, read: 1, result: 2, converge: 2 }[phase];
  const good = p.result === "overlap" || p.result === "hint" || p.result === "partial";
  const center: [ReactNode, string, string] = phase === "write" ? [`${Math.min(acks, w)}/${w}`, t.acks, ""]
    : phase === "wrote" ? [q.writeOk ? "✓" : "✗", "v2", q.writeOk ? s.cGood : s.cBad]
    : phase === "read" ? [`${Math.min(heard, r)}/${r}`, t.replies, ""]
    : phase === "result" || phase === "converge" ? [p.result === "fail" ? "✗" : good ? "v2" : "v1", p.result === "fail" ? "" : good ? "✓" : "stale", p.result === "fail" || !good ? s.cBad : s.cGood]
    : ["v1", "", ""];

  return (
    <section className={s.live} ref={box} aria-label={t.live}>
      <div className={s.transport}>
        {!reduced && (
          <>
            <button type="button" className={s.tbtn} onClick={() => { seek(0); setPlaying(true); }} aria-label={t.restart} title={t.restart}><Glyph d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" /></button>
            <button type="button" className={`${s.tbtn} ${s.main}`} onClick={() => setPlaying((v) => !v)} aria-label={playing ? t.pause : t.play} title={playing ? t.pause : t.play}>
              {playing ? <Glyph d="M9 6v12M15 6v12" /> : <Glyph d="M8 5.5v13l10-6.5z" fill />}
            </button>
            <div className={s.speed} role="group" aria-label={t.speed}>
              {SPEEDS.map((v) => <button key={v} type="button" className={v === speed ? s.on : undefined} aria-pressed={v === speed} onClick={() => setSpeed(v)}>{v}×</button>)}
            </div>
          </>
        )}
        <ol className={s.steps} aria-hidden>
          {[0, 1, 2].map((i) => <li key={i} className={i === step ? s.stepOn : i < step ? s.stepDone : undefined} />)}
        </ol>
      </div>
      <p className={`${s.msg}${phase === "result" ? ` ${good ? s.msgGood : s.msgBad}` : ""}`}>{msg}</p>
      <svg className="lab-svg" viewBox="0 0 300 250" role="img" aria-label={t.aria(n, down.length)}>
        {pos.map(([x, y], i) => {
          const [a, b] = spoke([x, y], RAD);
          return (
            <g key={`l${i}`}>
              <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className={s.spoke} />
              {q.ws.includes(i) && <line x1={CX} y1={CY} x2={x} y2={y} className={s.wline} />}
              {q.rs.includes(i) && <line x1={CX} y1={CY} x2={x} y2={y} className={s.rline} />}
            </g>
          );
        })}
        {stand.map(([x, y], j) => (
          <g key={`s${j}`}>
            {j < q.wHints && <line x1={CX} y1={CY} x2={x} y2={y} className={s.wline} style={{ strokeWidth: 2 }} />}
            {j < q.rHints && <line x1={CX} y1={CY} x2={x} y2={y} className={s.rline} />}
            <circle cx={x} cy={y} r={13} className={`${s.stand}${p.hintAt[j] <= c ? ` ${s.has}` : ""}`} />
            <text x={x} y={y + 3} textAnchor="middle" style={{ fontSize: 9 }}>{t.hint}</text>
          </g>
        ))}
        <circle cx={CX} cy={CY} r={23} className={`${s.client}${phase === "write" || phase === "read" ? ` ${s.busy}` : ""}`} />
        <text x={CX} y={center[1] ? CY + 1 : CY + 5} textAnchor="middle" className={`${s.cNum} ${center[2]}`}>{center[0]}</text>
        {center[1] && <text x={CX} y={CY + 13} textAnchor="middle" style={{ fontSize: 8.5 }}>{center[1]}</text>}
        {pos.map(([x, y], i) => {
          const off = down.includes(i), inW = q.ws.includes(i), inR = q.rs.includes(i), has = p.v2At[i] <= c;
          const halo = p.overlapAt.has(i) && c >= (p.overlapAt.get(i) ?? Infinity);
          const cls = off ? s.down : inW && inR ? s.both : inR ? s.inR : inW ? s.inW : "";
          return (
            <g key={i} onClick={() => toggle(i)} className={s.rep}>
              {halo && <circle cx={x} cy={y} r={RAD + 6} className={s.halo} />}
              <circle cx={x} cy={y} r={RAD} className={`${s.node} ${cls}${has ? ` ${s.has}` : ""}`} />
              <text x={x} y={y - 2} textAnchor="middle" style={{ fill: off ? "var(--muted)" : "var(--text)", fontWeight: 700, fontSize: 13 }}>R{i + 1}</text>
              <text x={x} y={y + 13} textAnchor="middle" style={{ fontSize: 11 }}>{off ? t.off : `${LAT[i]} ms`}</text>
            </g>
          );
        })}
        {p.msgs.map((m, k) => {
          const at = where(m, c);
          if (!at) return null;
          const parked = m.park !== undefined && c < (m.resume ?? 0) && c - m.t0 >= m.park * m.dur;
          const cls = m.kind === "write" ? s.mWrite : m.kind === "ack" ? s.mAck : m.kind === "read" ? s.mRead : m.tone === "v2" ? s.mV2 : m.tone === "v1" ? s.mV1 : s.mNone;
          if (at.dying) return <circle key={k} cx={at.x} cy={at.y} r={5 + 9 * at.dying} className={s.mDrop} style={{ opacity: 1 - at.dying }} />;
          return <circle key={k} cx={at.x} cy={at.y} r={m.kind === "ack" ? 4 : 5} className={`${s.m} ${cls}${parked ? ` ${s.parked}` : ""}`} />;
        })}
      </svg>
      <p className="lab-note">
        <K><Sw fill="color-mix(in srgb, var(--accent) 26%, var(--surface))" stroke="var(--accent)" />{t.lw}</K> · <K><Sw fill="var(--surface)" stroke="var(--text)" />{t.lr}</K> · <K><Sw fill="var(--surface)" stroke="var(--good)" />{t.lo}</K> · <K><Sw fill="var(--bg-2)" stroke="var(--bad)" dash />{t.ld}</K>{stand.length > 0 && <> · <K><Sw fill="var(--surface)" stroke="var(--accent)" dash />{t.ls}</K></>}
        <br /><K><Sw fill="var(--accent)" stroke="var(--accent)" />{t.lm}</K> · <K><Sw fill="oklch(0.72 0.15 250)" stroke="oklch(0.72 0.15 250)" />{t.lread}</K> · <K><Sw fill="var(--muted)" stroke="var(--muted)" />{t.lstale}</K> · <K><Sw fill="transparent" stroke="var(--accent)" dash />{t.llate}</K>
      </p>
    </section>
  );
}

function Glyph({ d, fill }: { d: string; fill?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
