import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://levelup.skillrealm.dev"),
  title: { default: "Staff Engineer & AI Architect Field Guide", template: "%s · levelup" },
  description: "Study guide and interview prep for Staff/Principal engineers and AI architects: coding patterns, system design, distributed systems, AI systems and leadership. Diagrams, code, practice. EN/ES.",
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0b0e14" }, { media: "(prefers-color-scheme: light)", color: "#fafaf8" }],
};

// Runs before paint: theme (stored or system) and <html lang> from the URL, so there is no flash.
const BOOT = `(function(){var d=document.documentElement;try{var t=localStorage.getItem('fg.theme');if(!t)t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';d.dataset.theme=t}catch(e){d.dataset.theme='dark'}var l=location.pathname.split('/')[1];if(l==='en'||l==='es')d.lang=l;try{if(localStorage.getItem('fg.study.v1'))d.dataset.returning='1'}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
