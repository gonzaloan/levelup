// A concept's illustration as a lazy <img> (for client components; server pages inline the SVG).
// The files are written by the content build to public/ill/<concept-id>.svg.
export function Ill({ id, size, className }: { id: string; size: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- static export: next/image adds nothing here
  return <img src={`/ill/${id}.svg`} width={size} height={size} alt="" loading="lazy" decoding="async" className={`ill${className ? ` ${className}` : ""}`} />;
}
