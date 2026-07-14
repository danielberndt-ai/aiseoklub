import "./globals.css";

const SITE_URL = "https://audit.aiseoklub.hu";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "AI-láthatósági audit | AI SEO Klub",
  description:
    "Ingyenes AI-láthatósági audit: nézd meg, mennyire látja a weboldaladat a ChatGPT, a Claude, a Gemini, a Perplexity és a Google AI keresése.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "hu_HU",
    url: SITE_URL,
    siteName: "AI SEO Klub",
    title: "AI-láthatósági audit | AI SEO Klub",
    description:
      "Ingyenes AI-láthatósági audit: nézd meg, mennyire látja a weboldaladat a ChatGPT, a Claude, a Gemini, a Perplexity és a Google AI keresése.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI-láthatósági audit | AI SEO Klub",
    description:
      "Nézd meg, mennyire látja a weboldaladat a ChatGPT, a Claude, a Gemini és a Perplexity.",
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
