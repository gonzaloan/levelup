"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { completeLogin } from "@/lib/sync";

/** OAuth redirect target: exchanges the code, merges progress, returns to where the learner was. */
export function AuthCallback() {
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    completeLogin(new URLSearchParams(location.search))
      .then((back) => location.replace(back))
      .catch((e) => setErr(String(e?.message ?? e)));
  }, []);
  return err ? <p>Sign-in failed: {err}. <Link href="/">Back</Link></p> : <p>Signing in…</p>;
}
