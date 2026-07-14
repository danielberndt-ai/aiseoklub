// api/lead.js
// -----------------------------------------------------------------------
// Vercel szerverfüggvény. Két dolgot csinál, egymástól függetlenül:
//
//  1. Elküldi a személyre szabott AI-láthatósági riportot emailben (Resend).
//  2. Elmenti a feliratkozót és az eredményt egy Google Sheetbe, egy Apps
//     Script webhookon keresztül (nincs szükség service accountra).
//
// Mindkét rész opcionális: ha a hozzá tartozó környezeti változó hiányzik,
// azt a lépést kihagyja, és a felület ettől még hibátlanul működik.
//
// Környezeti változók (Vercel Project Settings > Environment Variables):
//   RESEND_API_KEY        – a Resend API kulcs (email küldéshez)
//   RESEND_FROM           – feladó, pl. "AI SEO Klub <audit@aiseoklub.hu>"
//   SHEETS_WEBHOOK_URL    – az Apps Script web app URL-je
//   SHEETS_WEBHOOK_SECRET – közös titok, hogy más ne tudjon a Sheetbe írni
// -----------------------------------------------------------------------

const CATEGORY_ORDER = ["crawl", "index", "schema", "meta", "struct"];

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Világos háttéren is jól olvasható, kontrasztos árnyalatok.
function scoreColor(s) {
  if (s === null || s === undefined) return "#6B7280";
  if (s >= 80) return "#0F9D6E";
  if (s >= 50) return "#E07B00";
  return "#DC2626";
}

// Budapesti idő, ember által olvasható és a Sheet által is értelmezhető
// formában: "2026-07-14 12:50:49".
function budapestTimestamp() {
  const parts = new Intl.DateTimeFormat("hu-HU", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

function scoreWord(s) {
  if (s === null || s === undefined) return "nem értékelhető";
  if (s >= 80) return "Kiváló";
  if (s >= 50) return "Közepes";
  return "Gyenge";
}

function headline(total) {
  if (total === null || total === undefined) return "Az oldalt nem sikerült teljesen kiértékelni.";
  if (total >= 80) return "Erős alap. Az AI keresők jó eséllyel látnak.";
  if (total >= 50) return "Látható vagy, de fontos pontokon veszítesz.";
  return "Az AI keresők most jórészt vakok az oldaladra.";
}

// ---------------------------------------------------------------------
// A riport-email HTML-je. Táblázatos szerkezet és inline stílusok, hogy a
// levelezőkliensek (Gmail, Outlook, Apple Mail) is jól jelenítsék meg.
// ---------------------------------------------------------------------
function buildEmailHtml({ url, score, details }) {
  const cats = Array.isArray(details) ? details : [];

  const catRows = cats
    .map((c) => {
      const s = c.score;
      const col = scoreColor(s);
      const width = typeof s === "number" ? Math.max(0, Math.min(100, s)) : 0;
      return `
        <tr>
          <td style="padding:14px 0 6px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font:600 15px/1.4 Arial,Helvetica,sans-serif;color:#1B2320;">${escapeHtml(c.name)}</td>
                <td align="right" style="font:700 15px/1.4 Arial,Helvetica,sans-serif;color:${col};">
                  ${typeof s === "number" ? s + "/100" : "n/a"}
                </td>
              </tr>
            </table>
            <div style="height:8px;background:#E9ECEF;border-radius:99px;margin-top:8px;">
              <div style="height:8px;width:${width}%;background:${col};border-radius:99px;font-size:0;line-height:0;">&nbsp;</div>
            </div>
          </td>
        </tr>`;
    })
    .join("");

  // A hiányzó tételek listája – ez adja az email valódi értékét.
  const problems = [];
  cats.forEach((c) => {
    (c.findings || []).forEach((f) => {
      if (f.ok === false) problems.push(`${c.name}: ${f.label}`);
    });
  });

  const problemsHtml = problems.length
    ? `
      <tr>
        <td style="padding:26px 0 0;">
          <div style="font:700 16px/1.4 Arial,Helvetica,sans-serif;color:#1B2320;margin-bottom:10px;">
            Amin javítani érdemes (${problems.length} tétel)
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${problems
              .map(
                (p) => `
              <tr>
                <td style="padding:7px 0;border-bottom:1px solid #E9ECEF;font:400 14px/1.5 Arial,Helvetica,sans-serif;color:#4B5563;">
                  <span style="color:#DC2626;font-weight:700;">✕</span>&nbsp; ${escapeHtml(p)}
                </td>
              </tr>`
              )
              .join("")}
          </table>
        </td>
      </tr>`
    : `
      <tr>
        <td style="padding:26px 0 0;font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#0F9D6E;">
          Nem találtunk hiányzó tételt – ez erős eredmény.
        </td>
      </tr>`;

  const col = scoreColor(score);

  return `<!doctype html>
<html lang="hu">
<body style="margin:0;padding:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="font:900 17px/1 Arial,Helvetica,sans-serif;padding-bottom:22px;">
              <span style="color:#FF8C00;">AI SEO</span> <span style="color:#1B2320;">KLUB</span>
              <span style="color:#E07B00;font:400 11px/1 Arial,Helvetica,sans-serif;letter-spacing:2px;">&nbsp;&nbsp;AI-LÁTHATÓSÁGI AUDIT</span>
            </td>
          </tr>
          <tr>
            <td style="font:400 13px/1.5 Arial,Helvetica,sans-serif;color:#6B7280;padding-bottom:4px;">
              Ellenőrzött oldal
            </td>
          </tr>
          <tr>
            <td style="font:400 14px/1.5 Arial,Helvetica,sans-serif;color:#E07B00;padding-bottom:22px;word-break:break-all;">
              ${escapeHtml(url || "")}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:10px 0 6px;">
              <div style="font:900 52px/1 Arial,Helvetica,sans-serif;color:${col};">
                ${typeof score === "number" ? score : "–"}<span style="font-size:22px;color:#9CA3AF;">/100</span>
              </div>
              <div style="font:600 14px/1.4 Arial,Helvetica,sans-serif;color:${col};padding-top:6px;">
                ${scoreWord(score)}
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="font:700 18px/1.35 Arial,Helvetica,sans-serif;color:#1B2320;padding:14px 0 8px;">
              ${escapeHtml(headline(score))}
            </td>
          </tr>
          <tr>
            <td style="padding-top:16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${catRows}
              </table>
            </td>
          </tr>
          ${problemsHtml}

          <!-- CTA -->
          <tr>
            <td style="padding:32px 0 0;">
              <div style="font:700 17px/1.5 Arial,Helvetica,sans-serif;color:#1B2320;">
                Ha azt akarod, hogy az AI-ok jobban lássanak, akkor csatlakozz az
                <a href="https://aiseoklub.hu/" style="color:#FF8C00;text-decoration:none;font-weight:700;">AI SEO Klubhoz</a>.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0 0;font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#4B5563;">
              Ha nincs időd foglalkozni ezzel, írj egy emailt nekem és beszéljünk a dologról.
              <a href="mailto:danielberndt@aiseoklub.hu" style="color:#E07B00;text-decoration:none;">danielberndt@aiseoklub.hu</a>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 0 0;">
              <div style="border-top:1px solid #E9ECEF;padding-top:16px;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#9CA3AF;">
                Az eredmények tájékoztató jellegűek; az AI keresők működése és a szabványok folyamatosan változnak.
                Az elemzés a nyilvánosan elérhető jelekből dolgozik.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-top:14px;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#9CA3AF;">
              AI SEO Klub · <a href="https://danielberndt.com/" style="color:#9CA3AF;">Daniel Berndt</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------
// Riport-email küldése Resenden keresztül
// ---------------------------------------------------------------------
async function sendReportEmail({ email, url, score, details }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) return { sent: false, reason: "not_configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `AI-láthatósági riport: ${typeof score === "number" ? score + "/100" : "eredmény"}`,
        html: buildEmailHtml({ url, score, details }),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Resend hiba:", res.status, body);
      return { sent: false, reason: "resend_error" };
    }
    return { sent: true };
  } catch (e) {
    console.error("Resend hívási hiba:", e);
    return { sent: false, reason: "network_error" };
  }
}

// ---------------------------------------------------------------------
// Feliratkozó mentése Google Sheetbe (Apps Script webhook)
// ---------------------------------------------------------------------
async function saveToSheet({ email, url, score, categories }) {
  const webhookUrl = process.env.SHEETS_WEBHOOK_URL;
  const secret = process.env.SHEETS_WEBHOOK_SECRET;
  if (!webhookUrl || !secret) return { saved: false, reason: "not_configured" };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        timestamp: budapestTimestamp(),
        email,
        url: url || "",
        score: typeof score === "number" ? score : "",
        crawl: categories?.crawl ?? "",
        index: categories?.index ?? "",
        schema: categories?.schema ?? "",
        meta: categories?.meta ?? "",
        struct: categories?.struct ?? "",
      }),
    });
    if (!res.ok) {
      console.error("Sheets webhook hiba:", res.status);
      return { saved: false, reason: "sheet_error" };
    }
    return { saved: true };
  } catch (e) {
    console.error("Sheets webhook hívási hiba:", e);
    return { saved: false, reason: "network_error" };
  }
}

// ---------------------------------------------------------------------
// Fő handler
// ---------------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { email, url, score, categories, details } = req.body || {};

  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }

  // A két lépés egymástól függetlenül fut: ha az email küldése elhasal, a
  // feliratkozó akkor is bekerül a Sheetbe, és fordítva.
  const [mail, sheet] = await Promise.all([
    sendReportEmail({ email, url, score, details }),
    saveToSheet({ email, url, score, categories }),
  ]);

  // A "simulated" jelzést a felület használja: akkor igaz, ha az email
  // küldése nincs beállítva, tehát valójában nem ment ki riport.
  res.status(200).json({
    ok: mail.sent || sheet.saved,
    simulated: !mail.sent,
    emailSent: mail.sent,
    sheetSaved: sheet.saved,
  });
}
