"use client";
// Learn shell: the Climb (level-first progression) is the DEFAULT; a toggle
// flips to Browse-by-domain (the original topic-first hub) for people who'd
// rather drill one axis. In the pixel theme both modes defer to the overworld
// map (LearnHub already handles that), so we only show the toggle in studio.
import { useEffect, useState } from "react";
import { t, type Locale } from "@/i18n/config";
import { ClimbView } from "./ClimbView";
import { LearnHub } from "./LearnHub";
import { RouteView } from "./RouteView";
import { ROUTES_ENABLED } from "@/lib/flags";

type Mode = "routes" | "climb" | "browse";

export function LearnShell({ locale }: { locale: Locale }) {
  // The Climb stays the default until the flag flips. Shipping the route model
  // behind a flag is what makes it reviewable without moving anyone's floor
  // mid-transformation — `climb.ts` and its 9 tests are untouched.
  const [mode, setMode] = useState<Mode>(ROUTES_ENABLED ? "routes" : "climb");
  const [pixel, setPixel] = useState(false);
  useEffect(() => {
    const check = () => setPixel(document.documentElement.getAttribute("data-theme") === "pixel");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // Pixel theme: LearnHub renders the overworld map — no climb/browse split.
  if (pixel) return <LearnHub locale={locale} />;

  return (
    <div className="wrap" style={{ paddingTop: "var(--s-10)", paddingBottom: "var(--s-16)" }}>
      <div className="ws-head" style={{ marginBottom: "var(--s-4)" }}>
        <h1 className="ws-title">
          <span className="code">{t({ en: "Learn", es: "Aprender" }, locale)}</span>
          {mode === "routes"
            ? t({ en: "Two progressions. Pick the one you are actually growing in.", es: "Dos progresiones. Elige la que de verdad estás creciendo." }, locale)
            : mode === "climb"
            ? t({ en: "Climb the ladder from where you stand.", es: "Sube la escalera desde donde estás." }, locale)
            : t({ en: "Browse every domain, your way.", es: "Explora cada dominio, a tu manera." }, locale)}
        </h1>
      </div>

      <div className="learn-modeseg" role="tablist" aria-label={t({ en: "Learn mode", es: "Modo de aprendizaje" }, locale)}>
        {ROUTES_ENABLED && (
          <button role="tab" aria-selected={mode === "routes"} onClick={() => setMode("routes")}>
            {t({ en: "Routes", es: "Rutas" }, locale)}
          </button>
        )}
        <button role="tab" aria-selected={mode === "climb"} onClick={() => setMode("climb")}>
          {t({ en: "The Climb", es: "La Subida" }, locale)}
        </button>
        <button role="tab" aria-selected={mode === "browse"} onClick={() => setMode("browse")}>
          {t({ en: "Browse by domain", es: "Explorar por dominio" }, locale)}
        </button>
      </div>

      {mode === "routes" ? <RouteView locale={locale} />
        : mode === "climb" ? <ClimbView locale={locale} />
        : <BrowseInline locale={locale} />}
    </div>
  );
}

// LearnHub renders its own .wrap; to avoid double padding when embedded, we just
// render it directly (its outer wrap is harmless — it centers content the same).
function BrowseInline({ locale }: { locale: Locale }) {
  return <LearnHub locale={locale} embedded />;
}
