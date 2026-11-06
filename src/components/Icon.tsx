// Hand-drawn 24px stroke icons (no icon dependency).
const P: Record<string, string> = {
  cpu: "M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM9.5 9.5h5v5h-5z",
  message: "M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM7.5 9.5h9M7.5 12.5h6",
  search: "M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.5 15.5 20 20",
  bot: "M12 3v3M7 7h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3zM9 12v1.5M15 12v1.5M9.5 16h5",
  gauge: "M4.5 17a8.5 8.5 0 1 1 15 0M12 13l3.5-4.5M12 13a1 1 0 1 0 0 .01",
  flask: "M9.5 3h5M10 3v6l-5.2 9a1.5 1.5 0 0 0 1.3 2.3h11.8a1.5 1.5 0 0 0 1.3-2.3L14 9V3M7.2 15h9.6",
  zap: "M13 2 4.5 13.5H12L11 22l8.5-11.5H12z",
  shield: "M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6zM9 12l2 2 4-4",
  cycle: "M20 11a8 8 0 0 0-14.5-4.5M4 4v3.5h3.5M4 13a8 8 0 0 0 14.5 4.5M20 20v-3.5h-3.5",
  network: "M12 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM5 16.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM19 16.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM12 7.5v4.5M12 12l-6 4.7M12 12l6 4.7",
  blueprint: "M3 5h18v14H3zM3 9h18M8 9v10M12 13h5M12 16h3",
  compass: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5z",
  sun: "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
  globe: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM3 12h18M12 3c2.5 2.7 3.5 5.7 3.5 9s-1 6.3-3.5 9c-2.5-2.7-3.5-5.7-3.5-9s1-6.3 3.5-9z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  copy: "M9 9h10v11H9zM5 15V4h10",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  book: "M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM17 7h2v13M8 17h9",
  cards: "M7 4h12v14H7zM4 7v13h12",
  mic: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3",
  list: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  expand: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  close: "M6 6l12 12M18 6 6 18",
  shuffle: "M4 7h3.5c4 0 5 10 9 10H20M17 14l3 3-3 3M4 17h3.5c1.4 0 2.4-1.2 3.2-2.8M13.3 9.8c.8-1.6 1.8-2.8 3.2-2.8H20M17 4l3 3-3 3",
  printer: "M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
};

export function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={P[name] ?? P.book} />
    </svg>
  );
}
