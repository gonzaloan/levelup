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
/** n different ints in [lo, hi] (needs hi − lo + 1 ≥ n), in draw order. */
const distinct = (r: Rand, n: number, lo: number, hi: number) => {
  const s = new Set<number>();
  while (s.size < n) s.add(int(r, lo, hi));
  return [...s];
};

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

const mutableDefault: Gen = (r, seed) => {
  const xs = distinct(r, 3, 1, 9), fixed = r() < 0.4;
  const head = fixed
    ? ["def add(x, acc=None):", "    if acc is None:", "        acc = []", "    acc.append(x)", "    return acc"]
    : ["def add(x, acc=[]):", "    acc.append(x)", "    return acc"];
  return rep(seed, [...head, `add(${xs[0]})`, `add(${xs[1]})`, `print(add(${xs[2]}))`], pyList(fixed ? [xs[2]] : xs),
    fixed ? "acc=None plus a new [] inside gives every call its own list: only the last value is in it."
      : "The default [] is built once, when def runs, and every call shares it: each call appends to the same list.",
    fixed ? "acc=None y un [] nuevo adentro le dan a cada llamada su propia lista: solo trae el último valor."
      : "El [] por defecto se crea una sola vez, cuando se ejecuta def, y todas las llamadas lo comparten: cada una agrega a la misma lista.");
};

const sharedRows: Gen = (r, seed) => {
  const rows = int(r, 2, 4), cols = int(r, 3, 5), shared = r() < 0.6;
  const a = int(r, 1, 9), b = int(r, 1, 9), c1 = int(r, 0, cols - 1), c2 = (c1 + int(r, 1, cols - 1)) % cols;
  // Mirror Python's references: one row object repeated, or a new row per index.
  const one: number[] = Array(cols).fill(0);
  const g = Array.from({ length: rows }, () => (shared ? one : Array(cols).fill(0) as number[]));
  g[0][c1] = a;
  g[1][c2] = b;
  const ans = g.reduce((s, row) => s + row.reduce((x, y) => x + y, 0), 0), rowSum = one.reduce((x, y) => x + y, 0);
  return rep(seed, [shared ? `grid = [[0] * ${cols}] * ${rows}` : `grid = [[0] * ${cols} for _ in range(${rows})]`, `grid[0][${c1}] = ${a}`, `grid[1][${c2}] = ${b}`, "print(sum(map(sum, grid)))"], ans,
    shared ? `* ${rows} repeats ONE row ${rows} times, so both writes land in it: every row is ${pyList(one)}, ${rows} × ${rowSum} = ${ans}.`
      : `The comprehension builds a new row each time, so each write touches one cell: ${a} + ${b} = ${ans}.`,
    shared ? `* ${rows} repite UNA misma fila ${rows} veces, así que las dos escrituras caen en ella: cada fila es ${pyList(one)}, ${rows} × ${rowSum} = ${ans}.`
      : `La comprensión de lista crea una fila nueva cada vez, así que cada escritura toca una sola celda: ${a} + ${b} = ${ans}.`);
};

const removeWhileLooping: Gen = (r, seed) => {
  const k = pick(r, [2, 3]);
  let xs: number[] = [], out: number[] = [];
  // Redraw until a multiple survives (two in a row), so the skip shows in the output.
  for (let tries = 0; tries < 50; tries++) {
    xs = distinct(r, int(r, 5, 6), 1, 20);
    out = [...xs];
    // Python's list iterator: an index that moves on by one, whatever the body removed.
    for (let i = 0; i < out.length; ) {
      const x = out[i++];
      if (x % k === 0) out.splice(out.indexOf(x), 1);
    }
    if (out.some((x) => x % k === 0)) break;
  }
  const left = out.filter((x) => x % k === 0);
  return rep(seed, [`xs = ${pyList(xs)}`, "for x in xs:", `    if x % ${k} == 0:`, "        xs.remove(x)", "print(xs)"], pyList(out),
    `Each remove shifts the rest left, so the loop skips the item right after it${left.length ? ` (${left.join(", ")} survive${left.length === 1 ? "s" : ""})` : ""}. Loop over a copy (xs[:]) or build a new list.`,
    `Cada remove corre el resto a la izquierda, así que el loop se salta el elemento que venía justo después${left.length ? ` (${left.join(", ")} sobrevive${left.length === 1 ? "" : "n"})` : ""}. Recorre una copia (xs[:]) o arma una lista nueva.`);
};

const lateBinding: Gen = (r, seed) => {
  const n = int(r, 3, 4), m = int(r, 2, 9), bound = r() < 0.4;
  const ans = Array.from({ length: n }, (_, i) => (bound ? i : n - 1) * m);
  return rep(seed, ["fs = []", `for i in range(${n}):`, bound ? `    fs.append(lambda i=i: i * ${m})` : `    fs.append(lambda: i * ${m})`, "print([f() for f in fs])"], pyList(ans),
    bound ? `i=i stores the current i as a default when each lambda is made: 0 to ${n - 1}, times ${m}.`
      : `Each lambda reads i when it is called, and by then the loop has left i = ${n - 1}: all return ${n - 1} × ${m}.`,
    bound ? `i=i guarda el i de ese momento como valor por defecto al crear cada lambda: de 0 a ${n - 1}, por ${m}.`
      : `Cada lambda lee i cuando se la llama, y para entonces el loop dejó i = ${n - 1}: todas devuelven ${n - 1} × ${m}.`);
};

const oneShot: Gen = (r, seed) => {
  if (r() < 0.5) {
    const xs = ints(r, int(r, 3, 4), 1, 6), s = xs.reduce((a, x) => a + x * x, 0);
    return rep(seed, [`xs = ${pyList(xs)}`, "sq = (x * x for x in xs)", "print(sum(sq), sum(sq))"], `${s} 0`,
      `sq is a generator: the first sum reads it to the end (${s}), the second finds it empty: 0.`,
      `sq es un generador: el primer sum lo lee hasta el final (${s}) y el segundo lo encuentra vacío: 0.`);
  }
  const k = int(r, 4, 6), xs = ints(r, 5, 1, 9);
  xs[int(r, 0, 4)] = k + int(r, 1, 3); // at least one item passes
  const c = xs.filter((x) => x > k).length;
  return rep(seed, [`xs = ${pyList(xs)}`, `big = filter(lambda x: x > ${k}, xs)`, "print(len(list(big)), len(list(big)))"], `${c} 0`,
    `filter returns a one-shot iterator: the first list() takes all ${c} items, the second gets none.`,
    `filter devuelve un iterador de un solo uso: el primer list() se lleva los ${c} elementos y el segundo no recibe ninguno.`);
};

const orFallback: Gen = (r, seed) => {
  const d = pick(r, [10, 20, 50, 100]), b = int(r, 1, 9), fixed = r() < 0.4;
  const calls: (number | null)[] = pick(r, [[0, null, b], [b, 0, null], [null, b, 0], [0, b, null]]);
  const f = (n: number | null) => (fixed ? (n === null ? d : n) : n || d);
  const head = fixed ? ["def limit(n=None):", "    if n is None:", `        n = ${d}`, "    return n"] : ["def limit(n=None):", `    return n or ${d}`];
  return rep(seed, [...head, `print(${calls.map((n) => `limit(${n ?? ""})`).join(", ")})`], calls.map(f).join(" "),
    fixed ? `is None only replaces a missing value: limit(0) keeps its 0, limit() gets ${d}.`
      : `or returns its first truthy operand and 0 is falsy, so limit(0) falls back to ${d} just like limit(). Test n is None when 0 is a valid value.`,
    fixed ? `is None solo reemplaza un valor que falta: limit(0) conserva su 0 y limit() recibe ${d}.`
      : `or devuelve el primer operando verdadero y 0 es falso, así que limit(0) cae en ${d}, igual que limit(). Pregunta n is None cuando 0 es un valor válido.`);
};

const sortReturnsNone: Gen = (r, seed) => {
  let xs = distinct(r, 4, 1, 20);
  const lo = Math.min(...xs);
  if (xs[0] === lo) xs = [...xs.slice(1), lo]; // xs[0] must change when sorted in place
  const inPlace = r() < 0.5;
  const sorted = [...xs].sort((a, b) => a - b);
  return rep(seed, [`xs = ${pyList(xs)}`, inPlace ? "ys = xs.sort()" : "ys = sorted(xs)", "print(ys, xs[0])"], inPlace ? `None ${lo}` : `${pyList(sorted)} ${xs[0]}`,
    inPlace ? `xs.sort() sorts xs in place and returns None: ys is None, and xs[0] is now the smallest, ${lo}.`
      : `sorted() returns a new list and leaves xs untouched, so xs[0] is still ${xs[0]}.`,
    inPlace ? `xs.sort() ordena xs en el lugar y devuelve None: ys es None, y xs[0] ahora es el menor, ${lo}.`
      : `sorted() devuelve una lista nueva y no toca xs, así que xs[0] sigue siendo ${xs[0]}.`);
};

const textCompare: Gen = (r, seed) => {
  let ss: string[] = [], lmax = "", lmin = "", nums: number[] = [];
  // Redraw until text order and number order disagree on the max or the min.
  for (let tries = 0; tries < 50; tries++) {
    const small = distinct(r, 2, 2, 9), big = distinct(r, 2, 10, 300), turn = int(r, 0, 3);
    nums = [big[0], small[0], big[1], small[1]];
    nums = [...nums.slice(turn), ...nums.slice(0, turn)];
    ss = nums.map(String);
    // JS compares strings by UTF-16 code unit; for digits that is Python's code-point order.
    lmax = ss.reduce((m, s) => (s > m ? s : m));
    lmin = ss.reduce((m, s) => (s < m ? s : m));
    if (lmax !== String(Math.max(...nums)) || lmin !== String(Math.min(...nums))) break;
  }
  const nmax = Math.max(...nums), nmin = Math.min(...nums);
  return rep(seed, [`ids = [${ss.map((s) => `"${s}"`).join(", ")}]`, "print(max(ids), min(ids))"], `${lmax} ${lmin}`,
    `Strings compare character by character, so "${lmax}" is the max and "${lmin}" the min (as numbers: ${nmax} and ${nmin}). Use key=int to compare numbers.`,
    `Los strings se comparan carácter por carácter, así que "${lmax}" es el máximo y "${lmin}" el mínimo (como números: ${nmax} y ${nmin}). Usa key=int para comparar números.`);
};

export const TRACE_GENS: Gen[] = [sumIf, rangeStep, halving, slicing, counting, nested, prepend, aliasing, negDiv, sortKey, fib, dot,
  mutableDefault, sharedRows, removeWhileLooping, lateBinding, oneShot, orFallback, sortReturnsNone, textCompare];
export const traceRep = (r: Rand, seed: string): TraceRep => TRACE_GENS[int(r, 0, TRACE_GENS.length - 1)](r, seed);
