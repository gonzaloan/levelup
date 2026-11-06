import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://levelup.skillrealm.dev"),
  title: { default: "AI Architect Field Guide", template: "%s · AI Architect Field Guide" },
  description: "The study guide and interview cheatsheet for Staff/Principal AI Architects: every concept explained simply, with diagrams, code, trade-offs and interview questions. EN/ES.",
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0b0e14" }, { media: "(prefers-color-scheme: light)", color: "#fafaf8" }],
};

// Runs before paint: theme (stored or system) and <html lang> from the URL, so there is no flash.
const BOOT = `(function(){var d=document.documentElement;try{var t=localStorage.getItem('fg.theme');if(!t)t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';d.dataset.theme=t}catch(e){d.dataset.theme='dark'}var l=location.pathname.split('/')[1];if(l==='en'||l==='es')d.lang=l})();`;

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
