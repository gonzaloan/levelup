"use client";
// Leaderless quorums: N replicas, a write acknowledged by W of them, a read answered by R. The read
// is drawn as the worst case (the R healthy replicas furthest from the write), so an overlap on
// screen is the R + W > N guarantee at work, not luck.
import { useMemo, useState } from "react";
import type { Locale } from "@/lib/types";
import { Bar, Insight, LabGrid, Range, Seg, Stat } from "./ui";

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
    yesI: (s: string) => `${s}: the read set always shares a replica with the last write, so the read can find the newest version. Still not linearizable: sloppy quorums, concurrent writers and last-write-wins can return stale or lost data.`,
    noI: (s: string) => `${s}: a read can miss the last write entirely. That buys latency and availability; read repair and anti-entropy make the replicas converge later (eventual consistency).`,
    sloppyI: (hw: number) => `Hinted handoff kept the write available, but only ${hw} of its W copies landed on home replicas: when the down replicas return, a read of R home replicas can miss it until the hints are handed back. R + W > N alone is no longer a guarantee.`,
    dynamo: " Dynamo's common (N, R, W) is (3, 2, 2): overlap, and one replica down is tolerated for reads and writes.",
    note: "Replica latencies are illustrative. The write is acked by the first W healthy replicas; the read shows the worst case, the R healthy replicas furthest from it. Facts from the replication, consistency models and key-value store concepts (Dynamo, SOSP 2007).",
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
    yesI: (s: string) => `${s}: el conjunto de lectura siempre comparte una réplica con la última escritura, así que la lectura puede encontrar la versión más nueva. Igual no es linealizable: sloppy quorums, escritores concurrentes y last-write-wins pueden devolver datos viejos o perdidos.`,
    noI: (s: string) => `${s}: una lectura puede no ver la última escritura. A cambio ganas latencia y disponibilidad; read repair y anti-entropy hacen que las réplicas converjan después (consistencia eventual).`,
    sloppyI: (hw: number) => `Hinted handoff mantuvo la escritura disponible, pero solo ${hw} de sus W copias quedaron en réplicas propias: cuando vuelvan las caídas, una lectura de R réplicas propias puede no verla hasta que se devuelvan los hints. R + W > N por sí solo ya no es garantía.`,
    dynamo: " El (N, R, W) común de Dynamo es (3, 2, 2): hay solapamiento y tolera una réplica caída en lecturas y escrituras.",
    note: "Las latencias por réplica son ilustrativas. La escritura la confirman las primeras W réplicas sanas; la lectura muestra el peor caso: las R réplicas sanas más lejos de ella. Datos de los conceptos de replicación, modelos de consistencia y key-value store distribuido (Dynamo, SOSP 2007).",
  },
};

const Sw = ({ fill, stroke, dash }: { fill: string; stroke: string; dash?: boolean }) => (
  <i aria-hidden style={{ display: "inline-block", width: 11, height: 11, borderRadius: 99, background: fill, border: `2px ${dash ? "dashed" : "solid"} ${stroke}`, margin: "0 4px -1px 0" }} />
);

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
  const pos = Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [CX + RING * Math.cos(a), CY + RING * Math.sin(a)] as const;
  });
  const stand = Array.from({ length: mode === "sloppy" ? Math.max(q.wHints, q.rHints) : 0 }, (_, j) => [278, 22 + j * 34] as const);
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
      <div className="lab-stats" aria-live="polite">
        <Stat label={t.fresh} value={q.guaranteed ? t.yes : t.no} tone={q.guaranteed ? "good" : "bad"} sub={mode === "sloppy" && q.wHints ? t.home(q.hw + r, n) : `${sum} · ${q.hinted ? t.hinted : q.writeOk && q.readOk ? t.overlap(q.overlap) : t.blocked}`} />
        <Stat label={t.writes} {...opStat(q.writeOk, q.wHints, w)} />
        <Stat label={t.reads} {...opStat(q.readOk, q.rHints, r)} />
      </div>
      <svg className="lab-svg" viewBox="0 0 300 250" role="img" aria-label={t.aria(n, down.length)}>
        {pos.map(([x, y], i) => (
          <g key={`l${i}`}>
            {q.ws.includes(i) && <line x1={CX} y1={CY} x2={x} y2={y} style={{ stroke: "var(--accent)", strokeWidth: 2.5 }} />}
            {q.rs.includes(i) && <line x1={CX} y1={CY} x2={x} y2={y} style={{ stroke: "var(--text-2)", strokeWidth: 1.5, strokeDasharray: "5 4" }} />}
          </g>
        ))}
        {stand.map(([x, y], j) => (
          <g key={`s${j}`}>
            {j < q.wHints && <line x1={CX} y1={CY} x2={x} y2={y} style={{ stroke: "var(--accent)", strokeWidth: 2 }} />}
            {j < q.rHints && <line x1={CX} y1={CY} x2={x} y2={y} style={{ stroke: "var(--text-2)", strokeWidth: 1.5, strokeDasharray: "5 4" }} />}
            <circle cx={x} cy={y} r={13} style={{ fill: "var(--surface)", stroke: "var(--accent)", strokeDasharray: "3 2" }} />
            <text x={x} y={y + 3} textAnchor="middle" style={{ fontSize: 9 }}>{t.hint}</text>
          </g>
        ))}
        <circle cx={CX} cy={CY} r={23} style={{ fill: "var(--bg-2)", stroke: "var(--border-2)" }} />
        <text x={CX} y={CY + 3} textAnchor="middle" style={{ fontSize: 9 }}>{t.client}</text>
        {pos.map(([x, y], i) => {
          const off = down.includes(i), inW = q.ws.includes(i), inR = q.rs.includes(i);
          const stroke = off ? "var(--bad)" : inW && inR ? "var(--good)" : inR ? "var(--text)" : inW ? "var(--accent)" : "var(--border-2)";
          const fill = off ? "var(--bg-2)" : inW ? "color-mix(in srgb, var(--accent) 26%, var(--surface))" : "var(--surface)";
          return (
            <g key={i} onClick={() => toggle(i)} style={{ cursor: "pointer" }}>
              <circle cx={x} cy={y} r={RAD} style={{ fill, stroke, strokeWidth: inW || inR ? 3 : 1.5, strokeDasharray: off ? "4 3" : undefined }} />
              <text x={x} y={y - 2} textAnchor="middle" style={{ fill: "var(--text)", fontWeight: 700, fontSize: 13 }}>R{i + 1}</text>
              <text x={x} y={y + 13} textAnchor="middle" style={{ fontSize: 11 }}>{off ? t.off : `${LAT[i]} ms`}</text>
            </g>
          );
        })}
      </svg>
      <p className="lab-note">
        <Sw fill="color-mix(in srgb, var(--accent) 26%, var(--surface))" stroke="var(--accent)" />{t.lw} · <Sw fill="var(--surface)" stroke="var(--text)" />{t.lr} · <Sw fill="var(--surface)" stroke="var(--good)" />{t.lo} · <Sw fill="var(--bg-2)" stroke="var(--bad)" dash />{t.ld}{mode === "sloppy" && <> · <Sw fill="var(--surface)" stroke="var(--accent)" dash />{t.ls}</>}
      </p>
      <div className="lab-bars">
        <Bar label={t.wWait} value={q.writeOk ? q.wMs : 0} max={STAND_IN_MS} text={q.writeOk ? `${q.wMs} ms` : "—"} />
        <Bar label={t.rWait} value={q.readOk ? q.rMs : 0} max={STAND_IN_MS} text={q.readOk ? `${q.rMs} ms` : "—"} />
      </div>
      <p className="lab-formula">{t.formula}</p>
      <Insight>{(r + w <= n ? t.noI(sum) : q.guaranteed ? t.yesI(sum) : t.sloppyI(q.hw)) + t.dynamo}</Insight>
      <p className="lab-note">{t.note}</p>
    </LabGrid>
  );
}
