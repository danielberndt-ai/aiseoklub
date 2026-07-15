"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

// =====================================================================
// AI SEO KLUB – AI-láthatósági audit
// Vercel-kész React alkalmazás. Sötét minimál dizájn, narancs #FF8C00.
// ---------------------------------------------------------------------
// A szkennelést a saját /api/scan Vercel függvény végzi, determinisztikus
// ellenőrzésekkel (robots.txt, llms.txt, agents.json, schema, meta,
// tartalmi szerkezet), AI-hívás nélkül. A napi limitet szerveroldalon,
// IP-cím alapján az /api/scan kényszeríti ki. A lead a /api/lead
// végponton keresztül kerül a MailerLite listába.
// =====================================================================

const CONFIG = {
  DAILY_LIMIT: 3,             // Napi ingyenes auditok száma (a szerver is ezt kényszeríti ki)
  SHOW_FIX_TIPS: false,       // Javítási tippek: a fizetős riport része lesz
  SHOW_UPSELL: false,         // Upsell blokk: később élesítjük

  // --- Süti-hozzájárulás és mérőkódok ---
  // TODO (éles): töltsd ki a saját azonosítóiddal. Amíg üresek, a bannerben
  // adott hozzájárulás után sem töltődik be semmilyen mérőkód.
  //
  // A kategóriák elkülönítése szándékos: a NAIH álláspontja szerint a
  // hozzájárulást célonként, külön-külön kell beszerezni, nem lehet egyetlen
  // gombbal mindenre.
  GOOGLE_ANALYTICS_ID: "", // "statisztika" kategória, pl. "G-XXXXXXXXXX"
  GOOGLE_PIXEL_ID: "",     // "marketing" kategória (Google Ads), pl. "AW-XXXXXXXXX"
  META_PIXEL_ID: "",       // "marketing" kategória, pl. "1234567890123456"

  PRIVACY_POLICY_URL: "/adatvedelmi-tajekoztato",
  COOKIE_POLICY_URL: "/adatvedelmi-tajekoztato#sutik",
};

const T = {
  bg: "#042f2e",
  glass: "rgba(255,255,255,0.04)",
  glassStrong: "rgba(255,255,255,0.055)",
  line: "rgba(255,255,255,0.08)",
  orange: "#FF8C00",
  orangeSoft: "rgba(255,140,0,0.12)",
  orangeLine: "rgba(255,140,0,0.32)",
  // Sötét szöveg a narancs gombokon – a fehérrel szemben ez megfelel a
  // WCAG AA kontrasztnak (#FF8C00 hátéren kb. 6.7:1).
  onOrange: "#1B2320",
  green: "#46D19E",
  greenSoft: "rgba(70,209,158,0.12)",
  red: "#FF6B6B",
  redSoft: "rgba(255,107,107,0.10)",
  gray: "#8B8B93",
  graySoft: "rgba(139,139,147,0.14)",
  text: "#F6F6F5",
  sub: "rgba(246,246,245,0.62)",
  faint: "rgba(246,246,245,0.36)",
  // A footer szövegeihez – fényesebb, hogy megfeleljen a kontraszt-elvárásnak
  // (a sötét háttéren kb. 7:1), de nem narancs.
  footerText: "rgba(246,246,245,0.72)",
};

const FONT_DISPLAY = "var(--font-display), 'Inter Tight', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY_WEIGHT = 900;
const FONT_BODY = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const FONT_MONO = "var(--font-mono), 'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace";

const glassCard = {
  background: T.glass,
  border: `1px solid ${T.line}`,
  borderRadius: 20,
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
};

const BOTS = [
  { id: "GPTBot", note: "OpenAI, tanítás" },
  { id: "OAI-SearchBot", note: "ChatGPT keresés" },
  { id: "ChatGPT-User", note: "ChatGPT böngészés" },
  { id: "ClaudeBot", note: "Anthropic" },
  { id: "PerplexityBot", note: "Perplexity" },
  { id: "Google-Extended", note: "Gemini, AI Mode" },
  { id: "CCBot", note: "Common Crawl" },
  { id: "Bytespider", note: "ByteDance" },
];

const SCAN_STEPS = [
  "robots.txt letöltése és AI crawler szabályok olvasása",
  "llms.txt keresése",
  "Indexelhetőség: noindex, canonical, sitemap.xml",
  "Schema markup (JSON-LD) felderítése",
  "Meta tagek és nyelvi beállítások",
  "Tartalmi szerkezet: címsorok, FAQ, listák",
  "Pontszámok kiszámítása",
];

// A szkennelő animáció mindig végigfut, hogy alapos átvizsgálás benyomását
// keltse. A tényleges API-válasz gyakran ennél gyorsabb; ilyenkor megvárjuk a
// hátralévő időt, mielőtt megjelenítjük az eredményt.
const MIN_SCAN_MS = 5000;
const SCAN_STEP_MS = Math.floor(MIN_SCAN_MS / SCAN_STEPS.length);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ------------------------------------------------------------------
// Lead beküldés – a saját Vercel API route-ot hívja (api/lead.js),
// ami a szerveren, saját MailerLite API kulccsal küldi tovább az adatot.
// ------------------------------------------------------------------
async function submitLead({ email, url, score, categories, details }) {
  try {
    const res = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, url, score, categories, details }),
    });
    if (!res.ok) throw new Error("lead-failed");
    return await res.json();
  } catch (e) {
    console.error("Lead submit error:", e);
    // A riport-küldés hibája nem akasztja meg az audit megjelenítését, csak
    // jelezzük, hogy a MailerLite-hívás nem sikerült.
    return { ok: false, simulated: false, email, url };
  }
}

function normalizeUrl(raw) {
  let u = (raw || "").trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    const parsed = new URL(u);
    if (!parsed.hostname.includes(".")) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function prettyUrl(href) {
  try {
    const u = new URL(href);
    let p = u.hostname.replace(/^www\./, "") + (u.pathname === "/" ? "" : u.pathname);
    return p.replace(/\/$/, "");
  } catch {
    return href;
  }
}

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((e || "").trim());
}

// ------------------------------------------------------------------
// Napi limit – kliensoldali számláló a gyors UX-hez (naponta nullázódik).
// A tényleges, megkerülhetetlen korlátot a szerver (api/scan.js) kényszeríti
// ki IP-cím alapján, ez itt csak a felhasználói élményt szolgálja.
// ------------------------------------------------------------------
const DAILY_COUNT_KEY = "aiseoklub_audit_count_v1";

function readTodayCount() {
  try {
    const raw = localStorage.getItem(DAILY_COUNT_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (parsed.date !== today) return 0;
    return parsed.count || 0;
  } catch {
    return 0;
  }
}

function bumpTodayCount() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const current = readTodayCount();
    localStorage.setItem(DAILY_COUNT_KEY, JSON.stringify({ date: today, count: current + 1 }));
  } catch {
    // Ha nincs localStorage, a szerveroldali IP-alapú limit akkor is érvényben marad.
  }
}

// ------------------------------------------------------------------
// Süti-hozzájárulás kezelése és a mérőkódok feltételes betöltése
// ------------------------------------------------------------------
// A tároló verziószáma azért v2, mert a hozzájárulás szerkezete megváltozott
// (kategóriánkénti bontás). A régi, v1-es döntéseket nem vesszük érvényesnek:
// azoknál újra megkérdezzük a látogatót, kategóriánként.
const CONSENT_STORAGE_KEY = "aiseoklub_cookie_consent_v2";

// A "feltétlenül szükséges" kategória nem kapcsolható és nem is igényel
// hozzájárulást, ezért nem is tároljuk külön.
const EMPTY_CONSENT = { analytics: false, marketing: false };

function readStoredConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.analytics !== "boolean" || typeof parsed?.marketing !== "boolean") return null;
    return { analytics: parsed.analytics, marketing: parsed.marketing };
  } catch {
    return null;
  }
}

function writeStoredConsent({ analytics, marketing }) {
  try {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ analytics, marketing, decidedAt: new Date().toISOString() })
    );
  } catch {
    // A localStorage nem minden esetben elérhető (pl. inkognitó mód, letiltott sütik).
    // Ilyenkor a döntés csak az adott munkamenetre érvényes, ez nem hiba.
  }
}

// ------------------------------------------------------------------
// Mérőkód-betöltés. FONTOS: ezek a függvények KIZÁRÓLAG a látogató
// kifejezett, kategóriánkénti hozzájárulása után futhatnak le. Az oldal
// betöltésekor semmilyen mérőkód nem települ (előzetes hozzájárulás elve).
// ------------------------------------------------------------------
function ensureGtag() {
  if (window.__aiseoklubGtagInit) return;
  window.__aiseoklubGtagInit = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
}

function injectGtagScript(id) {
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);
}

// "Statisztika / analitika" kategória
function loadAnalytics() {
  if (typeof window === "undefined") return;
  if (!CONFIG.GOOGLE_ANALYTICS_ID || window.__aiseoklubAnalyticsLoaded) return;
  window.__aiseoklubAnalyticsLoaded = true;
  ensureGtag();
  injectGtagScript(CONFIG.GOOGLE_ANALYTICS_ID);
  window.gtag("config", CONFIG.GOOGLE_ANALYTICS_ID);
}

// "Marketing" kategória: Google Pixel (Ads) és Meta Pixel
function loadMarketingPixels() {
  if (typeof window === "undefined") return;

  if (CONFIG.GOOGLE_PIXEL_ID && !window.__aiseoklubGooglePixelLoaded) {
    window.__aiseoklubGooglePixelLoaded = true;
    ensureGtag();
    injectGtagScript(CONFIG.GOOGLE_PIXEL_ID);
    window.gtag("config", CONFIG.GOOGLE_PIXEL_ID);
  }

  if (CONFIG.META_PIXEL_ID && !window.__aiseoklubMetaPixelLoaded) {
    window.__aiseoklubMetaPixelLoaded = true;
    /* eslint-disable */
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
    window.fbq("init", CONFIG.META_PIXEL_ID);
    window.fbq("track", "PageView");
  }
}

function applyConsent(consent) {
  if (consent?.analytics) loadAnalytics();
  if (consent?.marketing) loadMarketingPixels();
}

// ------------------------------------------------------------------
// A tényleges szkennelést a saját Vercel API route végzi (api/scan.js):
// robots.txt, llms.txt, agents.json, schema, meta és szerkezet-ellenőrzés,
// determinisztikusan, AI nélkül. A daily limit is itt, szerveroldalon dől el.
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// Korlátlan hozzáférés titkos kulccsal.
// Használat: egyszer nyisd meg az oldalt így -> /?key=A_TITKOS_KULCS
// A kulcs ekkor a böngésződbe mentődik, a címsorból pedig azonnal eltűnik,
// hogy egy képernyőképpel vagy megosztott linkkel se szivárogjon ki.
// Onnantól ezen a gépen a napi limit nem vonatkozik rád.
// ------------------------------------------------------------------
const BYPASS_KEY_STORAGE = "aiseoklub_bypass_key";

function readBypassKey() {
  // Szerveroldali rendereléskor nincs window – ilyenkor üres kulcsot adunk.
  if (typeof window === "undefined") return "";
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("key");
    if (fromUrl) {
      localStorage.setItem(BYPASS_KEY_STORAGE, fromUrl);
      params.delete("key");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
      return fromUrl;
    }
    return localStorage.getItem(BYPASS_KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

async function runRemoteScan(targetUrl, key) {
  const res = await fetch(
    `/api/scan?url=${encodeURIComponent(targetUrl)}&key=${encodeURIComponent(key || "")}`
  );
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    const err = new Error("daily-limit-reached");
    err.code = "DAILY_LIMIT";
    err.remaining = body.remaining ?? 0;
    throw err;
  }
  if (!res.ok) throw new Error("scan-failed");
  return await res.json();
}

// ------------------------------------------------------------------
// Pontozás – determinisztikus, élesben változtatás nélkül átvihető
// ------------------------------------------------------------------
function buildCategories(r) {
  const g = (fn, fallback = null) => {
    try {
      const v = fn();
      return v === undefined ? fallback : v;
    } catch {
      return fallback;
    }
  };

  const botState = (id) => {
    const v = g(() => r.robots.bots[id]);
    if (v === "allowed") return true;
    if (v === "blocked") return false;
    return null;
  };

  const titleLen = g(() => r.meta.titleLen);
  const descLen = g(() => r.meta.descLen);

  return [
    {
      key: "crawl",
      name: "AI crawler hozzáférés",
      weight: 25,
      findings: [
        { label: "robots.txt elérhető", ok: g(() => r.robots.found) },
        ...BOTS.map((b) => ({ label: b.id + " engedélyezve", ok: botState(b.id), bot: true })),
        { label: "llms.txt megléte", ok: g(() => r.llms.found) },
        { label: "agents.json megléte", ok: g(() => r.agents.found) },
      ],
    },
    {
      key: "index",
      name: "Indexelhetőség",
      weight: 20,
      findings: [
        { label: "Nincs noindex tiltás", ok: g(() => (r.index.noindex === null ? null : !r.index.noindex)) },
        { label: "Nincs nofollow tiltás", ok: g(() => (r.index.nofollow == null ? null : !r.index.nofollow)) },
        { label: "Canonical beállítva", ok: g(() => r.index.canonical) },
        { label: "sitemap.xml elérhető", ok: g(() => r.index.sitemap) },
      ],
    },
    {
      key: "schema",
      name: "Schema markup",
      weight: 20,
      findings: [
        { label: "JSON-LD structured data", ok: g(() => r.schemaData.found) },
        {
          label: "Felismert típusok",
          ok: g(() => ((r.schemaData.types || []).length > 0 ? true : r.schemaData.found === null ? null : false)),
          detail: (g(() => r.schemaData.types, []) || []).join(", ") || null,
        },
        { label: "Frissesség jelölve (dateModified)", ok: g(() => r.schemaData.dateMod) },
      ],
    },
    {
      key: "meta",
      name: "Meta és nyelvi beállítások",
      weight: 15,
      findings: [
        {
          label: "Title megfelelő hosszal",
          ok: titleLen == null ? null : titleLen >= 15 && titleLen <= 65,
          detail: titleLen != null ? titleLen + " karakter" : null,
        },
        {
          label: "Meta description megfelelő hosszal",
          ok: g(() => (r.meta.desc === false ? false : descLen == null ? r.meta.desc : descLen >= 50 && descLen <= 165)),
          detail: descLen != null ? descLen + " karakter" : null,
        },
        { label: "Használt nyelv jelölve (lang)", ok: g(() => r.meta.langHu) },
        { label: "Open Graph tagek", ok: g(() => r.meta.og) },
      ],
    },
    {
      key: "struct",
      name: "Tartalmi szerkezet",
      weight: 20,
      findings: [
        { label: "H1 főcím megvan", ok: g(() => r.struct.h1) },
        { label: "Címsor-hierarchia rendben", ok: g(() => r.struct.hier) },
        { label: "FAQ blokk", ok: g(() => r.struct.faq) },
        { label: "Lista vagy táblázat a tartalomban", ok: g(() => r.struct.lists) },
      ],
    },
  ];
}

function scoreCategory(cat) {
  const scored = cat.findings.filter((f) => f.ok !== null && f.ok !== undefined);
  if (scored.length === 0) return null;
  const okCount = scored.filter((f) => f.ok === true).length;
  return Math.round((okCount / scored.length) * 100);
}

function overallScore(cats) {
  let sum = 0;
  let wsum = 0;
  cats.forEach((c) => {
    const s = scoreCategory(c);
    if (s !== null) {
      sum += s * c.weight;
      wsum += c.weight;
    }
  });
  if (wsum === 0) return null;
  return Math.round(sum / wsum);
}

function scoreColor(s) {
  if (s === null || s === undefined) return T.gray;
  if (s >= 80) return T.green;
  if (s >= 50) return T.orange;
  return T.red;
}

function scoreWord(s) {
  if (s === null) return "n/a";
  if (s >= 80) return "Kiváló";
  if (s >= 50) return "Közepes";
  return "Gyenge";
}

function useCountUp(target, run) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run || target == null) {
      setVal(0);
      return;
    }
    let raf;
    let start = null;
    const dur = 1100;
    const step = (t) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return val;
}

// ==================================================================
// Vizuális komponensek
// ==================================================================

let ringSeq = 0;

function ScoreRing({ value, size = 132, stroke = 11, spinning = false, animate = true }) {
  const gid = useMemo(() => "rg" + ++ringSeq, []);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const [dash, setDash] = useState(animate ? circ : circ * (1 - pct / 100));
  useEffect(() => {
    if (spinning || !animate) return;
    const t = requestAnimationFrame(() => setDash(circ * (1 - pct / 100)));
    return () => cancelAnimationFrame(t);
  }, [pct, circ, spinning, animate]);
  const col = spinning ? T.orange : scoreColor(value);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={spinning ? "ring-spin" : ""}
      // overflow: visible – különben az SVG a saját széléhez vágja a kör
      // drop-shadow glowját (a kör pont a viewBox széléig ér).
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.45" />
          <stop offset="100%" stopColor={col} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={spinning ? circ * 0.72 : dash}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          transition: spinning || !animate ? "none" : "stroke-dashoffset 1100ms cubic-bezier(.22,1,.36,1)",
          filter: `drop-shadow(0 0 6px ${col}66)`,
        }}
      />
    </svg>
  );
}

function ScoreBlock({ value, size = 148, run = true }) {
  const num = useCountUp(value, run);
  const col = scoreColor(value);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <ScoreRing value={value} size={size} stroke={11} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {value === null ? (
          <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: T.sub, textAlign: "center", padding: "0 18px" }}>
            nincs pontszám
          </span>
        ) : (
          <>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: size * 0.34, fontWeight: FONT_DISPLAY_WEIGHT, color: col, lineHeight: 1 }}>
              {num}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: col }} />
              <span style={{ fontSize: 12.5, color: T.sub, fontWeight: 500 }}>{scoreWord(value)}</span>
            </div>
            {/* /100 külön, a kör alján: kisebb, nem félkövér, halványabb. */}
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: size * 0.11,
                fontWeight: 400,
                color: "rgba(246,246,245,0.28)",
                marginTop: 4,
                lineHeight: 1,
              }}
            >
              /100
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function StatusPill({ ok }) {
  const cfg =
    ok === true
      ? { txt: "Rendben", c: T.green, bg: T.greenSoft, b: "rgba(70,209,158,0.32)" }
      : ok === false
      ? { txt: "Hiányzik", c: T.red, bg: T.redSoft, b: "rgba(255,107,107,0.32)" }
      : { txt: "Nem ellenőrizhető", c: T.gray, bg: T.graySoft, b: "rgba(139,139,147,0.3)" };
  return (
    <span
      style={{
        fontFamily: FONT_MONO,
        fontSize: 11,
        color: cfg.c,
        background: cfg.bg,
        border: `1px solid ${cfg.b}`,
        padding: "3px 11px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.txt}
    </span>
  );
}

function Mark({ ok }) {
  const c = ok === true ? T.green : ok === false ? T.red : T.gray;
  return (
    <span
      style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: ok === true ? T.greenSoft : ok === false ? T.redSoft : T.graySoft,
        border: `1px solid ${c}55`,
        color: c,
        fontSize: 12,
        fontWeight: FONT_DISPLAY_WEIGHT,
      }}
    >
      {ok === true ? "✓" : ok === false ? "✕" : "·"}
    </span>
  );
}

function CategoryCard({ cat, index }) {
  const s = scoreCategory(cat);
  return (
    <div className="fade-up" style={{ ...glassCard, padding: "20px 22px", animationDelay: `${140 + index * 80}ms` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: FONT_DISPLAY_WEIGHT, color: T.text, margin: 0 }}>{cat.name}</h3>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: FONT_DISPLAY_WEIGHT, color: scoreColor(s) }}>
          {s === null ? "n/a" : s + "/100"}
        </span>
      </div>
      <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 999, margin: "13px 0 16px", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${s ?? 0}%`,
            background: `linear-gradient(90deg, ${scoreColor(s)}88, ${scoreColor(s)})`,
            boxShadow: `0 0 10px ${scoreColor(s)}55`,
            borderRadius: 999,
            transition: "width 900ms cubic-bezier(.22,1,.36,1)",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {cat.findings
          .filter((f) => !f.bot)
          .map((f, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 13.5, color: T.sub, lineHeight: 1.4 }}>
                {f.label}
                {f.detail ? (
                  <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.faint, marginLeft: 8 }}>{f.detail}</span>
                ) : null}
              </div>
              <StatusPill ok={f.ok} />
            </div>
          ))}
      </div>
    </div>
  );
}

function BotList({ cat }) {
  const bots = cat.findings.filter((f) => f.bot);
  return (
    <div className="fade-up" style={{ ...glassCard, padding: "20px 22px", animationDelay: "60ms" }}>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: FONT_DISPLAY_WEIGHT, color: T.text, margin: "0 0 4px" }}>
        AI crawlerek botonként
      </h3>
      <p style={{ fontSize: 12.5, color: T.sub, margin: "0 0 16px" }}>
        Ezek a robotok viszik el a tartalmad az AI keresőkbe. Amit itt blokkolsz, az ott nem létezik.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {bots.map((f, i) => {
          const bot = BOTS[i] || {};
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${T.line}`,
                borderRadius: 12,
                padding: "10px 13px",
              }}
            >
              <Mark ok={f.ok} />
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: T.text }}>{bot.id}</span>
                <span style={{ fontSize: 11, color: T.faint }}>{bot.note}</span>
              </div>
              <StatusPill ok={f.ok} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helyfoglaló a későbbi fizetős funkcióknak. Most kikapcsolva.
function PaidTeaser() {
  if (!CONFIG.SHOW_UPSELL) return null;
  return (
    <div style={{ ...glassCard, borderColor: T.orangeLine, padding: 22, marginTop: 14 }}>
      {/* TODO (később): átfogó fizetős audit ajánló + javítási útmutató CTA */}
    </div>
  );
}

// Egyszerű, saját vonalas ikonok a bemutatókártyákhoz (nincs külső ikon-könyvtár)
function IconFiles() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}
function IconCode() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6 2 12l6 6M16 6l6 6-6 6" />
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z" />
    </svg>
  );
}

function IconBot() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="8" width="16" height="12" rx="3" />
      <path d="M12 8V4M9 14h.01M15 14h.01M2 13h2M20 13h2" />
    </svg>
  );
}
function IconTag() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6Z" />
      <path d="M7.5 7.5h.01" />
    </svg>
  );
}
function IconLayout() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 9v12" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      <path d="M9 7h7M9 11h5" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  );
}

const AUDIT_FEATURES = [
  {
    icon: IconFiles,
    title: "AI-felfedezési fájlok",
    desc: "A robots.txt, az llms.txt és az agents.json alapján megnézi, mely AI robotok férnek egyáltalán hozzá az oldaladhoz.",
  },
  {
    icon: IconCode,
    title: "Strukturált adat",
    desc: "Schema.org jelölés, címsor-hierarchia és GYIK blokkok, amik segítenek az AI-nak értelmezni a tartalmadat.",
  },
  {
    icon: IconGlobe,
    title: "Indexelhetőség és nyelv",
    desc: "Canonical, sitemap és a használt nyelv jelölése, ami nélkül az AI keresők sokszor észre sem veszik az oldaladat.",
  },
  {
    icon: IconBot,
    title: "AI crawlerek botonként",
    desc: "Megmutatja, hogy a GPTBot, a ClaudeBot, a PerplexityBot vagy a Google-Extended engedélyezve van-e.",
  },
  {
    icon: IconTag,
    title: "Meta és Open Graph",
    desc: "A title, a meta description és az Open Graph tagek adják azt a kivonatot, amiből az AI rád hivatkozik.",
  },
  {
    icon: IconLayout,
    title: "Tartalmi szerkezet",
    desc: "H1 főcím, tiszta címsor-hierarchia, listák és táblázatok. A jól tagolt tartalmat az AI könnyebben idézi.",
  },
  {
    icon: IconBook,
    title: "llms.txt",
    desc: "Egy egyszerű fájl, amivel közvetlenül az AI-oknak mondod meg, mit olvashatnak nálad. Alig használja valaki.",
  },
  {
    icon: IconShield,
    title: "Nincs AI-találgatás",
    desc: "Minden ellenőrzés valódi lekérdezés: robots.txt, HTML, schema. Valós lekérdezések, valós eredmények.",
  },
  {
    icon: IconMail,
    title: "Riport emailben, tételesen",
    desc: "A pontszám mellé kapsz egy konkrét listát arról, mi hiányzik, hogy tudd, hol érdemes kezdeni.",
  },
];

function FeatureCards() {
  return (
    <section className="fade-up" style={{ marginTop: 56, animationDelay: "180ms" }}>
      {/* Valódi <h2>: a főcím (h1) alatt ez zárja be a címsor-hierarchiát,
          a kártyacímek pedig h3-ként épülnek rá. */}
      <h2
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          fontWeight: 400,
          letterSpacing: 2,
          color: T.orange,
          textAlign: "center",
          margin: "0 0 22px",
        }}
      >
        MIT NÉZ ÁT AZ AUDIT
      </h2>
      {/* A kártyák valóban egy felsorolás, ezért <ul>/<li> a helyes jelölés –
          az AI és a keresők így könnyebben bontják idézhető elemekre. */}
      <ul className="feature-grid">
        {AUDIT_FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <li key={i} style={{ ...glassCard, padding: "22px 22px", textAlign: "left" }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: T.orangeSoft,
                  border: `1px solid ${T.orangeLine}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: T.orange,
                  marginBottom: 16,
                }}
              >
                <Icon />
              </div>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: FONT_DISPLAY_WEIGHT, fontSize: 16.5, color: T.text, margin: "0 0 8px" }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 13.5, color: T.sub, lineHeight: 1.55, margin: 0 }}>{f.desc}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}


// ------------------------------------------------------------------
// Süti-elfogadó sáv – a Google Pixel és a Meta Pixel csak ide kötött
// kifejezett hozzájárulás után töltődik be, sosem automatikusan.
// ------------------------------------------------------------------
// A két fő gomb szándékosan AZONOS méretű és súlyú: a hozzájárulás megtagadása
// nem lehet nehezebb, mint a megadása (nincs "sötét minta").
const consentBtnBase = {
  border: "none",
  borderRadius: 11,
  padding: "11px 10px",
  fontFamily: FONT_DISPLAY,
  fontWeight: FONT_DISPLAY_WEIGHT,
  fontSize: 13.5,
  cursor: "pointer",
  whiteSpace: "nowrap",
  color: "#1B2320",
  // Rugalmas szélesség, hogy a három gomb keskeny mobilon is EGY sorba férjen.
  flex: "1 1 0",
  minWidth: 0,
};

function CategoryRow({ title, desc, checked, onChange, locked }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "12px 0",
        borderTop: "1px solid rgba(4,47,46,0.10)",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={locked}
        onChange={(e) => onChange && onChange(e.target.checked)}
        style={{
          marginTop: 2,
          width: 16,
          height: 16,
          accentColor: T.orange,
          flexShrink: 0,
          cursor: locked ? "not-allowed" : "pointer",
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#111917" }}>
          {title}
          {locked && (
            <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: "#3A4644", marginLeft: 8 }}>MINDIG AKTÍV</span>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: "#2A3331", lineHeight: 1.5, marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  );
}

function CookieBanner({ onDecide }) {
  const [showSettings, setShowSettings] = useState(false);
  // Az opcionális kategóriák alapból BE vannak kapcsolva (üzemeltetői döntés).
  // A mérőkódok ettől függetlenül csak a látogató döntése UTÁN töltődnek be:
  // az oldal betöltésekor semmi nem fut le.
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  // A bannert PORTÁLLAL közvetlenül a <body> alá rendereljük. Ha a fő
  // app-konténer gyereke maradna (ami overflow:hidden + position:relative),
  // a Chromium nem az oldal tartalmát venné a backdrop-filter alapjául,
  // és az üveghatás (elmosás) nem jelenne meg.
  return createPortal(
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Süti-hozzájárulás"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        // A mobil böngésző lebegő eszköztára fölé emeljük (safe area).
        bottom: "calc(16px + env(safe-area-inset-bottom))",
        zIndex: 50,
        display: "flex",
        justifyContent: "center",
        // A portál miatt a banner a <body> alatt van, nem a fő konténerben,
        // ezért a betűtípust itt külön meg kell adni – különben a böngésző
        // alapértelmezett (serif) betűjét örökölné.
        fontFamily: FONT_BODY,
      }}
    >
      <div
        style={{
          // "Liquid glass": áttetsző alap + erős háttér-elmosás, hogy az alatta
          // lévő tartalom átderengjen, de a szöveg olvasható maradjon.
          background: "rgba(244,241,234,0.55)",
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.45)",
          borderRadius: 20,
          boxShadow: "0 20px 50px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.6)",
          maxWidth: 720,
          width: "100%",
          padding: "20px 22px",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <p style={{ margin: 0, fontSize: 13.5, color: "#1B2320", lineHeight: 1.6 }}>
          Ez az oldal sütiket használ a működéséhez, statisztikához és marketinghez. A feltétlenül szükséges sütik
          automatikusan bekapcsolnak, a többiről te döntesz. A marketing sütik (pl. Google, Meta) csak a hozzájárulásod
          után töltődnek be.
        </p>

        {showSettings && (
          <div style={{ marginTop: 14 }}>
            <CategoryRow
              locked
              checked
              title="Feltétlenül szükséges"
              desc="Az oldal alapvető működéséhez és a süti-döntésed megjegyzéséhez kell. Nem küld adatot harmadik félnek."
            />
            <CategoryRow
              title="Statisztika / analitika"
              desc="Névtelen látogatottsági adatok, hogy lássam, mi működik az oldalon."
              checked={analytics}
              onChange={setAnalytics}
            />
            <CategoryRow
              title="Marketing"
              desc="Google Pixel és Meta Pixel: a hirdetéseim eredményességének mérése és remarketing."
              checked={marketing}
              onChange={setMarketing}
            />
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "nowrap",
            alignItems: "stretch",
            marginTop: 16,
          }}
        >
          <button
            className="cta"
            onClick={() => onDecide({ analytics: true, marketing: true })}
            style={{ ...consentBtnBase, background: T.orange }}
          >
            Elfogadom
          </button>
          <button
            className="cta"
            onClick={() => onDecide({ analytics: false, marketing: false })}
            style={{ ...consentBtnBase, background: "#1B2320", color: "#FFFFFF" }}
          >
            Elutasítom
          </button>

          {showSettings ? (
            <button
              className="ghost"
              onClick={() => onDecide({ analytics, marketing })}
              style={{
                ...consentBtnBase,
                background: "transparent",
                color: "#1B2320",
                border: "1px solid rgba(4,47,46,0.35)",
              }}
            >
              Mentés
            </button>
          ) : (
            <button
              className="ghost"
              onClick={() => setShowSettings(true)}
              style={{
                ...consentBtnBase,
                background: "transparent",
                color: "#1B2320",
                border: "1px solid rgba(4,47,46,0.35)",
              }}
            >
              Beállítások
            </button>
          )}
        </div>

        <p style={{ margin: "14px 0 0", fontSize: 12, color: "#2A3331" }}>
          <a href={CONFIG.COOKIE_POLICY_URL} style={{ color: T.bg, fontWeight: 600, textDecoration: "none" }}>
            Süti tájékoztató
          </a>{" "}
          ·{" "}
          <a href={CONFIG.PRIVACY_POLICY_URL} style={{ color: T.bg, fontWeight: 600, textDecoration: "none" }}>
            Adatkezelési tájékoztató
          </a>
        </p>
      </div>
    </div>,
    document.body
  );
}

export default function AiVisibilityAudit() {
  const [phase, setPhase] = useState("hero"); // hero | form | scan | done | error
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState("");
  const [scanError, setScanError] = useState("");
  const [result, setResult] = useState(null);
  const [scannedUrl, setScannedUrl] = useState("");
  const [stepIdx, setStepIdx] = useState(0);
  const [leadInfo, setLeadInfo] = useState(null);
  const [auditsUsed, setAuditsUsed] = useState(0);
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  // A kulcsot csak a kliensen olvassuk ki (a szerveren nincs window/localStorage).
  const [bypassKey, setBypassKey] = useState("");
  const scanningRef = useRef(false);

  useEffect(() => {
    setBypassKey(readBypassKey());
  }, []);

  useEffect(() => {
    setAuditsUsed(readTodayCount());
  }, []);

  useEffect(() => {
    const stored = readStoredConsent();
    if (stored === null) {
      // Még nem döntött: a banner megjelenik, és addig SEMMILYEN mérőkód
      // nem töltődik be (előzetes hozzájárulás elve).
      setShowCookieBanner(true);
    } else {
      applyConsent(stored);
    }
  }, []);

  // Egyetlen belépési pont: az "Elfogadom", az "Elutasítom" és a
  // "Kiválasztottak mentése" is ide fut be, kategóriánkénti értékekkel.
  function handleCookieDecision(consent) {
    const decision = { ...EMPTY_CONSENT, ...consent };
    writeStoredConsent(decision);
    setShowCookieBanner(false);
    applyConsent(decision);
  }

  const remaining = Math.max(0, CONFIG.DAILY_LIMIT - auditsUsed);
  const categories = useMemo(() => (result ? buildCategories(result) : null), [result]);
  const total = useMemo(() => (categories ? overallScore(categories) : null), [categories]);
  const worst = useMemo(() => {
    if (!categories) return [];
    return categories
      .map((c) => ({ name: c.name, s: scoreCategory(c) }))
      // Csak a ténylegesen hiányos kategóriák számítanak "gyengének" – a 100
      // pontos kategóriákat nem soroljuk fel javítanivalóként.
      .filter((c) => c.s !== null && c.s < 100)
      .sort((a, b) => a.s - b.s)
      .slice(0, 2);
  }, [categories]);

  useEffect(() => {
    if (phase !== "scan") return;
    setStepIdx(0);
    const t = setInterval(() => {
      setStepIdx((i) => (i < SCAN_STEPS.length - 1 ? i + 1 : i));
    }, SCAN_STEP_MS);
    return () => clearInterval(t);
  }, [phase]);

  async function handleStart() {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setFormError("Adj meg egy érvényes webcímet, például: sajatoldalam.hu");
      return;
    }
    if (!isValidEmail(email)) {
      setFormError("Adj meg egy érvényes email címet, ide küldöm a riportot.");
      return;
    }
    if (!consent) {
      setFormError("A riport küldéséhez szükség van a hozzájárulásodra.");
      return;
    }
    if (scanningRef.current) return;
    scanningRef.current = true;
    setFormError("");
    setScanError("");
    setScannedUrl(normalized);
    setPhase("scan");
    const scanStartedAt = Date.now();

    try {
      // A limitről a szerver dönt: a korlátlan címeket ő ismeri fel. Ezért itt
      // nem blokkolunk előre, és a helyi számlálót is csak utólag növeljük.
      const data = await runRemoteScan(normalized, bypassKey);

      // Az animáció mindig fusson végig (min. 5 mp), akkor is, ha az API
      // gyorsabban válaszol – így az átvizsgálás alaposnak hat.
      const elapsed = Date.now() - scanStartedAt;
      if (elapsed < MIN_SCAN_MS) await wait(MIN_SCAN_MS - elapsed);

      setResult(data);
      setPhase("done");
      if (!data.unlimited) {
        bumpTodayCount();
        setAuditsUsed((u) => u + 1);
      }

      // A lead csak sikeres szkennelés UTÁN megy a MailerLite-nak, hogy a
      // pontszám és a kategóriánkénti bontás is átadható legyen merge tagként.
      const cats = buildCategories(data);
      const scoreForLead = overallScore(cats);
      const catSummary = Object.fromEntries(cats.map((c) => [c.key, scoreCategory(c)]));
      // A részletes bontást is átadjuk, hogy a riport-email konkrét, tételes
      // listát tudjon tartalmazni arról, mi rendben és mi hiányzik.
      const details = cats.map((c) => ({
        key: c.key,
        name: c.name,
        score: scoreCategory(c),
        findings: c.findings.map((f) => ({ label: f.label, ok: f.ok })),
      }));
      const lead = await submitLead({
        email: email.trim(),
        url: normalized,
        score: scoreForLead,
        categories: catSummary,
        details,
      });
      setLeadInfo(lead);
    } catch (e) {
      console.error("Scan error:", e);
      if (e.code === "DAILY_LIMIT") {
        setAuditsUsed(CONFIG.DAILY_LIMIT);
        setScanError(`Ma elérted a napi ${CONFIG.DAILY_LIMIT} auditot. Holnap újra próbálhatod.`);
      } else {
        setScanError(
          "A szkennelés most nem sikerült. Előfordulhat, hogy az oldal nem érhető el, vagy éppen nem válaszol. Próbáld újra."
        );
      }
      setPhase("error");
    } finally {
      scanningRef.current = false;
    }
  }

  function resetToForm() {
    setResult(null);
    setScanError("");
    setPhase("form");
  }

  const inputStyle = {
    border: `1px solid ${T.line}`,
    borderRadius: 13,
    padding: "13px 15px",
    fontSize: 15,
    background: "rgba(0,0,0,0.3)",
    color: T.text,
    width: "100%",
    boxSizing: "border-box",
  };

  const heroMode = phase === "hero";
  const formMode = phase === "form";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        // A háttér-színátmenet a <body>-n van (lásd index.html), hogy a mobil
        // böngészők sávjai mögé is seamlessen befusson. Itt átlátszó marad.
        background: "transparent",
        fontFamily: FONT_BODY,
        color: T.text,
        position: "relative",
        overflow: "hidden",
      }}
    >

      {/* Minimál, statikus háttérfény, semmi rács vagy minta */}
      <div className="glow-bg" style={{ width: 620, height: 620, top: -260, right: -160, background: "rgba(255,140,0,0.09)" }} />
      <div className="glow-bg" style={{ width: 560, height: 560, bottom: -300, left: -200, background: "rgba(20,184,166,0.10)" }} />

      {/* Fejléc */}
      <header style={{ padding: "16px 24px", position: "relative", zIndex: 1, flexShrink: 0 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "baseline", gap: 14 }}>
          <a
            href="https://audit.aiseoklub.hu"
            style={{ fontFamily: FONT_DISPLAY, fontWeight: FONT_DISPLAY_WEIGHT, fontSize: 17, textDecoration: "none" }}
          >
            <span style={{ color: T.orange }}>AI SEO</span> <span style={{ color: T.text }}>KLUB</span>
          </a>
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.orange, letterSpacing: 2 }}>AI-LÁTHATÓSÁGI AUDIT</span>
        </div>
      </header>

      <main style={{ maxWidth: 960, width: "100%", margin: "0 auto", padding: "0 20px 64px", position: "relative", zIndex: 1, flex: 1 }}>
        {/* ============ HERO + ŰRLAP (közös intro) ============ */}
        {(heroMode || formMode) && (
          <section
            style={{
              position: "relative",
              minHeight: heroMode ? "clamp(420px, 62vh, 560px)" : "auto",
              paddingTop: heroMode ? 0 : 40,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: FONT_DISPLAY_WEIGHT,
                lineHeight: 1.08,
                letterSpacing: "-0.01em",
                margin: 0,
                fontSize: heroMode ? "clamp(34px, 6.5vw, 62px)" : "clamp(30px, 5.2vw, 46px)",
                transition: "font-size 420ms cubic-bezier(.22,1,.36,1)",
                maxWidth: 820,
                position: "relative",
                zIndex: 2,
              }}
            >
              Ha az{" "}
              <span style={{ color: T.orange, textShadow: "0 0 34px rgba(255,140,0,0.45)" }}>
                AI nem lát téged
              </span>
              ,
              <br />
              a vevőid sem fognak.
            </h1>

            {heroMode && (
              <>
                <p style={{ color: T.sub, fontSize: 16.5, lineHeight: 1.6, margin: "20px auto 0", maxWidth: 500, zIndex: 2 }}>
                  Teszteld, mennyire látja a weboldaladat a ChatGPT, a Claude, a Gemini, a Perplexity és a Google AI
                  keresése. A részletes riportot emailben kapod meg.
                </p>
                <button
                  className="cta"
                  onClick={() => {
                    setFormError("");
                    setPhase("form");
                  }}
                  style={{
                    marginTop: 30,
                    background: T.orange,
                    color: T.onOrange,
                    border: "none",
                    borderRadius: 14,
                    padding: "16px 30px",
                    fontFamily: FONT_DISPLAY,
                    fontWeight: FONT_DISPLAY_WEIGHT,
                    fontSize: 17,
                    cursor: "pointer",
                    boxShadow: "0 0 34px rgba(255,140,0,0.4)",
                    zIndex: 2,
                  }}
                >
                  Ingyenes AI audit
                </button>
              </>
            )}

            {formMode && (
              <div className="fade-up" style={{ ...glassCard, padding: "26px 26px", marginTop: 26, width: "100%", maxWidth: 520, textAlign: "left" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5, color: T.faint }}>WEBOLDAL CÍME</span>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="pl. sajatoldalam.hu"
                      style={{ ...inputStyle, fontFamily: FONT_MONO }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5, color: T.faint }}>EMAIL CÍM A RIPORTHOZ</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nev@ceged.hu"
                      style={inputStyle}
                    />
                  </label>
                  <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      style={{ marginTop: 3, width: 16, height: 16, accentColor: T.orange, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>
                      Hozzájárulok, hogy az AI SEO Klub a megadott email címre elküldje a riportot és AI SEO témájú leveleket.
                      Bármikor leiratkozhatsz.
                    </span>
                  </label>

                  {formError && (
                    <div style={{ background: T.redSoft, border: "1px solid rgba(255,107,107,0.32)", color: T.red, borderRadius: 12, padding: "11px 15px", fontSize: 13.5 }}>
                      {formError}
                    </div>
                  )}

                  <button
                    className="cta"
                    onClick={handleStart}
                    // Szándékosan NINCS disabled: a korlátlan hozzáférésű címek
                    // a limit elérése után is indíthatnak auditot. A tényleges
                    // korlátot a szerver érvényesíti, és 429-cel jelez vissza.
                    style={{
                      background: remaining <= 0 ? "rgba(255,140,0,0.35)" : T.orange,
                      color: remaining <= 0 ? "rgba(27,35,32,0.45)" : T.onOrange,
                      border: "none",
                      borderRadius: 13,
                      padding: "15px 20px",
                      fontFamily: FONT_DISPLAY,
                      fontWeight: FONT_DISPLAY_WEIGHT,
                      fontSize: 16,
                      cursor: "pointer",
                      boxShadow: remaining <= 0 ? "none" : "0 0 28px rgba(255,140,0,0.35)",
                    }}
                  >
                    Indítsd el az auditot
                  </button>
                  <p style={{ fontSize: 12.5, color: T.faint, margin: 0, textAlign: "center" }}>
                    {remaining > 0
                      ? `Még ${remaining} ingyenes auditod van ma.`
                      : `Ma elérted a napi ${CONFIG.DAILY_LIMIT} auditot. Holnap újra próbálhatod.`}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {heroMode && <FeatureCards />}

        {/* ============ SZKENNELÉS ============ */}
        {phase === "scan" && (
          <section className="fade-up" style={{ ...glassCard, marginTop: 34, padding: "42px 34px", display: "flex", gap: 40, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", width: 132, height: 132, flexShrink: 0 }}>
              <ScoreRing value={0} size={132} stroke={10} spinning />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="soft-pulse" style={{ fontFamily: FONT_MONO, fontSize: 10, color: T.orange, letterSpacing: 1 }}>BEOLVASÁS</span>
              </div>
            </div>
            <div style={{ flex: "1 1 320px", minWidth: 260 }}>
              <h2 style={{ fontFamily: FONT_DISPLAY, color: T.text, fontSize: 22, margin: "0 0 6px" }}>Audit folyamatban…</h2>
              <p style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: T.orange, margin: "0 0 18px" }}>{prettyUrl(scannedUrl)}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {SCAN_STEPS.map((s, i) => {
                  const state = i < stepIdx ? "done" : i === stepIdx ? "active" : "wait";
                  return (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span
                        style={{
                          fontFamily: FONT_MONO,
                          fontSize: 12,
                          width: 16,
                          textAlign: "center",
                          color: state === "done" ? T.green : state === "active" ? T.orange : "rgba(246,246,245,0.22)",
                        }}
                      >
                        {state === "done" ? "✓" : state === "active" ? "▸" : "·"}
                      </span>
                      <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: state === "wait" ? "rgba(246,246,245,0.28)" : T.sub }}>{s}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ============ HIBA ============ */}
        {phase === "error" && (
          <section className="fade-up" style={{ ...glassCard, padding: 32, marginTop: 34 }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, margin: "0 0 10px", color: T.text }}>Nem sikerült a szkennelés</h2>
            <p style={{ color: T.sub, fontSize: 14.5, lineHeight: 1.6, margin: "0 0 20px" }}>{scanError}</p>
            <button
              className="cta"
              onClick={resetToForm}
              style={{ background: T.orange, color: T.onOrange, border: "none", borderRadius: 13, padding: "13px 20px", fontFamily: FONT_DISPLAY, fontWeight: FONT_DISPLAY_WEIGHT, fontSize: 15, cursor: "pointer" }}
            >
              Újrapróbálom
            </button>
          </section>
        )}

        {/* ============ EREDMÉNY ============ */}
        {phase === "done" && categories && (
          <>
            <section className="fade-up" style={{ ...glassCard, marginTop: 34, padding: "34px 34px" }}>
              {/* Ellenőrzött URL felül */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: 1.5, color: T.faint }}>ELLENŐRZÖTT OLDAL</span>
                <a
                  href={scannedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 13,
                    color: T.orange,
                    background: T.orangeSoft,
                    border: `1px solid ${T.orangeLine}`,
                    borderRadius: 999,
                    padding: "4px 13px",
                    textDecoration: "none",
                  }}
                >
                  {prettyUrl(scannedUrl)} ↗
                </a>
              </div>

              <div style={{ display: "flex", gap: 36, alignItems: "center", flexWrap: "wrap" }}>
                <ScoreBlock value={total} size={156} />
                <div style={{ flex: "1 1 300px", minWidth: 240 }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.orange, letterSpacing: 2, marginBottom: 10 }}>AI-LÁTHATÓSÁGI PONTSZÁM</div>
                  <h2 style={{ fontFamily: FONT_DISPLAY, color: T.text, fontSize: 23, margin: "0 0 10px", lineHeight: 1.28 }}>
                    {total === null
                      ? "Az oldalt most nem tudtam teljesen kiértékelni."
                      : total >= 80
                      ? "Erős alap. Az AI keresők jó eséllyel látnak."
                      : total >= 50
                      ? "Látható vagy, de fontos pontokon veszítesz."
                      : "Az AI keresők most jórészt vakok az oldaladra."}
                  </h2>
                  <p style={{ color: T.sub, fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>
                    {worst.length > 0 ? (
                      <>
                        A leggyengébb területeid: {worst.map((w) => w.name.toLowerCase()).join(" és ")}. A részletes bontást lent
                        találod.
                      </>
                    ) : (
                      <>Minden vizsgált terület rendben — nincs javítanivaló. A részletes bontást lent találod.</>
                    )}
                  </p>
                </div>
              </div>
            </section>

            <div
              className="fade-up"
              style={{ background: T.orangeSoft, border: `1px solid ${T.orangeLine}`, borderRadius: 14, padding: "15px 19px", margin: "16px 0 18px", fontSize: 13.5, color: T.text, lineHeight: 1.55, animationDelay: "40ms" }}
            >
              A teljes riportot a(z) <strong style={{ fontFamily: FONT_MONO, color: T.orange }}>{email.trim()}</strong> címre küldtem.
              {leadInfo?.simulated && (
                <span style={{ display: "block", fontSize: 12, color: T.sub, marginTop: 4 }}>
                  A MailerLite-küldés jelenleg nincs konfigurálva a szerveren, ezért ez a lépés csak szimulálva történt meg.
                </span>
              )}
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <BotList cat={categories[0]} />
              {categories.map((c, i) => (
                <CategoryCard key={c.key} cat={c} index={i + 1} />
              ))}
            </div>

            <PaidTeaser />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, flexWrap: "wrap", gap: 12 }}>
              <p style={{ fontSize: 11.5, color: T.faint, margin: 0, maxWidth: 520, lineHeight: 1.5 }}>
                Az eredmények tájékoztató jellegűek, az AI keresők működése és a szabványok folyamatosan változnak. Az elemzés a
                nyilvánosan elérhető jelekből dolgozik.
              </p>
              <button
                className="ghost"
                onClick={resetToForm}
                style={{ background: "transparent", color: T.text, border: `1px solid ${T.line}`, borderRadius: 13, padding: "11px 18px", fontFamily: FONT_DISPLAY, fontWeight: FONT_DISPLAY_WEIGHT, fontSize: 14, cursor: "pointer" }}
              >
                Új audit indítása
              </button>
            </div>
          </>
        )}
      </main>

      <footer
        style={{
          padding: "18px 24px",
          // viewport-fit=cover mellett a tartalom a képernyő aljáig ér, ezért a
          // láblécnek ki kell kerülnie a home indicator sávját.
          paddingBottom: "calc(18px + env(safe-area-inset-bottom))",
          position: "relative",
          zIndex: 1,
          flexShrink: 0,
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto", fontSize: 12, color: T.footerText, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span>
            <a href="https://aiseoklub.hu" style={{ color: T.footerText, textDecoration: "none" }}>
              AI SEO Klub
            </a>{" "}
            ·{" "}
            <a href="https://danielberndt.com/" target="_blank" rel="noopener noreferrer" style={{ color: T.footerText, textDecoration: "none" }}>
              Daniel Berndt
            </a>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => setShowCookieBanner(true)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: T.footerText,
                fontSize: 12,
                fontFamily: FONT_BODY,
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              Süti beállítások
            </button>
            <a href={CONFIG.PRIVACY_POLICY_URL} style={{ color: T.footerText, textDecoration: "none" }}>
              Adatvédelmi Tájékoztató
            </a>
          </div>
        </div>
      </footer>

      {showCookieBanner && <CookieBanner onDecide={handleCookieDecision} />}
    </div>
  );
}
