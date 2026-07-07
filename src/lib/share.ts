// LinkedIn sharing for a no-backend static app. Two client-side GET links
// (from fetched LinkedIn docs, 2025): share-offsite (feed) points at a
// statically-exported achievement page whose OG tags render the rich card;
// profile/add prefills a certification (best-effort — LinkedIn dropped reliable
// autofill, so the achievement page also shows copyable fields).
import type { Achievement } from "./badges";
import { t, type Locale } from "@/i18n/config";

/** Absolute origin for share URLs. In the browser we read it live; SSG passes it in. */
export function siteOrigin(fallback = "https://levelup.gonzalo-munoz.com"): string {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return fallback;
}

export function achievementUrl(id: string, origin?: string): string {
  return `${(origin ?? siteOrigin()).replace(/\/$/, "")}/en/achievement/${id}/`;
}

/** Share a link to the LinkedIn feed. Only `url` is honored; preview = the page's OG tags. */
export function linkedInShareUrl(id: string, origin?: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(achievementUrl(id, origin))}`;
}

/** Add-to-Profile certification prefill (best-effort). */
export function linkedInAddToProfileUrl(a: Achievement, locale: Locale, origin?: string): string {
  const now = new Date();
  // NOTE: Date is available in the browser (client component). Never called during SSG.
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: `${t(a.name, locale)} — level-up`,
    organizationName: "level-up",
    issueYear: String(now.getFullYear()),
    issueMonth: String(now.getMonth() + 1),
    certUrl: achievementUrl(a.id, origin),
    certId: a.id,
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

/** Open a share popup (centered), falling back to a new tab. */
export function openShare(url: string): void {
  if (typeof window === "undefined") return;
  const w = 600, h = 600;
  const y = window.top!.outerHeight / 2 + window.top!.screenY - h / 2;
  const x = window.top!.outerWidth / 2 + window.top!.screenX - w / 2;
  window.open(url, "_blank", `noopener,noreferrer,width=${w},height=${h},top=${y},left=${x}`);
}
