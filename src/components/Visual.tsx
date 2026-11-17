// Static SVG visuals rendered at build time (server components only): concept illustrations and
// the logos of the tools and companies a concept mentions.
import type { Concept, Locale } from "@/lib/types";
import { illustrationOf, stackOf, svgOf, type Svg } from "@/lib/visuals";

export function InlineSvg({ svg, size, className, label }: { svg: Svg; size: number; className?: string; label?: string }) {
  return (
    <svg viewBox={svg.viewBox} width={size} height={size} className={[className, svg.mono && "mono"].filter(Boolean).join(" ") || undefined} role={label ? "img" : undefined}
      aria-label={label} aria-hidden={label ? undefined : true} dangerouslySetInnerHTML={{ __html: svg.body }} />
  );
}

export function Illustration({ id, size, className }: { id: string; size: number; className?: string }) {
  const svg = illustrationOf(id);
  return svg ? <InlineSvg svg={svg} size={size} className={`ill${className ? ` ${className}` : ""}`} /> : null;
}

/** "Stack" (tools) and "In the real world" (companies) the concept mentions, as logo chips. */
export function StackRow({ concept, locale }: { concept: Concept; locale: Locale }) {
  const { tech, companies } = stackOf(concept);
  if (!tech.length && !companies.length) return null;
  const chip = (x: { id: string; name: string; icon: string }) => {
    const svg = svgOf(x.icon);
    return <li key={x.id} className="stack-chip">{svg && <InlineSvg svg={svg} size={16} />}{x.name}</li>;
  };
  return (
    <div className="stack-row">
      {tech.length > 0 && <div><span className="stack-label">Stack</span><ul>{tech.map(chip)}</ul></div>}
      {companies.length > 0 && <div><span className="stack-label">{locale === "es" ? "En la vida real" : "In the real world"}</span><ul>{companies.map(chip)}</ul></div>}
    </div>
  );
}
