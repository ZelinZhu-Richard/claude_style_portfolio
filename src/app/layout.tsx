import type { Metadata } from "next";
import { Schibsted_Grotesk, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site-config";

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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

// JSON-LD Person (spec §12). Static, hand-authored fields only (no user input);
// still `<`-escaped below before injection, belt-and-suspenders.
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Zelin Zhu",
  alternateName: "Richard Zhu",
  jobTitle: "AI Safety Builder & Researcher",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Chapel Hill",
    addressRegion: "NC",
  },
  sameAs: [
    "https://github.com/ZelinZhu-Richard",
    "https://zelinzhu-richard.github.io",
  ],
  knowsLanguage: ["en", "zh"],
  url: SITE_URL,
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
        <script
          type="application/ld+json"
          // Escape `<` so a stray "</script>" inside a value can't break out of the
          // tag; none of the current strings contain it, but this keeps it safe if
          // sameAs/name fields ever pick up user-influenced content.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(personJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
