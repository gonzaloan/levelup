// Per-domain hue for oklch() colors (see globals.css), spread evenly around the wheel in syllabus
// order — derived from the number of domains, so adding a domain never collides two colors.
import { domainCount } from "./content";

export const hueFor = (index: number) => Math.round((205 + (index * 360) / Math.max(1, domainCount())) % 360);
