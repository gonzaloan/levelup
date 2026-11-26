"use client";
// How many solved problems are due to be re-solved today (src/lib/practice/resolve.ts): a banner
// on the coding page, a count elsewhere. Nothing renders until there is something due.
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { loadCode } from "@/lib/practice/code-store";
import { dueProblems } from "@/lib/practice/resolve";
import { Icon } from "../Icon";

export function useResolveDue(): number {
  const [n, setN] = useState(0);
  useEffect(() => { const s = loadCode(); setN(dueProblems(s.solved, s.reviews, Date.now()).length); }, []);
  return n;
}

export function ResolveDue({ locale }: { locale: Locale }) {
  const n = useResolveDue();
  if (!n) return null;
  const es = locale === "es";
  return (
    <Link href={`/${locale}/practice/code/review/`} className="lab-promo-card resolve-promo">
      <span className="resolve-n" aria-hidden>{n}</span>
      <span>
        <small>{es ? "Repaso espaciado" : "Spaced review"}</small>
        <strong>{es ? `${n} problema${n === 1 ? "" : "s"} para re-resolver de memoria` : `${n} problem${n === 1 ? "" : "s"} to re-solve from memory`}</strong>
        <span>{es ? "Lo que resolviste hace días: sin mirar la solución anterior." : "What you solved days ago: without looking at your old solution."}</span>
      </span>
      <Icon name="right" size={18} />
    </Link>
  );
}
