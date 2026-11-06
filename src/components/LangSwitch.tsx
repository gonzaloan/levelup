"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icon";

export function LangSwitch({ locale, label }: { locale: Locale; label: string }) {
  const path = usePathname() || `/${locale}/`;
  const other: Locale = locale === "es" ? "en" : "es";
  const href = path.replace(/^\/(en|es)(?=\/|$)/, `/${other}`);
  return (
    <Link className="icon-btn lang" href={href} hrefLang={other} title={label} aria-label={label}>
      <Icon name="globe" size={18} />
      <span>{other.toUpperCase()}</span>
    </Link>
  );
}
