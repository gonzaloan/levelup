import type { Metadata } from "next";
import { Inter, Space_Grotesk, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sky } from "@/components/Sky";

const inter = Inter({
  subsets: ["latin"],
  variable: "--f-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--f-grotesk",
  weight: ["500", "600", "700"],
  display: "swap",
});
const instrument = Instrument_Serif({
  subsets: ["latin"],
  variable: "--f-instrument",
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

export const metadata: Metadata = {
  title: "level-up — the second half of an engineering career",
  description:
    "The definitive guide to the part of engineering coding practice can't teach you: the judgment, scope, and leverage that move you from Senior toward Staff and Principal. Bilingual EN/ES.",
  metadataBase: new URL("https://levelup.gonzalo-munoz.com"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body
        className={`${inter.variable} ${grotesk.variable} ${instrument.variable} ${mono.variable}`}
        style={
          {
            // Bind next/font CSS variables to the design-system font tokens.
            ["--font-body" as string]: "var(--f-inter), system-ui, sans-serif",
            ["--font-head" as string]: "var(--f-grotesk), system-ui, sans-serif",
            ["--font-display" as string]: "var(--f-instrument), Georgia, serif",
            ["--font-mono" as string]: "var(--f-mono), ui-monospace, monospace",
          } as React.CSSProperties
        }
      >
        <Sky />
        {children}
      </body>
    </html>
  );
}
