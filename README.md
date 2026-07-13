# AI-láthatósági audit – AI SEO Klub

Ez a projekt az audit.aiseoklub.hu oldalt hajtja meg. Vite + React frontend, két Vercel
szerverfüggvénnyel (`/api/scan` és `/api/lead`), AI-hívás nélkül, determinisztikus
ellenőrzésekkel.

## 1. Helyi kipróbálás

```bash
npm install
npm run dev
```

Ezután a terminál kiírja a helyi címet (általában `http://localhost:5173`). A `/api/scan`
és `/api/lead` végpontok helyben is működnek, ha a Vercel CLI-t használod (`vercel dev`),
mert a sima `vite dev` önmagában nem futtatja a szerverfüggvényeket.

## 2. Feltöltés GitHubra

```bash
git init
git add .
git commit -m "Első verzió: AI-láthatósági audit"
git branch -M main
git remote add origin <a te GitHub repód URL-je>
git push -u origin main
```

## 3. Vercel projekt létrehozása

1. Jelentkezz be a [vercel.com](https://vercel.com) oldalon, és importáld a most feltöltött
   GitHub repót ("Add New… > Project").
2. A Vercel automatikusan felismeri, hogy ez egy Vite-projekt, nincs szükség extra
   beállításra a build parancsokhoz.
3. Deploy előtt vagy után állítsd be a környezeti változókat: **Project Settings >
   Environment Variables**. Ezek szerepét lásd lent.
4. Miután lement a deploy, a Vercel ad egy ideiglenes `*.vercel.app` címet, ezen már
   tesztelhető az egész folyamat.

## 4. Környezeti változók

Lásd a `.env.example` fájlt. Ezeket a Vercel dashboardon kell megadni, NEM a kódba írva:

| Változó | Mire való | Mi történik, ha üresen marad |
|---|---|---|
| `MAILERLITE_API_KEY` | A MailerLite feliratkoztatáshoz és a riport-emailhez | A lead-küldés szimulálva történik, valódi email nem megy ki |
| `MAILERLITE_GROUP_ID` | A feliratkozó adott MailerLite csoportba kerül | A feliratkozó csoport nélkül kerül be |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | A napi 3 audit limit megbízható nyilvántartása | A limit csak memóriában, kevésbé megbízhatóan érvényesül |

### Upstash Redis beállítása (ajánlott)
1. Regisztrálj a [upstash.com](https://upstash.com) oldalon (van ingyenes csomag).
2. Hozz létre egy Redis adatbázist.
3. A "REST API" fülön található URL-t és tokent másold be a Vercel környezeti
   változói közé.

### MailerLite beállítása
1. Hozd létre az API kulcsot: MailerLite fiók > Integrations > Developer API.
2. Hozd létre az egyéni mezőket (Settings > Fields): `audit_url`, `audit_score`,
   `audit_score_crawl`, `audit_score_index`, `audit_score_schema`, `audit_score_meta`,
   `audit_score_struct`. Ezek részletei az `api/lead.js` tetején is szerepelnek.
3. Ha szeretnéd, hozz létre egy külön csoportot az audit-feliratkozóknak, és másold be
   az azonosítóját a `MAILERLITE_GROUP_ID` változóba.
4. Állíts be egy MailerLite automatizmust, ami a feliratkozásra vagy mezőváltozásra
   fut le, és a fenti merge tagekkel (`{$audit_score}` és társai) építsd fel a
   riport-emailt a MailerLite saját szerkesztőjében.

## 5. Domain rákötése (audit.aiseoklub.hu)

1. A Vercel projektben: **Settings > Domains > Add**, add meg: `audit.aiseoklub.hu`.
2. A Vercel megmutatja, milyen CNAME (vagy A) rekordot kell beállítani.
3. Menj a domain jelenlegi DNS-kezelőjébe (a Rackhost admin felületén, ha ott van a
   domain), és vedd fel ott ezt a rekordot az `audit` aldomainhez.
4. A DNS-elterjedés általában néhány perctől néhány óráig tarthat.

## 6. Google Pixel / Meta Pixel bekapcsolása

A `src/App.jsx` tetején lévő `CONFIG` objektumban töltsd ki:

```js
GOOGLE_PIXEL_ID: "G-XXXXXXXXXX", // vagy AW-XXXXXXXXX
META_PIXEL_ID: "1234567890123456",
```

Amíg ezek üresek, a süti-elfogadó sáv megjelenik, de elfogadás után sem töltődik be
semmilyen mérőkód. Kitöltés után, ha valaki elfogadja a sütiket, a `loadMarketingPixels`
függvény tölti be ténylegesen a Google és a Meta szkriptjeit.

## 7. Adatvédelmi Tájékoztató linkelése

Ugyanebben a `CONFIG` objektumban:

```js
PRIVACY_POLICY_URL: "https://aiseoklub.hu/adatvedelmi-tajekoztato", // a végleges URL
```

Amíg ez `"#"` marad, a footer és a süti-sáv linkje nem mutat sehova.

## 8. Napi limit módosítása

A `CONFIG.DAILY_LIMIT` a kliensoldali számlálót állítja, az `api/scan.js` tetején lévő
`DAILY_LIMIT` konstans pedig a szerveroldali, tényleges korlátot. A kettőt egyszerre
érdemes módosítani.

## 9. Mielőtt élesíted

- Nézesd át az Adatvédelmi Tájékoztatót egy adatvédelemben jártas jogásszal, különös
  tekintettel a Google Pixel és a Meta Pixel pontos beállítására.
- Ellenőrizd, hogy a MailerLite automatizmus ténylegesen kiküldi-e a riportot egy
  teszt-feliratkozáskor.
- Ellenőrizd élesben is a napi limitet: 3 audit után a negyedik próbálkozásnak el kell
  utasítva lennie.

## Mappastruktúra

```
├── api/
│   ├── scan.js     – a tényleges audit-logika (robots.txt, llms.txt, agents.json, schema, meta, szerkezet)
│   └── lead.js     – MailerLite feliratkoztatás és a riport-adatok átadása
├── src/
│   ├── App.jsx      – a teljes felület (ugyanaz a komponens, amit eddig közösen alakítottunk)
│   └── main.jsx     – React belépési pont
├── index.html
├── package.json
└── vite.config.js
```
