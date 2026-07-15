// api/scan.js
// -----------------------------------------------------------------------
// Vercel szerverfüggvény: elvégzi a tényleges AI-láthatósági ellenőrzést.
// Minden lépés determinisztikus, sima kód, NINCS benne AI-hívás.
//
// Amit csinál:
//  1. Kikényszeríti a napi ingyenes audit-limitet IP-cím alapján
//     (Upstash Redis-szel, ha be van állítva; enélkül memóriában, ami
//     csak egyetlen szerver-példányon belül megbízható – lásd lent).
//  2. Lekéri és elemzi a robots.txt-t, az llms.txt-t és az agents.json-t.
//  3. Lekéri a weboldal HTML-jét, és megnézi a schema markupot, a meta
//     tageket, a nyelvi jelölést és a tartalmi szerkezetet.
//
// Környezeti változók (Vercel Project Settings > Environment Variables):
//   UPSTASH_REDIS_REST_URL   (opcionális, de élesben erősen ajánlott)
//   UPSTASH_REDIS_REST_TOKEN (opcionális, de élesben erősen ajánlott)
// -----------------------------------------------------------------------

import * as cheerio from "cheerio";

const DAILY_LIMIT = 3;
const FETCH_TIMEOUT_MS = 6000;

const BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
  "Bytespider",
];

// ---------------------------------------------------------------------
// Segédfüggvény: időkorlátos fetch, hogy egy lassú/elérhetetlen oldal ne
// akassza meg örökre a kérést.
// ---------------------------------------------------------------------
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: "follow",
      // KRITIKUS: a Next.js alapértelmezésben CACHE-ELI a fetch hívásokat a
      // Route Handlerekben. Enélkül a szkenner a korábbi kérésből eltárolt,
      // elavult HTML-t elemezné – vagyis aki megjavítja az oldalát és újra
      // auditál, a régi eredményt kapná vissza. Az auditnak mindig friss
      // lekérdezést kell csinálnia.
      cache: "no-store",
      headers: {
        "User-Agent": "AISEOKlubAuditBot/1.0 (+https://aiseoklub.hu)",
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function safeText(url) {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return { ok: false, status: res.status, text: null };
    const text = await res.text();
    return { ok: true, status: res.status, text };
  } catch {
    return { ok: false, status: null, text: null };
  }
}

async function safeHead(url) {
  try {
    const res = await fetchWithTimeout(url, { method: "GET" }); // sok szerver a HEAD-et nem kezeli jól
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------
// robots.txt értelmezése: minden figyelt bothoz eldönti, hogy engedélyezett-e
// (leegyszerűsített, teljes-oldal szintű vizsgálat, nem elérési út szerinti)
// ---------------------------------------------------------------------
function parseRobotsTxt(text) {
  const groups = []; // { agents: string[], disallow: string[] }
  let current = null;

  text.split("\n").forEach((rawLine) => {
    const line = rawLine.split("#")[0].trim();
    if (!line) return;
    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || rest.length === 0) return;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      if (!current || current.disallow.length > 0 || current.started) {
        current = { agents: [], disallow: [], started: false };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (key === "disallow") {
      if (current) {
        current.started = true;
        if (value !== "") current.disallow.push(value);
        else current.disallow.push(""); // üres Disallow = mindent enged
      }
    }
  });

  function isBlocked(botName) {
    const lower = botName.toLowerCase();
    const ownGroup = groups.find((g) => g.agents.includes(lower));
    const wildcardGroup = groups.find((g) => g.agents.includes("*"));
    const group = ownGroup || wildcardGroup;
    if (!group) return false; // nincs rá vonatkozó szabály -> engedélyezett
    return group.disallow.some((rule) => rule === "/");
  }

  const sitemap = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^sitemap:/i.test(l))
    .map((l) => l.split(":").slice(1).join(":").trim());

  return { isBlocked, sitemap };
}

// ---------------------------------------------------------------------
// HTML elemzés: schema, meta, nyelv, szerkezet
// ---------------------------------------------------------------------
function analyzeHtml(html) {
  const $ = cheerio.load(html);

  // --- Schema markup (JSON-LD) ---
  const schemaTypes = new Set();
  let schemaFound = false;
  let dateModFound = false;

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw || !raw.trim()) return;
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : parsed["@graph"] ? parsed["@graph"] : [parsed];
      items.forEach((item) => {
        if (!item || typeof item !== "object") return;
        schemaFound = true;
        if (item["@type"]) {
          const t = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
          t.forEach((tt) => schemaTypes.add(String(tt)));
        }
        if (item.dateModified) dateModFound = true;
      });
    } catch {
      // Hibás JSON-LD: nem számoljuk bele, de nem is dobunk hibát emiatt.
    }
  });

  // --- Meta adatok ---
  const title = $("title").first().text().trim() || null;
  const descTag = $('meta[name="description"]').attr("content");
  const desc = typeof descTag === "string" && descTag.trim().length > 0;
  const descLen = desc ? descTag.trim().length : null;
  const htmlLang = $("html").attr("lang");
  const langHu = typeof htmlLang === "string" && htmlLang.trim().length > 0;
  const ogTags = $('meta[property^="og:"]').length > 0;

  // --- Indexelhetőség (meta robots tag) ---
  // A "robots" mellett a Google-specifikus "googlebot" direktívát is nézzük,
  // mert az felülírhatja az általánosat. A "none" a "noindex, nofollow"
  // rövidítése, ezt is kezeljük.
  const robotsMeta = ($('meta[name="robots"]').attr("content") || "").toLowerCase();
  const googlebotMeta = ($('meta[name="googlebot"]').attr("content") || "").toLowerCase();
  const robotsCombined = `${robotsMeta} ${googlebotMeta}`;
  const noindex = robotsCombined.includes("noindex") || robotsCombined.includes("none");
  const nofollow = robotsCombined.includes("nofollow") || robotsCombined.includes("none");
  const canonical = $('link[rel="canonical"]').attr("href") ? true : false;

  // --- Tartalmi szerkezet ---
  const h1Count = $("h1").length;
  const h2Count = $("h2").length;
  const hasLists = $("ul, ol, table").length > 0;
  const bodyText = $("body").text().toLowerCase();
  const faqBySchema = schemaTypes.has("FAQPage");
  const faqByText = /gyik|gyakran ismételt|faq/.test(bodyText);

  return {
    schemaData: {
      found: schemaFound,
      types: Array.from(schemaTypes),
      dateMod: dateModFound,
    },
    meta: {
      title,
      titleLen: title ? title.length : null,
      desc,
      descLen,
      langHu,
      og: ogTags,
    },
    index: {
      noindex,
      nofollow,
      canonical,
    },
    struct: {
      h1: h1Count > 0,
      hier: h1Count > 0 && h2Count > 0,
      faq: faqBySchema || faqByText,
      lists: hasLists,
    },
  };
}

// ---------------------------------------------------------------------
// Napi limit – Upstash Redis-szel, ha be van állítva; enélkül egyszerű,
// memóriabeli számláló. FONTOS: a memóriabeli változat csak addig
// megbízható, amíg egyetlen szerver-példány szolgálja ki a kéréseket –
// Vercelen több párhuzamos példány is indulhat, ezért éles használatra
// az Upstash (vagy Vercel KV) beállítása erősen ajánlott.
// ---------------------------------------------------------------------
const memoryCounter = new Map();

async function checkAndBumpDailyLimit(ip) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `aiseoklub:audit:${ip}:${today}`;

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    const res = await fetch(`${upstashUrl}/incr/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${upstashToken}` },
    });
    const data = await res.json();
    const count = data.result;
    if (count === 1) {
      // Első előfordulás ma: állítsunk rá 26 órás lejáratot, hogy időzóna-
      // eltérés esetén se maradjon örökre élve a kulcs.
      await fetch(`${upstashUrl}/expire/${encodeURIComponent(key)}/93600`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
    }
    return { allowed: count <= DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - count) };
  }

  // Fallback: memóriabeli számláló (csak fejlesztéshez / kisforgalmú éles használathoz).
  const current = memoryCounter.get(key) || 0;
  memoryCounter.set(key, current + 1);
  return { allowed: current + 1 <= DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - (current + 1)) };
}

// ---------------------------------------------------------------------
// Korlátlan hozzáférés titkos kulccsal. A kulcsot környezeti változóban
// tartjuk (BYPASS_KEY), sosem a kódban – a repó nyilvános. Aki ismeri a
// kulcsot, arra a napi limit nem vonatkozik.
//
// Ha a BYPASS_KEY nincs beállítva, a megkerülés teljesen ki van kapcsolva
// (üres kulccsal senki nem tud átjutni).
// ---------------------------------------------------------------------
function isUnlimited(key) {
  const secret = process.env.BYPASS_KEY;
  if (!secret) return false;
  return typeof key === "string" && key.length > 0 && key === secret;
}

function getClientIp(request) {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd && fwd.length > 0) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

// ---------------------------------------------------------------------
// Fő handler (Next.js Route Handler)
// ---------------------------------------------------------------------
// A cheerio Node API-kat használ, ezért a Node futtatókörnyezet kell.
// A dynamic beállítás azért fontos, mert a válasz kérésfüggő (IP-limit), tehát
// nem szabad build időben statikusan legenerálni.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return Response.json({ error: "missing_url" }, { status: 400 });
  }

  // SZÁNDÉKOS DÖNTÉS: az audit mindig a megadott domain FŐOLDALÁT vizsgálja
  // (origin), nem a konkrét aloldalt. Az aloldal-szkennelés növelné az eszköz
  // használhatóságát, de nem hozna több feliratkozót – ez pedig nem cél.
  // Ne "javítsd ki" teljes URL-re a jövőben. (Egyeztetve: 2026-07-15)
  let origin;
  try {
    origin = new URL(targetUrl).origin;
  } catch {
    return Response.json({ error: "invalid_url" }, { status: 400 });
  }

  // Érvényes titkos kulcs esetén a számlálót meg sem érintjük.
  const unlimited = isUnlimited(searchParams.get("key"));
  if (!unlimited) {
    const ip = getClientIp(request);
    const { allowed, remaining } = await checkAndBumpDailyLimit(ip);
    if (!allowed) {
      return Response.json({ error: "daily_limit_reached", remaining }, { status: 429 });
    }
  }

  const [robotsRes, llmsRes, agentsRes, agentsWellKnownRes, homepageRes] = await Promise.all([
    safeText(`${origin}/robots.txt`),
    safeText(`${origin}/llms.txt`),
    safeText(`${origin}/agents.json`),
    safeText(`${origin}/.well-known/agents.json`),
    safeText(origin),
  ]);

  // --- robots.txt + botonkénti státusz ---
  let robotsFound = robotsRes.ok;
  const bots = {};
  let sitemapFromRobots = [];
  if (robotsRes.ok && robotsRes.text) {
    const parsed = parseRobotsTxt(robotsRes.text);
    BOTS.forEach((bot) => {
      bots[bot] = parsed.isBlocked(bot) ? "blocked" : "allowed";
    });
    sitemapFromRobots = parsed.sitemap;
  } else {
    // Nincs robots.txt -> alapból semmi nincs korlátozva.
    BOTS.forEach((bot) => {
      bots[bot] = "allowed";
    });
  }

  // --- sitemap ellenőrzés: robots.txt hivatkozás vagy /sitemap.xml ---
  let sitemapOk = sitemapFromRobots.length > 0;
  if (!sitemapOk) {
    sitemapOk = await safeHead(`${origin}/sitemap.xml`);
  }

  // --- HTML elemzés ---
  let htmlAnalysis = {
    schemaData: { found: null, types: [], dateMod: null },
    meta: { title: null, titleLen: null, desc: null, descLen: null, langHu: null, og: null },
    index: { noindex: null, nofollow: null, canonical: null },
    struct: { h1: null, hier: null, faq: null, lists: null },
  };
  if (homepageRes.ok && homepageRes.text) {
    const analyzed = analyzeHtml(homepageRes.text);
    htmlAnalysis = analyzed;
  }

  const result = {
    unlimited, // a kliens ebből tudja, hogy ne növelje a helyi napi számlálót
    robots: { found: robotsFound, bots },
    llms: { found: llmsRes.ok },
    agents: { found: agentsRes.ok || agentsWellKnownRes.ok },
    index: {
      noindex: htmlAnalysis.index.noindex,
      nofollow: htmlAnalysis.index.nofollow,
      canonical: htmlAnalysis.index.canonical,
      sitemap: sitemapOk,
    },
    schemaData: htmlAnalysis.schemaData,
    meta: htmlAnalysis.meta,
    struct: htmlAnalysis.struct,
  };

  return Response.json(result, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
