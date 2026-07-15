import "./globals.css";

const SITE_URL = "https://audit.aiseoklub.hu";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Ingyenes AI-láthatósági audit weboldalakhoz | AI SEO Klub",
  description:
    "Ingyenes AI-láthatósági audit: nézd meg, mennyire látja a weboldaladat a ChatGPT, a Claude, a Gemini, a Perplexity és a Google AI keresése.",
  keywords: ["ai seo", "ai láthatóság"],
  // Explicit meta robots: engedélyezzük az indexelést és a linkkövetést, és a
  // Google-specifikus direktívákkal a gazdagabb megjelenítést is kérjük.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "hu_HU",
    url: SITE_URL,
    siteName: "AI SEO Klub",
    title: "Ingyenes AI-láthatósági audit weboldalakhoz | AI SEO Klub",
    description:
      "Ingyenes AI-láthatósági audit: nézd meg, mennyire látja a weboldaladat a ChatGPT, a Claude, a Gemini, a Perplexity és a Google AI keresése.",
    // JPEG és nem WebP: a LinkedIn a WebP megosztási képet gyakran nem jeleníti meg.
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Ha az AI nem lát téged, a vevőid sem fognak. – AI-láthatósági audit",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ingyenes AI-láthatósági audit weboldalakhoz | AI SEO Klub",
    description:
      "Nézd meg, mennyire látja a weboldaladat a ChatGPT, a Claude, a Gemini és a Perplexity.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
