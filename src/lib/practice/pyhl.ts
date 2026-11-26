// A tiny Python highlighter for the code editor: a regex tokenizer good enough for interview code
// (keywords, builtins, strings, numbers, comments, def/class names). It colors a <pre> drawn under
// a transparent <textarea>, so the editor keeps every native behavior (paste rules, keys, a11y,
// mobile keyboards) and ships no editor library. Pure, so it is unit-tested.

export type Tok = { k: "" | "kw" | "bi" | "str" | "num" | "com" | "fn" | "dec" | "const"; s: string };

const KW = new Set("and as assert async await break class continue def del elif else except finally for from global if import in is lambda match case nonlocal not or pass raise return try while with yield".split(" "));
const CONST = new Set(["None", "True", "False", "self"]);
const BI = new Set("abs all any bin bisect bool chr Counter defaultdict deque dict divmod enumerate filter float frozenset heapq heappop heappush hex int isinstance iter len list map max min next object OrderedDict ord pow print range reversed round set sorted str sum tuple type zip math collections functools itertools lru_cache cache".split(" "));

// One alternation, tried left to right at each position; order matters (triple quotes first).
const RE = /(#[^\n]*)|([rbuf]{0,2}(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?))|(\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?j?\b)|(@[A-Za-z_][\w.]*)|([A-Za-z_]\w*)|(\s+)|([^\sA-Za-z_\d#"']+|["'])/gi;

export function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let prev = "";
  for (const m of src.matchAll(RE)) {
    const [s, com, str, num, dec, word] = m;
    let k: Tok["k"] = "";
    if (com) k = "com";
    else if (str) k = "str";
    else if (num) k = "num";
    else if (dec) k = "dec";
    else if (word) k = prev === "def" || prev === "class" ? "fn" : KW.has(word) ? "kw" : CONST.has(word) ? "const" : BI.has(word) ? "bi" : "";
    if (word) prev = word; else if (!/^\s+$/.test(s)) prev = "";
    const last = out[out.length - 1];
    if (last && last.k === k && k === "") last.s += s; else out.push({ k, s });
  }
  return out;
}
