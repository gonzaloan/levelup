// "What does this print?" Small Python snippets with fresh values each time. The answer is
// computed here in TypeScript, mirroring Python exactly; tools/check-gym.mjs runs every template
// for many seeds in Pyodide and fails the build if the two ever disagree.
import type { Rand, TraceRep } from "./types";
import { int, pick } from "./types";

/** Python's print() of an int list. */
export const pyList = (xs: number[]) => `[${xs.join(", ")}]`;
/** Python's floor division and modulo (they round toward −∞, not toward 0 like JS). */
export const floorDiv = (a: number, b: number) => Math.floor(a / b);
export const pyMod = (a: number, b: number) => a - b * Math.floor(a / b);
const ints = (r: Rand, n: number, lo: number, hi: number) => Array.from({ length: n }, () => int(r, lo, hi));

type Gen = (r: Rand, seed: string) => TraceRep;
const rep = (seed: string, code: string[], answer: string | number, en: string, es: string): TraceRep =>
  ({ skill: "trace", seed, code, answer: String(answer), why: { en, es } });

const sumIf: Gen = (r, seed) => {
  const xs = ints(r, 6, 1, 30), k = pick(r, [2, 3, 5]);
  const ans = xs.filter((x) => x % k === 0).reduce((a, b) => a + b, 0);
  return rep(seed, ["total = 0", `for x in ${pyList(xs)}:`, `    if x % ${k} == 0:`, "        total += x", "print(total)"], ans,
    `Only multiples of ${k} are added: ${xs.filter((x) => x % k === 0).join(" + ") || "none"} = ${ans}.`,
    `Solo se suman los múltiplos de ${k}: ${xs.filter((x) => x % k === 0).join(" + ") || "ninguno"} = ${ans}.`);
};

const rangeStep: Gen = (r, seed) => {
  const start = int(r, 0, 4), step = pick(r, [2, 3, 4]), stop = start + step * int(r, 2, 5) + int(r, 0, step - 1);
  const xs: number[] = [];
  for (let i = start; i < stop; i += step) xs.push(i);
  const ans = xs.reduce((a, b) => a + b, 0);
  return rep(seed, ["s = 0", `for i in range(${start}, ${stop}, ${step}):`, "    s += i", "print(s)"], ans,
    `range stops before ${stop}: ${xs.join(" + ")} = ${ans}.`, `range se detiene antes de ${stop}: ${xs.join(" + ")} = ${ans}.`);
};

const halving: Gen = (r, seed) => {
  const n0 = int(r, 9, 300);
  let n = n0, steps = 0;
  while (n > 1) { n = floorDiv(n, 2); steps++; }
  return rep(seed, [`n = ${n0}`, "steps = 0", "while n > 1:", "    n //= 2", "    steps += 1", "print(steps)"], steps,
    `Halving ${n0} down to 1 takes ⌊log₂ ${n0}⌋ = ${steps} steps.`, `Partir ${n0} a la mitad hasta 1 toma ⌊log₂ ${n0}⌋ = ${steps} pasos.`);
};

const slicing: Gen = (r, seed) => {
  const xs = ints(r, 7, 0, 9);
  const v = int(r, 0, 3);
  const a = int(r, 1, 3), b = a + int(r, 2, 3), k = int(r, 2, 3);
  const [expr, out, en, es] =
    v === 0 ? [`xs[${a}:${b}]`, xs.slice(a, b), `Indexes ${a} up to ${b - 1}: the end is excluded.`, `Índices ${a} hasta ${b - 1}: el final se excluye.`]
    : v === 1 ? [`xs[-${k}:]`, xs.slice(-k), `The last ${k} items.`, `Los últimos ${k} elementos.`]
    : v === 2 ? ["xs[::2]", xs.filter((_, i) => i % 2 === 0), "Every second item, starting at index 0.", "Uno de cada dos, desde el índice 0."]
    : [`xs[::-1][:${k}]`, [...xs].reverse().slice(0, k), `Reversed, then the first ${k}.`, `Al revés, y luego los primeros ${k}.`];
  return rep(seed, [`xs = ${pyList(xs)}`, `print(${expr})`], pyList(out as number[]), en as string, es as string);
};

const WORDS = ["banana", "mississippi", "letter", "balloon", "committee", "coffee", "parallel", "assessment", "bookkeeper", "success"];
const counting: Gen = (r, seed) => {
  const w = pick(r, WORDS);
  const counts = new Map<string, number>();
  for (const c of w) counts.set(c, (counts.get(c) ?? 0) + 1);
  const v = int(r, 0, 2);
  const ch = pick(r, [...counts.keys()]);
  const [expr, ans, en, es] =
    v === 0 ? [`counts["${ch}"]`, counts.get(ch)!, `'${ch}' appears ${counts.get(ch)} time(s) in "${w}".`, `'${ch}' aparece ${counts.get(ch)} vez/veces en "${w}".`]
    : v === 1 ? ["len(counts)", counts.size, `"${w}" has ${counts.size} distinct letters.`, `"${w}" tiene ${counts.size} letras distintas.`]
    : ["max(counts.values())", Math.max(...counts.values()), `The most repeated letter appears ${Math.max(...counts.values())} times.`, `La letra más repetida aparece ${Math.max(...counts.values())} veces.`];
  return rep(seed, ["counts = {}", `for ch in "${w}":`, "    counts[ch] = counts.get(ch, 0) + 1", `print(${expr})`], ans as number, en as string, es as string);
};

const nested: Gen = (r, seed) => {
  const n = int(r, 3, 9), inner = pick(r, ["i", "n", "i + 1"]);
  let c = 0;
  for (let i = 0; i < n; i++) c += inner === "i" ? i : inner === "n" ? n : i + 1;
  const en = inner === "i" ? `0 + 1 + … + ${n - 1} = ${n}·${n - 1}/2 = ${c}.` : inner === "n" ? `${n} × ${n} = ${c}.` : `1 + 2 + … + ${n} = ${n}·${n + 1}/2 = ${c}.`;
  return rep(seed, [`n = ${n}`, "c = 0", "for i in range(n):", `    for j in range(${inner}):`, "        c += 1", "print(c)"], c, en, en);
};

const prepend: Gen = (r, seed) => {
  const ws = [...new Set(Array.from({ length: 3 }, () => pick(r, ["ab", "cd", "ef", "gh", "xy", "ok", "no"])))];
  const front = r() < 0.5;
  const ans = front ? [...ws].reverse().join("") : ws.join("");
  return rep(seed, ['s = ""', `for w in [${ws.map((w) => `"${w}"`).join(", ")}]:`, front ? "    s = w + s" : "    s = s + w", "print(s)"], ans,
    front ? "Each word goes in front, so the order reverses." : "Each word goes at the end, so the order is kept.",
    front ? "Cada palabra va adelante, así que el orden se invierte." : "Cada palabra va al final, así que el orden se mantiene.");
};

const aliasing: Gen = (r, seed) => {
  const xs = ints(r, int(r, 2, 4), 1, 9), copy = r() < 0.5, extra = int(r, 1, 2);
  const ans = copy ? xs.length : xs.length + extra;
  const adds = Array.from({ length: extra }, (_, k) => `b.append(${k + 7})`);
  return rep(seed, [`a = ${pyList(xs)}`, copy ? "b = a[:]" : "b = a", ...adds, "print(len(a))"], ans,
    copy ? "a[:] makes a copy: appending to b leaves a alone." : "b = a is the same list under two names: appending to b changes a.",
    copy ? "a[:] crea una copia: agregar a b no toca a." : "b = a es la misma lista con dos nombres: agregar a b cambia a.");
};

const negDiv: Gen = (r, seed) => {
  const a = -int(r, 5, 29), b = pick(r, [2, 3, 4, 5]);
  const q = floorDiv(a, b), m = pyMod(a, b);
  return rep(seed, [`a, b = ${a}, ${b}`, "print(a // b, a % b)"], `${q} ${m}`,
    `// rounds toward −∞ (${a} / ${b} = ${(a / b).toFixed(2)} → ${q}), and % takes b's sign: ${a} = ${b}·(${q}) + ${m}.`,
    `// redondea hacia −∞ (${a} / ${b} = ${(a / b).toFixed(2)} → ${q}), y % toma el signo de b: ${a} = ${b}·(${q}) + ${m}.`);
};

const FRUITS = ["pear", "fig", "banana", "kiwi", "plum", "apple", "mango", "date", "lime", "cherry"];
const sortKey: Gen = (r, seed) => {
  const ws = [...new Set(Array.from({ length: 5 }, () => pick(r, FRUITS)))];
  const byLen = [...ws].sort((x, y) => x.length - y.length); // stable, like Python's sorted
  const last = r() < 0.5;
  const ans = last ? byLen[byLen.length - 1] : byLen[0];
  return rep(seed, [`words = [${ws.map((w) => `"${w}"`).join(", ")}]`, `print(sorted(words, key=len)[${last ? "-1" : "0"}])`], ans,
    "sorted is stable: among words of the same length the original order wins.", "sorted es estable: entre palabras del mismo largo gana el orden original.");
};

const fib: Gen = (r, seed) => {
  const k = int(r, 4, 10);
  const f = [0, 1];
  for (let i = 2; i <= k; i++) f.push(f[i - 1] + f[i - 2]);
  return rep(seed, ["def f(n):", "    if n <= 1:", "        return n", "    return f(n - 1) + f(n - 2)", `print(f(${k}))`], f[k],
    `Fibonacci: ${f.slice(0, k + 1).join(", ")}.`, `Fibonacci: ${f.slice(0, k + 1).join(", ")}.`);
};

const dot: Gen = (r, seed) => {
  const n = int(r, 3, 4), xs = ints(r, n, 1, 6), ys = ints(r, n + int(r, 0, 1), 1, 6);
  const ans = xs.reduce((s, x, i) => s + x * ys[i], 0);
  return rep(seed, [`xs = ${pyList(xs)}`, `ys = ${pyList(ys)}`, "print(sum(a * b for a, b in zip(xs, ys)))"], ans,
    `zip stops at the shorter list: ${xs.map((x, i) => `${x}·${ys[i]}`).join(" + ")} = ${ans}.`,
    `zip se detiene en la lista más corta: ${xs.map((x, i) => `${x}·${ys[i]}`).join(" + ")} = ${ans}.`);
};

export const TRACE_GENS: Gen[] = [sumIf, rangeStep, halving, slicing, counting, nested, prepend, aliasing, negDiv, sortKey, fib, dot];
export const traceRep = (r: Rand, seed: string): TraceRep => TRACE_GENS[int(r, 0, TRACE_GENS.length - 1)](r, seed);
