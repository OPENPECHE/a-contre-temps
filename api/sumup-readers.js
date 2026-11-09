// ─────────────────────────────────────────────────────────────────────────────
// /api/sumup-readers — DIAGNOSTIC (lecture seule) : liste les terminaux (readers)
// connus du compte SumUp, avec leur statut. Sert à vérifier que SUMUP_READER_ID
// correspond bien à un terminal existant et en ligne.
// À SUPPRIMER une fois le diagnostic terminé.
// ─────────────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const KEY = process.env.SUMUP_API_KEY;
  const MERCHANT = process.env.SUMUP_MERCHANT_CODE;
  const READER = process.env.SUMUP_READER_ID;
  if (!KEY || !MERCHANT) {
    return res.status(200).json({ ok: false, error: "Config manquante", hasKey: !!KEY, hasMerchant: !!MERCHANT, hasReader: !!READER });
  }
  try {
    const r = await fetch(`https://api.sumup.com/v0.1/merchants/${MERCHANT}/readers`, {
      headers: { "Authorization": "Bearer " + KEY },
    });
    const txt = await r.text();
    let data = {}; try { data = txt ? JSON.parse(txt) : {}; } catch (_) { data = { raw: txt.slice(0, 300) }; }
    const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
    const readers = items.map(function (x) {
      return { id: x.id, name: x.name, status: x.status, device: x.device && (x.device.identifier || x.device.model) };
    });
    return res.status(200).json({
      ok: r.ok,
      http: r.status,
      merchant_ok: true,
      configured_reader_id: READER || null,
      configured_reader_found: readers.some(function (x) { return x.id === READER; }),
      count: readers.length,
      readers: readers,
      error: r.ok ? null : (data && (data.message || data.error_message)) || ("HTTP " + r.status),
    });
  } catch (e) {
    return res.status(200).json({ ok: false, error: "Appel SumUp échoué : " + (e.message || "réseau") });
  }
}
