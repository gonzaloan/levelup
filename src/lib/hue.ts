// One hue per domain, in domains.json order. Used as `--h` in oklch() colors (see globals.css).
const HUES = [255, 300, 195, 150, 45, 330, 85, 15, 125, 225, 60, 280];
export const hueFor = (index: number) => HUES[((index % HUES.length) + HUES.length) % HUES.length];
