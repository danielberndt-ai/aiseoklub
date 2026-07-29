// api/keepalive/route.js
// -----------------------------------------------------------------------
// Napi egyszer lefutó "melegen tartó" végpont. Egyetlen célja, hogy forgalmat
// küldjön az Upstash Redis adatbázisnak, így a Vercel ne archiválja inaktivitás
// miatt (a napi-limit ezen a DB-n múlik). A Vercel Cron hívja meg (lásd
// vercel.json). Nem tárol értékes adatot: egy rövid életű kulcsot ír.
// -----------------------------------------------------------------------

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  // Ha be van állítva CRON_SECRET, csak a Vercel Cron (Bearer fejléccel) hívhatja.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return Response.json({ ok: false, reason: "upstash_not_configured" });
  }

  try {
    // Egy rövid életű kulcs írása (2 nap lejárat) – ennyi forgalom elég ahhoz,
    // hogy az adatbázis aktívnak számítson.
    const key = "aiseoklub:keepalive";
    const value = new Date().toISOString();
    const res = await fetch(
      `${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/EX/172800`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json().catch(() => ({}));
    return Response.json({ ok: res.ok, pingedAt: value, result: data.result ?? null });
  } catch (e) {
    console.error("Keepalive hiba:", e);
    return Response.json({ ok: false, reason: "network_error" });
  }
}
