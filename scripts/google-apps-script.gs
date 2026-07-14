/**
 * Google Apps Script – feliratkozók gyűjtése Google Sheetbe.
 *
 * TELEPÍTÉS
 * 1. Hozz létre egy Google Sheetet (pl. "AI SEO Klub – audit feliratkozók").
 * 2. A Sheetben: Bővítmények (Extensions) > Apps Script.
 * 3. Töröld a példakódot, és másold be EZT a teljes fájlt.
 * 4. Írd át lent a SECRET értékét egy hosszú, véletlen szövegre. Pontosan
 *    ugyanezt kell majd a Vercelen a SHEETS_WEBHOOK_SECRET változóba tenni.
 * 5. Telepítés (Deploy) > Új telepítés (New deployment)
 *      - Típus: Webalkalmazás (Web app)
 *      - Végrehajtás mint (Execute as): Én (Me)
 *      - Hozzáférés (Who has access): Bárki (Anyone)
 * 6. Másold ki a kapott web app URL-t -> ez lesz a Vercelen a SHEETS_WEBHOOK_URL.
 *
 * A "Bárki" hozzáférés azért kell, hogy a Vercel szerver el tudja érni.
 * A védelmet a SECRET adja: e nélkül a script minden kérést elutasít.
 */

// FONTOS: cseréld le egy hosszú, véletlenszerű értékre!
const SECRET = "IDE-EGY-HOSSZU-VELETLEN-TITOK";

const HEADERS = [
  "Időpont",
  "Email",
  "Weboldal",
  "Összpontszám",
  "AI crawler",
  "Indexelhetőség",
  "Schema",
  "Meta",
  "Szerkezet",
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.secret !== SECRET) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, error: "unauthorized" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // Első futáskor fejléc beírása.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.email || "",
      data.url || "",
      data.score,
      data.crawl,
      data.index,
      data.schema,
      data.meta,
      data.struct,
    ]);

    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
      ContentService.MimeType.JSON
    );
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
