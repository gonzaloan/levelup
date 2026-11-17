"use client";
// Placeholder until this lab is built.
import type { Locale } from "@/lib/types";

export default function Lab({ locale }: { locale: Locale }) {
  return <p className="lab-note">{locale === "es" ? "Este lab está en construcción." : "This lab is being built."}</p>;
}
