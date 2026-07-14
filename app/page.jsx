import AuditClient from "../components/AuditClient";

// JSON-LD structured data. Szerveroldalon renderelődik, tehát az AI crawlerek
// és a keresők a nyers HTML-ben megtalálják – pontosan az, amit maga az audit is
// számonkér a vizsgált oldalakon.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://audit.aiseoklub.hu/#app",
      name: "AI-láthatósági audit",
      url: "https://audit.aiseoklub.hu/",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "hu",
      // Frissesség jelzése: az AI keresők előnyben részesítik az aktuális
      // tartalmat. Érdemes frissíteni, amikor érdemben változik az oldal.
      dateModified: "2026-07-14",
      description:
        "Ingyenes eszköz, amivel lemérheted, mennyire látja a weboldaladat a ChatGPT, a Claude, a Gemini, a Perplexity és a Google AI keresése.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "HUF",
      },
      publisher: {
        "@type": "Organization",
        name: "AI SEO Klub",
        url: "https://aiseoklub.hu",
      },
    },
    {
      "@type": "FAQPage",
      "@id": "https://audit.aiseoklub.hu/#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "Mit vizsgál az AI-láthatósági audit?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Az audit megnézi a robots.txt-t, az llms.txt-t és az agents.json-t, hogy mely AI crawlerek férnek hozzá az oldaladhoz. Emellett ellenőrzi az indexelhetőséget (noindex, canonical, sitemap), a schema markupot, a meta tageket és a tartalmi szerkezetet.",
          },
        },
        {
          "@type": "Question",
          name: "Használ AI-t az elemzés?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Nem. Minden ellenőrzés valódi lekérdezés: letöltjük a robots.txt-t, a HTML-t és a schemát. Ugyanaz az oldal mindig ugyanazt a pontszámot kapja.",
          },
        },
        {
          "@type": "Question",
          name: "Mennyibe kerül?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Az audit ingyenes. Naponta három auditot lehet indítani, és a részletes riportot emailben küldjük el.",
          },
        },
      ],
    },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AuditClient />
    </>
  );
}
