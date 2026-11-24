// "Big-O by eye": the time complexity of a short snippet, in terms of n = len(xs) (or n itself).
// Curated templates (the answer is the template's, not computed); the variable names change.
import type { BigORep, Rand } from "./types";
import { int, pick } from "./types";
import { shuffle } from "../practice/rng";

const ALL = ["O(1)", "O(log n)", "O(√n)", "O(n)", "O(n log n)", "O(n²)"];
type Tpl = { code: (v: string, w: string) => string[]; answer: string; en: string; es: string };

const T: Tpl[] = [
  { code: (v) => [`def f(${v}):`, `    return ${v}[0] + ${v}[-1]`], answer: "O(1)", en: "Two index lookups, whatever the size.", es: "Dos accesos por índice, sin importar el tamaño." },
  { code: (v) => [`def f(${v}):`, "    s = 0", `    for x in ${v}:`, "        s += x", "    return s"], answer: "O(n)", en: "One pass over n items.", es: "Una pasada sobre n elementos." },
  { code: (v) => [`def f(${v}):`, "    c = 0", `    for a in ${v}:`, `        for b in ${v}:`, "            c += a * b", "    return c"], answer: "O(n²)", en: "n × n pairs.", es: "n × n pares." },
  { code: (v) => [`def f(${v}):`, "    c = 0", `    for i in range(len(${v})):`, "        for j in range(i):", "            c += 1", "    return c"], answer: "O(n²)", en: "0 + 1 + … + (n − 1) = n(n − 1)/2: still quadratic.", es: "0 + 1 + … + (n − 1) = n(n − 1)/2: sigue siendo cuadrático." },
  { code: () => ["def f(n):", "    i, c = 1, 0", "    while i < n:", "        i *= 2", "        c += 1", "    return c"], answer: "O(log n)", en: "i doubles each time: log₂ n steps.", es: "i se duplica cada vez: log₂ n pasos." },
  { code: () => ["def f(n):", "    c = 0", "    for i in range(n):", "        j = 1", "        while j < n:", "            j *= 2", "            c += 1", "    return c"], answer: "O(n log n)", en: "n outer steps, each with a log n doubling loop.", es: "n pasos afuera, cada uno con un loop de log n duplicaciones." },
  { code: (v) => [`def f(${v}):`, "    s = 0", `    for x in ${v}:`, "        s += x", `    for x in ${v}:`, "        s -= x", "    return s"], answer: "O(n)", en: "Two loops one after the other: n + n = 2n, still linear.", es: "Dos loops uno después del otro: n + n = 2n, sigue siendo lineal." },
  { code: () => ["def f(n):", "    i = 1", "    while i * i <= n:", "        i += 1", "    return i"], answer: "O(√n)", en: "It stops when i² passes n, so i reaches about √n.", es: "Se detiene cuando i² pasa a n, así que i llega a cerca de √n." },
  { code: (v) => [`def f(${v}):`, `    ${v} = sorted(${v})`, `    for i in range(1, len(${v})):`, `        if ${v}[i] == ${v}[i - 1]:`, "            return True", "    return False"], answer: "O(n log n)", en: "The sort dominates: n log n, then one linear pass.", es: "Domina el sort: n log n, y luego una pasada lineal." },
  { code: (v) => [`def f(${v}):`, "    c = 0", `    for x in ${v}:`, "        for k in range(100):", "            c += x * k", "    return c"], answer: "O(n)", en: "The inner loop is a constant 100: 100·n is still O(n).", es: "El loop interno es una constante de 100: 100·n sigue siendo O(n)." },
  { code: (v, w) => [`def f(${v}, ${w}):`, `    seen = set(${w})`, `    return sum(1 for x in ${v} if x in seen)`], answer: "O(n)", en: "Building the set is linear and each `in` on a set is O(1) on average.", es: "Armar el set es lineal y cada `in` sobre un set es O(1) en promedio." },
  { code: (v, w) => [`def f(${v}, ${w}):`, `    return sum(1 for x in ${v} if x in ${w})`], answer: "O(n²)", en: "`in` on a list scans it: n checks × n items (with both lists of size n).", es: "`in` sobre una lista la recorre: n revisiones × n elementos (con ambas listas de tamaño n)." },
  { code: () => ["def f(xs, t, lo=0, hi=None):", "    if hi is None:", "        hi = len(xs) - 1", "    if lo > hi:", "        return -1", "    mid = (lo + hi) // 2", "    if xs[mid] == t:", "        return mid", "    if xs[mid] < t:", "        return f(xs, t, mid + 1, hi)", "    return f(xs, t, lo, mid - 1)"], answer: "O(log n)", en: "Each call halves the range: binary search.", es: "Cada llamada parte el rango a la mitad: búsqueda binaria." },
];

const NAMES: [string, string][] = [["xs", "ys"], ["nums", "other"], ["items", "keys"], ["a", "b"], ["values", "allowed"]];

export function bigoRep(r: Rand, seed: string): BigORep {
  const t = T[int(r, 0, T.length - 1)];
  const [v, w] = pick(r, NAMES);
  const wrong = shuffle(ALL.filter((o) => o !== t.answer), `${seed}:w`).slice(0, 3);
  return { skill: "bigo", seed, code: t.code(v, w), answer: t.answer, options: shuffle([t.answer, ...wrong], `${seed}:o`), why: { en: t.en, es: t.es } };
}
export const BIGO_TEMPLATES = T.length;
