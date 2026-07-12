import type { Metadata } from "next";
import {
  Inter, Space_Grotesk, DM_Serif_Display, JetBrains_Mono,
  Press_Start_2P, Pixelify_Sans,
} from "next/font/google";
import "./globals.css";
import { Sky } from "@/components/Sky";

const inter = Inter({
  subsets: ["latin"],
  variable: "--f-inter",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--f-grotesk",
  weight: ["500", "600", "700"],
  display: "swap",
});
// get-certified's display face: DM Serif Display — editorial, high-character.
const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--f-serif",
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--f-mono",
  weight: ["400", "600"],
  display: "swap",
});
// Pixel theme (Mario-3 overworld) faces.
const pressStart = Press_Start_2P({
  subsets: ["latin"],
  variable: "--f-press",
  weight: ["400"],
  display: "swap",
});
const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--f-pixelify",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "level-up — the second half of an engineering career",
  description:
    "The definitive guide to the part of engineering coding practice can't teach you: the judgment, scope, and leverage that move you from Senior toward Staff and Principal. Bilingual EN/ES.",
  metadataBase: new URL("https://levelup.skillrealm.dev"),
};

// Apply the saved theme before paint so there's no flash. Static-export safe.
const THEME_BOOT = `(function(){try{var t=localStorage.getItem('levelup.theme');if(t==='pixel')document.documentElement.setAttribute('data-theme','pixel');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body
        className={`${inter.variable} ${grotesk.variable} ${dmSerif.variable} ${mono.variable} ${pressStart.variable} ${pixelify.variable}`}
      >
        <Sky />
        {children}
      </body>
    </html>
  );
}
