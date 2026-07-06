// Type surface for the ported pixel-art sprite engine (pixels.js).
export type SpriteOpts = { class?: string; style?: string; title?: string; svgAttr?: string; pal?: Record<string, string | null> };
export type NodeState = "locked" | "open" | "current" | "done" | "boss" | "special";
export function sprite(name: string, opts?: SpriteOpts): string;
export function node(opts?: SpriteOpts & { state?: NodeState }): string;
export function svgFromRows(rows: string[], opts?: SpriteOpts): string;
export function names(): string[];
export const PAL: Record<string, string | null>;
declare const _default: {
  PAL: Record<string, string | null>;
  svgFromRows: typeof svgFromRows;
  sprite: typeof sprite;
  node: typeof node;
  names: typeof names;
};
export default _default;
