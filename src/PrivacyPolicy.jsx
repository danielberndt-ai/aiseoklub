import React from "react";

// =====================================================================
// AI SEO KLUB – Adatvédelmi Tájékoztató aloldal
// A főoldallal (App.jsx) megegyező sötét/narancs dizájn.
// Elérhető: audit.aiseoklub.hu/adatvedelmi-tajekoztato
// =====================================================================

const T = {
  bg: "#042f2e",
  glass: "rgba(255,255,255,0.04)",
  line: "rgba(255,255,255,0.08)",
  orange: "#FF8C00",
  orangeSoft: "rgba(255,140,0,0.12)",
  orangeLine: "rgba(255,140,0,0.32)",
  text: "#F6F6F5",
  sub: "rgba(246,246,245,0.72)",
  faint: "rgba(246,246,245,0.4)",
};

const FONT_DISPLAY = "'Inter Tight', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY_WEIGHT = 900;
const FONT_BODY = "'Google Sans Flex', system-ui, -apple-system, 'Segoe UI', sans-serif";
const FONT_MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace";

const glassCard = {
  background: T.glass,
  border: `1px solid ${T.line}`,
  borderRadius: 20,
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
};

function H2({ children }) {
  return (
    <h2
      style={{
        fontFamily: FONT_DISPLAY,
        fontWeight: FONT_DISPLAY_WEIGHT,
        fontSize: 22,
        color: T.text,
        margin: "38px 0 12px",
        lineHeight: 1.25,
      }}
    >
      {children}
    </h2>
  );
}

function H3({ children }) {
  return (
    <h3
      style={{
        fontFamily: FONT_DISPLAY,
        fontWeight: FONT_DISPLAY_WEIGHT,
        fontSize: 16.5,
        color: T.orange,
        margin: "24px 0 8px",
      }}
    >
      {children}
    </h3>
  );
}

function P({ children, style }) {
  return (
    <p style={{ fontSize: 15, color: T.sub, lineHeight: 1.7, margin: "0 0 14px", ...style }}>
      {children}
    </p>
  );
}

function Mail({ children }) {
  return (
    <a href={`mailto:${children}`} style={{ color: T.orange, textDecoration: "none" }}>
      {children}
    </a>
  );
}

const liStyle = { fontSize: 15, color: T.sub, lineHeight: 1.65, marginBottom: 7 };

export default function PrivacyPolicy() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(ellipse 1200px 700px at 50% -10%, #0d4f4c 0%, #08403d 28%, #042f2e 55%, #021d1c 80%, #010f0e 100%)",
        fontFamily: FONT_BODY,
        color: T.text,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@900&family=Google+Sans+Flex&family=IBM+Plex+Mono:wght@400;600&display=swap');
        .glow-bg { position: fixed; border-radius: 50%; filter: blur(90px); pointer-events: none; z-index: 0; }
        a:hover { filter: brightness(1.1); }
        .pp-table { width: 100%; border-collapse: collapse; margin: 6px 0 14px; }
        .pp-table th, .pp-table td { text-align: left; padding: 11px 13px; border: 1px solid ${T.line}; font-size: 13.5px; line-height: 1.5; vertical-align: top; }
        .pp-table th { font-family: ${FONT_MONO}; font-size: 11px; letter-spacing: 1px; color: ${T.orange}; background: rgba(255,140,0,0.06); }
        .pp-table td { color: ${T.sub}; }
      `}</style>

      <div className="glow-bg" style={{ width: 620, height: 620, top: -260, right: -160, background: "rgba(255,140,0,0.09)" }} />
      <div className="glow-bg" style={{ width: 560, height: 560, bottom: -300, left: -200, background: "rgba(20,184,166,0.10)" }} />

      {/* Fejléc */}
      <header style={{ padding: "16px 24px", position: "relative", zIndex: 1, flexShrink: 0 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "baseline", gap: 14 }}>
          <a href="/" style={{ fontFamily: FONT_DISPLAY, fontWeight: FONT_DISPLAY_WEIGHT, fontSize: 17, textDecoration: "none" }}>
            <span style={{ color: T.orange }}>AI SEO</span> <span style={{ color: T.text }}>KLUB</span>
          </a>
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: T.orange, letterSpacing: 2 }}>ADATVÉDELMI TÁJÉKOZTATÓ</span>
        </div>
      </header>

      <main style={{ maxWidth: 760, width: "100%", margin: "0 auto", padding: "16px 20px 64px", position: "relative", zIndex: 1, flex: 1 }}>
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontFamily: FONT_MONO,
            fontSize: 12.5,
            color: T.faint,
            textDecoration: "none",
            marginBottom: 18,
          }}
        >
          ← Vissza az audithoz
        </a>

        <div style={{ ...glassCard, padding: "34px 34px 40px" }}>
          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: FONT_DISPLAY_WEIGHT,
              fontSize: "clamp(30px, 5vw, 42px)",
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
              margin: "0 0 10px",
            }}
          >
            Adatvédelmi Tájékoztató
          </h1>
          <p style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: T.orange, letterSpacing: 1, margin: "0 0 8px" }}>
            HATÁLYOS: 2026. JÚLIUS 13-TÓL
          </p>

          <H2>1. Bevezetés</H2>
          <P>
            Ez a tájékoztató azt mutatja be, hogyan kezelem a személyes adataidat, amikor felkeresed az aiseoklub.hu weboldalt,
            feliratkozol az AI SEO Klub hírlevélre a Substack-en, vagy használod az AI-láthatósági audit eszközt az
            audit.aiseoklub.hu címen.
          </P>
          <P>
            A tájékoztató az Európai Unió Általános Adatvédelmi Rendelete (GDPR) és az információs önrendelkezési jogról és az
            információszabadságról szóló 2011. évi CXII. törvény (Infotv.) alapján készült.
          </P>

          <H2>2. Az adatkezelő adatai</H2>
          <ul style={{ margin: "0 0 14px", paddingLeft: 20 }}>
            <li style={liStyle}><strong style={{ color: T.text }}>Név:</strong> Bernát Dániel, egyéni vállalkozó</li>
            <li style={liStyle}><strong style={{ color: T.text }}>Székhely:</strong> 2038 Sóskút, Fő utca 45.</li>
            <li style={liStyle}><strong style={{ color: T.text }}>Nyilvántartó kamara:</strong> Pest Vármegyei és Érdi Kereskedelmi és Iparkamara</li>
            <li style={liStyle}><strong style={{ color: T.text }}>Nyilvántartási szám:</strong> PE69395828</li>
            <li style={liStyle}><strong style={{ color: T.text }}>Kapcsolattartási email:</strong> <Mail>danielberndt@aiseoklub.hu</Mail></li>
          </ul>
          <P>Adatvédelemmel kapcsolatos bármilyen kérdésedet, kérésedet a fenti email címre küldheted el.</P>

          <H2>3. Milyen adatokat kezelek, és milyen célból</H2>

          <H3>3.1. Hírlevél feliratkozás (Substack)</H3>
          <P>Amikor feliratkozol az AI SEO Klub hírlevélre, a következő adatokat kezelem:</P>
          <ul style={{ margin: "0 0 14px", paddingLeft: 20 }}>
            <li style={liStyle}>email cím</li>
            <li style={liStyle}>a feliratkozás időpontja</li>
            <li style={liStyle}>a hírlevéllel kapcsolatos interakciók (megnyitás, kattintás), amennyiben ezt a hírlevél-küldő rendszer méri</li>
          </ul>
          <P>
            <strong style={{ color: T.text }}>Jogalap:</strong> a hozzájárulásod (GDPR 6. cikk (1) bekezdés a) pont).{" "}
            <strong style={{ color: T.text }}>Cél:</strong> hírlevél és AI SEO témájú tartalmak küldése.{" "}
            <strong style={{ color: T.text }}>Megőrzési idő:</strong> amíg le nem iratkozol, vagy amíg vissza nem vonod a hozzájárulásodat.
          </P>

          <H3>3.2. AI-láthatósági audit eszköz</H3>
          <P>Amikor az audit.aiseoklub.hu oldalon megadod a weboldalad címét és az email címedet, a következő adatokat kezelem:</P>
          <ul style={{ margin: "0 0 14px", paddingLeft: 20 }}>
            <li style={liStyle}>email cím</li>
            <li style={liStyle}>a megadott weboldal URL-je</li>
            <li style={liStyle}>az elvégzett audit eredménye (pontszám, kategóriánkénti bontás)</li>
            <li style={liStyle}>a feliratkozás időpontja</li>
          </ul>
          <P>
            <strong style={{ color: T.text }}>Jogalap:</strong> a hozzájárulásod, amit az űrlapon lévő jelölőnégyzet bepipálásával adsz meg.{" "}
            <strong style={{ color: T.text }}>Cél:</strong> a riport elkészítése és emailben történő elküldése (Resend), valamint a
            feliratkozásod nyilvántartása és AI SEO témájú levelek küldése.{" "}
            <strong style={{ color: T.text }}>Megőrzési idő:</strong> amíg le nem iratkozol, vagy amíg vissza nem vonod a hozzájárulásodat.
          </P>
          <P>
            A megadott adatokat (email cím, a vizsgált weboldal címe, az audit eredménye és a feliratkozás időpontja) egy Google
            Sheets táblázatban tartom nyilván, a riport-emailt pedig a Resend szolgáltatásán keresztül küldöm ki.
          </P>
          <P>
            Az eszköz naponta korlátozott számú ingyenes auditot enged, ehhez technikailag szükséges lehet a felhasznált
            audit-számot rövid ideig, anonim módon (pl. IP-cím alapján) nyilvántartani. Ez az adat nem kerül összekapcsolásra az
            email címeddel, és kizárólag a visszaélés-szerű használat megakadályozását szolgálja.
          </P>

          <h3
            id="sutik"
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: FONT_DISPLAY_WEIGHT,
              fontSize: 16.5,
              color: T.orange,
              margin: "24px 0 8px",
              scrollMarginTop: 24,
            }}
          >
            3.3. Sütik és mérőkódok (Google Pixel, Meta Pixel)
          </h3>
          <P>
            Az audit.aiseoklub.hu alkalmazás egy süti-sávval indul, ami alapértelmezetten{" "}
            <strong style={{ color: T.text }}>semmilyen mérőkódot nem tölt be</strong>. A hozzájárulást igénylő sütik és mérőkódok
            kizárólag <strong style={{ color: T.text }}>a döntésed után</strong> települnek: amíg nem választottál, egyetlen
            mérőkód sem fut le.
          </P>
          <P>
            A hozzájárulást <strong style={{ color: T.text }}>célonként, külön-külön</strong> kérem, három kategóriában:
          </P>
          <ul style={{ margin: "0 0 14px", paddingLeft: 20 }}>
            <li style={liStyle}>
              <strong style={{ color: T.text }}>Feltétlenül szükséges</strong> (mindig aktív, nem kapcsolható): az oldal alapvető
              működéséhez és a süti-döntésed megjegyzéséhez kell. Nem küld adatot harmadik félnek, és nem igényel hozzájárulást.
            </li>
            <li style={liStyle}>
              <strong style={{ color: T.text }}>Statisztika / analitika</strong> (alapból kikapcsolva): névtelen látogatottsági
              adatok arról, hogyan használják az oldalt.
            </li>
            <li style={liStyle}>
              <strong style={{ color: T.text }}>Marketing</strong> (alapból kikapcsolva): <strong style={{ color: T.text }}>Google Pixel</strong>{" "}
              (Google Ireland Limited) és <strong style={{ color: T.text }}>Meta Pixel</strong> (Meta Platforms Ireland Limited) a
              hirdetéseim eredményességének mérésére és remarketing célra.
            </li>
          </ul>
          <P>
            Egyik opcionális kategória sincs előre bepipálva, és az elutasítás ugyanolyan egyszerű, mint az elfogadás: az
            „Elfogadom" és az „Elutasítom" gomb azonos súllyal, egymás mellett szerepel. A „Beállítások" alatt kategóriánként is
            dönthetsz.
          </P>
          <P>
            Ezek a mérőkódok, ha engedélyezed őket, sütiket (cookie-kat) és egyedi azonosítókat helyeznek el a böngésződben, és
            olyan adatokat gyűjthetnek, mint a látogatott oldalak, a látogatás időpontja, az eszköz és a böngésző típusa, illetve
            az IP-cím.
          </P>
          <P>
            <strong style={{ color: T.text }}>Jogalap:</strong> a hozzájárulásod, amit a süti-sávon az adott kategória
            engedélyezésével adsz meg (GDPR 6. cikk (1) bekezdés a) pont).{" "}
            <strong style={{ color: T.text }}>Cél:</strong> weboldal-statisztika, hirdetés-optimalizálás, remarketing.{" "}
            <strong style={{ color: T.text }}>Megőrzési idő:</strong> az adott süti saját, a szolgáltató által meghatározott
            megőrzési ideje szerint, ami eltérő lehet a Google és a Meta esetében.
          </P>
          <P>
            A döntésedet (kategóriánként, hogy mit engedélyeztél) a böngésződ saját tárolójában (localStorage) jegyzem meg,
            kizárólag a te eszközödön, hogy legközelebb ne kelljen újra megkérdeznem. Ez a technikai tárolás önmagában nem igényel
            hozzájárulást, mert az oldal alapvető, a döntésed megjegyzéséhez szükséges működését szolgálja, és nem küld adatot
            harmadik félnek.
          </P>
          <P>
            A döntésedet bármikor, ugyanolyan egyszerűen megváltoztathatod vagy visszavonhatod az oldal alján található „Süti
            beállítások" linkre kattintva, ahol a sáv újra megjelenik. Emellett a Google Pixel és a Meta Pixel használatát a
            böngésződ beállításaiban, illetve a Google és a Meta saját hirdetési beállításain keresztül is bármikor letilthatod
            vagy korlátozhatod.
          </P>
          <P>
            Az aiseoklub.hu weboldal és a Substack-hírlevél egyéb felületein használt sütikre a Substack saját, mindenkor hatályos
            süti-gyakorlata vonatkozik, amit a Substack saját adatvédelmi tájékoztatója ismertet részletesen.
          </P>

          <H2>4. Kik férnek hozzá az adataidhoz (adatfeldolgozók, címzettek)</H2>
          <P>Az adataidat a következő szolgáltatók kezelik, az én megbízásomból vagy önálló adatkezelőként:</P>
          <div style={{ overflowX: "auto" }}>
            <table className="pp-table">
              <thead>
                <tr>
                  <th>Szolgáltató</th>
                  <th>Szerepe</th>
                  <th>Mit lát az adataidból</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Resend, Inc.</td>
                  <td>A riport-email kiküldése</td>
                  <td>email cím, a vizsgált weboldal címe, audit-eredmények</td>
                </tr>
                <tr>
                  <td>Google Ireland Limited (Google Sheets)</td>
                  <td>A feliratkozók és az audit-eredmények nyilvántartása</td>
                  <td>email cím, weboldal címe, audit-eredmények, időpont</td>
                </tr>
                <tr>
                  <td>Substack Inc.</td>
                  <td>Hírlevél-platform (aiseoklub.hu)</td>
                  <td>email cím, feliratkozási adatok</td>
                </tr>
                <tr>
                  <td>Vercel Inc.</td>
                  <td>Az audit.aiseoklub.hu alkalmazás hostingja</td>
                  <td>technikai naplóadatok, IP-cím</td>
                </tr>
                <tr>
                  <td>Upstash, Inc.</td>
                  <td>A napi ingyenes audit-limit nyilvántartása</td>
                  <td>anonim, IP-cím alapú számláló (email címhez nem kötve)</td>
                </tr>
                <tr>
                  <td>Google Ireland Limited</td>
                  <td>Google Pixel</td>
                  <td>süti-azonosítók, IP-cím, látogatottsági adatok</td>
                </tr>
                <tr>
                  <td>Meta Platforms Ireland Limited</td>
                  <td>Meta Pixel</td>
                  <td>süti-azonosítók, IP-cím, látogatottsági adatok</td>
                </tr>
              </tbody>
            </table>
          </div>
          <P>
            Ezek a szolgáltatók saját adatvédelmi tájékoztatóval rendelkeznek, amit érdemes külön is átnézned, ha részletesebben
            érdekel, ők hogyan kezelik az adataidat.
          </P>

          <H2>5. Adattovábbítás az Európai Unión kívülre</H2>
          <P>
            A Google, a Meta, a Vercel, a Resend, az Upstash és a Substack amerikai székhelyű vállalatok, ezért előfordulhat, hogy az
            általuk kezelt adatok az Európai Gazdasági Térségen kívülre, az Egyesült Államokba kerülnek továbbításra. Ezt a
            továbbítást az EU-USA Adatvédelmi Keretrendszer (EU-U.S. Data Privacy Framework), illetve a szolgáltatók által
            alkalmazott egyéb, a GDPR szerint megfelelő garanciák (például általános szerződési feltételek) biztosítják.
          </P>

          <H2>6. Milyen jogaid vannak</H2>
          <P>A rád vonatkozó adatkezeléssel kapcsolatban a következő jogokat gyakorolhatod:</P>
          <ul style={{ margin: "0 0 14px", paddingLeft: 20 }}>
            <li style={liStyle}><strong style={{ color: T.text }}>Hozzáférés joga:</strong> megkérdezheted, milyen adatokat kezelek rólad.</li>
            <li style={liStyle}><strong style={{ color: T.text }}>Helyesbítés joga:</strong> kérheted a pontatlan adatok javítását.</li>
            <li style={liStyle}><strong style={{ color: T.text }}>Törlés joga:</strong> kérheted az adataid törlését.</li>
            <li style={liStyle}><strong style={{ color: T.text }}>Adatkezelés korlátozásának joga:</strong> bizonyos esetekben kérheted az adatkezelés korlátozását.</li>
            <li style={liStyle}><strong style={{ color: T.text }}>Tiltakozás joga:</strong> tiltakozhatsz az adataid kezelése ellen.</li>
            <li style={liStyle}><strong style={{ color: T.text }}>Adathordozhatóság joga:</strong> kérheted, hogy az adataidat tagolt, géppel olvasható formában megkapd.</li>
            <li style={liStyle}><strong style={{ color: T.text }}>A hozzájárulás visszavonásának joga:</strong> mivel az adatkezelés a hozzájárulásodon alapul, ezt bármikor, indoklás nélkül visszavonhatod, ami nem érinti a visszavonás előtti adatkezelés jogszerűségét.</li>
          </ul>
          <P>
            Ezeket a jogaidat a <Mail>danielberndt@aiseoklub.hu</Mail> email címen gyakorolhatod. A hírlevélről a levelek alján
            található leiratkozási linkkel is bármikor egyszerűen leiratkozhatsz.
          </P>

          <H2>7. Adatbiztonság</H2>
          <P>
            Az adataid védelme érdekében megfelelő technikai és szervezési intézkedéseket alkalmazok, és csak a fentebb felsorolt,
            megbízható szolgáltatókkal dolgozom együtt, akik szintén kötelesek a GDPR előírásait betartani.
          </P>

          <H2>8. Kiskorúak adatai</H2>
          <P>
            A weboldal és a hírlevél nem 18 év alatti személyeknek szól. Ha tudomásomra jut, hogy kiskorú adatait kezelem a
            hozzájárulása vagy a törvényes képviselője hozzájárulása nélkül, az érintett adatokat haladéktalanul törlöm.
          </P>

          <H2>9. Jogorvoslati lehetőségek</H2>
          <P>
            Ha úgy érzed, hogy megsértettem az adataid kezelésével kapcsolatos jogaidat, panasszal fordulhatsz a felügyeleti
            hatósághoz:
          </P>
          <P style={{ marginBottom: 14 }}>
            <strong style={{ color: T.text }}>Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)</strong>
            <br />
            Székhely: 1055 Budapest, Falk Miksa utca 9-11.
            <br />
            Postacím: 1363 Budapest, Pf. 9.
            <br />
            Telefon: +36 (1) 391-1400
            <br />
            Email: <Mail>ugyfelszolgalat@naih.hu</Mail>
            <br />
            Honlap: <a href="https://www.naih.hu" target="_blank" rel="noopener noreferrer" style={{ color: T.orange, textDecoration: "none" }}>www.naih.hu</a>
          </P>
          <P>
            Emellett jogaid érvényesítése érdekében bírósághoz is fordulhatsz, a lakóhelyed vagy tartózkodási helyed szerint
            illetékes törvényszéken.
          </P>

          <H2>10. A tájékoztató módosítása</H2>
          <P>
            Ezt a tájékoztatót időről időre frissíthetem, például ha új szolgáltatást vezetek be, vagy változik a jogszabályi
            környezet. A mindenkor aktuális verzió ezen az oldalon érhető el.
          </P>

        </div>
      </main>

      <footer style={{ padding: "18px 24px", position: "relative", zIndex: 1, flexShrink: 0 }}>
        <div style={{ maxWidth: 760, margin: "0 auto", fontSize: 12, color: T.faint, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span>
            <a href="https://aiseoklub.hu" style={{ color: T.faint, textDecoration: "none" }}>AI SEO Klub</a> ·{" "}
            <a href="https://danielberndt.com/" target="_blank" rel="noopener noreferrer" style={{ color: T.faint, textDecoration: "none" }}>Daniel Berndt</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
