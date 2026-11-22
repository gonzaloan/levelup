"use client";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/types";

/** Interviews don't let you pick the question: start a random case. */
export function RandomCase({ ids, locale, label }: { ids: string[]; locale: Locale; label: string }) {
  const router = useRouter();
  return <button type="button" className="btn btn-primary" onClick={() => router.push(`/${locale}/practice/design/${ids[Math.floor(Math.random() * ids.length)]}/`)}>🎲 {label}</button>;
}
