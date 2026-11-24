// "Spot the bug": a short function, the call that goes wrong, what it should return and what it
// returns. You tap the line. Exactly one line differs from the correct version; tools/check-gym.mjs
// runs both versions in Pyodide for many seeds and checks the expected and wrong outputs shown here.
import type { I18n } from "../types";
import type { DebugRep, Rand } from "./types";
import { int, pick } from "./types";
import { floorDiv, pyList } from "./trace";

const py = (v: number | boolean) => (typeof v === "boolean" ? (v ? "True" : "False") : String(v));

interface Tpl {
  task: I18n; correct: string[]; bugLine: number; bug: string; why: I18n;
  /** Arguments as Python source, and the two results. */
  call: string; expected: number | boolean; got: number | boolean;
}

function make(seed: string, t: Tpl): DebugRep {
  const code = [...t.correct];
  code[t.bugLine] = t.bug;
  return { skill: "debug", seed, task: t.task, code, bugLine: t.bugLine, fixed: t.correct[t.bugLine], call: t.call, expected: py(t.expected), got: py(t.got), why: t.why, correct: t.correct };
}

type Gen = (r: Rand, seed: string) => DebugRep;

const biggest: Gen = (r, seed) => {
  const xs = Array.from({ length: int(r, 3, 5) }, () => -int(r, 1, 30));
  return make(seed, {
    task: { en: "Return the largest number in a non-empty list.", es: "Devuelve el número más grande de una lista no vacía." },
    correct: ["def biggest(xs):", "    best = xs[0]", "    for x in xs:", "        if x > best:", "            best = x", "    return best"],
    bugLine: 1, bug: "    best = 0",
    call: `biggest(${pyList(xs)})`, expected: Math.max(...xs), got: 0,
    why: { en: "Starting at 0 assumes a positive number exists; with all negatives nothing beats 0. Start from the first element.", es: "Empezar en 0 supone que hay algún positivo; con puros negativos nada le gana a 0. Parte desde el primer elemento." },
  });
};

const inclusive: Gen = (r, seed) => {
  const a = int(r, 1, 5), b = a + int(r, 2, 6);
  const sum = (lo: number, hi: number) => { let s = 0; for (let i = lo; i < hi; i++) s += i; return s; };
  return make(seed, {
    task: { en: "Return the sum of every integer from a to b, both included.", es: "Devuelve la suma de todos los enteros de a hasta b, ambos incluidos." },
    correct: ["def total(a, b):", "    s = 0", "    for i in range(a, b + 1):", "        s += i", "    return s"],
    bugLine: 2, bug: "    for i in range(a, b):",
    call: `total(${a}, ${b})`, expected: sum(a, b + 1), got: sum(a, b),
    why: { en: "range stops before its end, so b is never added: an off-by-one.", es: "range se detiene antes del final, así que b nunca se suma: un off-by-one." },
  });
};

const palindrome: Gen = (r, seed) => {
  const w = pick(r, ["abba", "level", "racecar", "noon", "refer", "rotor", "civic", "kayak"]);
  return make(seed, {
    task: { en: "Return True if the string reads the same backwards.", es: "Devuelve True si el string se lee igual al revés." },
    correct: ["def is_pal(s):", "    for i in range(len(s) // 2):", "        if s[i] != s[-i - 1]:", "            return False", "    return True"],
    bugLine: 2, bug: "        if s[i] != s[-i]:",
    call: `is_pal("${w}")`, expected: true, got: false,
    why: { en: "s[-1] is the last character, so the mirror of index i is s[-i - 1]; s[-i] is off by one (and s[-0] is s[0]).", es: "s[-1] es el último carácter, así que el espejo del índice i es s[-i - 1]; s[-i] queda corrido en uno (y s[-0] es s[0])." },
  });
};

const vowels: Gen = (r, seed) => {
  const w = pick(r, ["Ana", "EUROPE", "Iowa", "OpenAI", "Ecuador", "Uruguay", "AUDIO", "Idea"]);
  const count = (s: string) => [...s].filter((c) => "aeiou".includes(c)).length;
  return make(seed, {
    task: { en: "Count the vowels in a string, upper or lower case.", es: "Cuenta las vocales de un string, en mayúscula o minúscula." },
    correct: ["def vowels(s):", "    n = 0", "    for ch in s.lower():", '        if ch in "aeiou":', "            n += 1", "    return n"],
    bugLine: 2, bug: "    for ch in s:",
    call: `vowels("${w}")`, expected: count(w.toLowerCase()), got: count(w),
    why: { en: "\"aeiou\" only holds lower case, so capitals are skipped: lower the string first.", es: "\"aeiou\" solo tiene minúsculas, así que las mayúsculas se saltan: pasa el string a minúsculas primero." },
  });
};

const windowSum: Gen = (r, seed) => {
  const k = int(r, 2, 3), n = int(r, 5, 7);
  const xs = Array.from({ length: n }, (_, i) => (i >= n - k ? int(r, 15, 25) : int(r, 1, 6)));
  const best = (end: number) => {
    let cur = xs.slice(0, k).reduce((a, b) => a + b, 0), b = cur;
    for (let i = k; i < end; i++) { cur += xs[i] - xs[i - k]; b = Math.max(b, cur); }
    return b;
  };
  return make(seed, {
    task: { en: `Return the largest sum of ${k} consecutive numbers.`, es: `Devuelve la mayor suma de ${k} números consecutivos.` },
    correct: ["def best_window(xs, k):", "    cur = sum(xs[:k])", "    best = cur", "    for i in range(k, len(xs)):", "        cur += xs[i] - xs[i - k]", "        best = max(best, cur)", "    return best"],
    bugLine: 3, bug: "    for i in range(k, len(xs) - 1):",
    call: `best_window(${pyList(xs)}, ${k})`, expected: best(n), got: best(n - 1),
    why: { en: "The loop must reach the last index; stopping one early skips the final window (here, the best one).", es: "El loop debe llegar al último índice; parar uno antes se salta la última ventana (aquí, la mejor)." },
  });
};

const search: Gen = (r, seed) => {
  let xs: number[] = [];
  const find = (target: number, strict: boolean) => {
    let lo = 0, hi = xs.length - 1;
    while (strict ? lo < hi : lo <= hi) {
      const mid = floorDiv(lo + hi, 2);
      if (xs[mid] === target) return mid;
      if (xs[mid] < target) lo = mid + 1; else hi = mid - 1;
    }
    return -1;
  };
  // A target the buggy loop misses: one only reached when lo == hi (redraw until there is one).
  let targets: number[] = [];
  for (let tries = 0; tries < 50 && !targets.length; tries++) {
    const n = int(r, 5, 9);
    xs = [];
    let v = int(r, 1, 4);
    for (let i = 0; i < n; i++) { xs.push(v); v += int(r, 1, 5); }
    targets = xs.filter((x) => find(x, true) === -1);
  }
  const target = pick(r, targets);
  return make(seed, {
    task: { en: "Binary search: return the index of target in a sorted list, or -1.", es: "Búsqueda binaria: devuelve el índice de target en una lista ordenada, o -1." },
    correct: ["def find(xs, target):", "    lo, hi = 0, len(xs) - 1", "    while lo <= hi:", "        mid = (lo + hi) // 2", "        if xs[mid] == target:", "            return mid", "        if xs[mid] < target:", "            lo = mid + 1", "        else:", "            hi = mid - 1", "    return -1"],
    bugLine: 2, bug: "    while lo < hi:",
    call: `find(${pyList(xs)}, ${target})`, expected: find(target, false), got: find(target, true),
    why: { en: "With an inclusive range [lo, hi], one element is still left when lo == hi: the loop must run while lo <= hi.", es: "Con un rango inclusivo [lo, hi], cuando lo == hi todavía queda un elemento: el loop debe seguir mientras lo <= hi." },
  });
};

const counting: Gen = (r, seed) => {
  const pool = ["go", "rust", "java", "python", "c"];
  const words = Array.from({ length: int(r, 5, 7) }, () => pick(r, pool.slice(0, 3)));
  words[1] = words[0]; // at least one repeat, so the overwritten count shows
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  return make(seed, {
    task: { en: "Return how many times the most frequent word appears.", es: "Devuelve cuántas veces aparece la palabra más frecuente." },
    correct: ["def top_count(words):", "    seen = {}", "    for w in words:", "        seen[w] = seen.get(w, 0) + 1", "    return max(seen.values())"],
    bugLine: 3, bug: "        seen[w] = 1",
    call: `top_count([${words.map((w) => `"${w}"`).join(", ")}])`, expected: Math.max(...counts.values()), got: 1,
    why: { en: "Assigning 1 overwrites the count every time; it must add to the previous count.", es: "Asignar 1 pisa el conteo cada vez; hay que sumarle al conteo anterior." },
  });
};

const factorial: Gen = (r, seed) => {
  const n = int(r, 4, 8);
  const f = (m: number) => { let o = 1; for (let i = 2; i < m; i++) o *= i; return o; };
  return make(seed, {
    task: { en: "Return n! (1 × 2 × … × n).", es: "Devuelve n! (1 × 2 × … × n)." },
    correct: ["def fact(n):", "    out = 1", "    for i in range(2, n + 1):", "        out *= i", "    return out"],
    bugLine: 2, bug: "    for i in range(2, n):",
    call: `fact(${n})`, expected: f(n + 1), got: f(n),
    why: { en: "range(2, n) stops at n − 1, so the last factor is missing.", es: "range(2, n) termina en n − 1, así que falta el último factor." },
  });
};

const multiples: Gen = (r, seed) => {
  let n = 0, k = 0, good = 0, bad = 0;
  for (let tries = 0; tries < 20; tries++) {
    n = int(r, 10, 30); k = pick(r, [3, 4, 6, 8, 12]);
    good = floorDiv(n, k);
    bad = 0;
    for (let i = 1; i <= n; i++) if (k % i === 0) bad++;
    if (good !== bad) break;
  }
  return make(seed, {
    task: { en: "Count the numbers from 1 to n that are multiples of k.", es: "Cuenta los números de 1 a n que son múltiplos de k." },
    correct: ["def multiples(n, k):", "    c = 0", "    for i in range(1, n + 1):", "        if i % k == 0:", "            c += 1", "    return c"],
    bugLine: 3, bug: "        if k % i == 0:",
    call: `multiples(${n}, ${k})`, expected: good, got: bad,
    why: { en: "k % i == 0 asks whether i divides k (a divisor), not whether i is a multiple of k.", es: "k % i == 0 pregunta si i divide a k (un divisor), no si i es múltiplo de k." },
  });
};

export const DEBUG_GENS: Gen[] = [biggest, inclusive, palindrome, vowels, windowSum, search, counting, factorial, multiples];
export const debugRep = (r: Rand, seed: string): DebugRep => DEBUG_GENS[int(r, 0, DEBUG_GENS.length - 1)](r, seed);
