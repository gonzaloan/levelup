"use client";
import { useEffect, useState } from "react";
import { loadCode } from "@/lib/practice/code-store";

/** "✓" next to a problem in lists, from this browser's solved marks. */
export function SolvedMark({ id }: { id: string }) {
  const [ok, setOk] = useState(false);
  useEffect(() => { setOk(!!loadCode().solved[id]); }, [id]);
  return ok ? <span className="cr-solved-mark" title="✓">✓</span> : null;
}
