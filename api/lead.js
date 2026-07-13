// api/lead.js
// -----------------------------------------------------------------------
// Vercel szerverfüggvény: a feliratkozót és az audit eredményét továbbítja
// a MailerLite-nak. A MAILERLITE_API_KEY sosem kerül a böngészőbe, csak
// itt, a szerveren, environment variable-ként létezik.
//
// Környezeti változók (Vercel Project Settings > Environment Variables):
//   MAILERLITE_API_KEY   (kötelező éles email-küldéshez)
//   MAILERLITE_GROUP_ID   (opcionális: melyik MailerLite csoportba kerüljön a feliratkozó)
//
// MailerLite oldalon előre létrehozandó egyéni mezők (Settings > Fields),
// hogy a sablonban merge tagként használhatók legyenek:
//   audit_url            (szöveg – az ellenőrzött weboldal címe)
//   audit_score           (szám – összpontszám, 0-100)
//   audit_score_crawl      (szám – AI crawler hozzáférés kategória pontszáma)
//   audit_score_index      (szám – indexelhetőség kategória pontszáma)
//   audit_score_schema     (szám – strukturált adat kategória pontszáma)
//   audit_score_meta       (szám – meta és nyelvi beállítások kategória pontszáma)
//   audit_score_struct     (szám – tartalmi szerkezet kategória pontszáma)
// -----------------------------------------------------------------------

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { email, url, score, categories } = req.body || {};

  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }

  const apiKey = process.env.MAILERLITE_API_KEY;

  if (!apiKey) {
    // Nincs beállítva MailerLite kulcs: szimuláljuk a sikeres feliratkozást,
    // hogy a felület ettől függetlenül tesztelhető legyen.
    res.status(200).json({ ok: true, simulated: true });
    return;
  }

  const fields = {
    audit_url: url || "",
    audit_score: typeof score === "number" ? score : null,
    audit_score_crawl: categories?.crawl ?? null,
    audit_score_index: categories?.index ?? null,
    audit_score_schema: categories?.schema ?? null,
    audit_score_meta: categories?.meta ?? null,
    audit_score_struct: categories?.struct ?? null,
  };

  const payload = {
    email,
    fields,
    ...(process.env.MAILERLITE_GROUP_ID ? { groups: [process.env.MAILERLITE_GROUP_ID] } : {}),
  };

  try {
    const mlRes = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!mlRes.ok) {
      const errBody = await mlRes.text().catch(() => "");
      console.error("MailerLite hiba:", mlRes.status, errBody);
      res.status(200).json({ ok: false, simulated: false, error: "mailerlite_error" });
      return;
    }

    res.status(200).json({ ok: true, simulated: false });
  } catch (e) {
    console.error("MailerLite hívási hiba:", e);
    res.status(200).json({ ok: false, simulated: false, error: "network_error" });
  }
}
