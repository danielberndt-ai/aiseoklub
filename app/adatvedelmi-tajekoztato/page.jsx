import PrivacyPolicyView from "../../components/PrivacyPolicyView";

// Ez az oldal teljesen statikus, nincs benne interaktivitás – ezért szerver
// komponensként renderelődik, és a teljes szövege benne van a nyers HTML-ben.
export const metadata = {
  title: "Adatvédelmi Tájékoztató | AI SEO Klub",
  description:
    "Hogyan kezelem a személyes adataidat az AI-láthatósági audit használatakor. GDPR és Infotv. szerinti tájékoztató.",
  alternates: {
    canonical: "/adatvedelmi-tajekoztato",
  },
  openGraph: {
    type: "article",
    locale: "hu_HU",
    url: "https://audit.aiseoklub.hu/adatvedelmi-tajekoztato",
    title: "Adatvédelmi Tájékoztató | AI SEO Klub",
    description:
      "GDPR és Infotv. szerinti adatvédelmi tájékoztató az AI-láthatósági audithoz.",
  },
};

export default function Page() {
  return <PrivacyPolicyView />;
}
