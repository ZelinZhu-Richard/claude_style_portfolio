import type { Metadata } from "next";
import { Schibsted_Grotesk, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Display: chapter headlines, hero name, giant display type.
const schibstedGrotesk = Schibsted_Grotesk({
  variable: "--font-schibsted-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

// Body copy + the one italicized emotive word per headline (the signature move).
const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

// HUD %, audit-log motifs, footer meta, chapter labels.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

// Full SEO (OG image, JSON-LD, description) lands in a later task.
export const metadata: Metadata = {
  title: "Zelin (Richard) Zhu — AI Safety Builder & Researcher",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body
        className={`${schibstedGrotesk.variable} ${sourceSerif4.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
