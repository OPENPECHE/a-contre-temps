// /api/sumup-status?tx=<client_transaction_id>
// Renvoie l'état d'un paiement SumUp (SUCCESSFUL | FAILED | CANCELLED | PENDING).
export default async function handler(req, res) {
  const KEY = process.env.SUMUP_API_KEY;
  const MERCHANT = process.env.SUMUP_MERCHANT_CODE;
  if (!KEY) return res.status(200).json({ ok: false, error: "SumUp non configuré" });
  const tx = String(req.query.tx || "").trim();
  if (!tx) return res.status(400).json({ ok: false, error: "tx manquant" });

  async function get(url) {
    const r = await fetch(url, { headers: { Authorization: "Bearer " + KEY } });
    const t = await r.text(); let d = {}; try { d = t ? JSON.parse(t) : {}; } catch (_) {}
    return { ok: r.ok, status: r.status, d: d };
  }
  function pick(d) {
    if (!d) return null;
    const tr = Array.isArray(d) ? d[0] : (d.items ? d.items[0] : d);
    return tr || null;
  }

  try {
    // 1) par client_transaction_id
    let r = await get("https://api.sumup.com/v0.1/me/transactions?client_transaction_id=" + encodeURIComponent(tx));
    let tr = r.ok ? pick(r.d) : null;
    // 2) repli : recherche dans l'historique marchand
    if (!tr && MERCHANT) {
      let r2 = await get("https://api.sumup.com/v0.1/merchants/" + MERCHANT + "/transactions/history?limit=20");
      const list = (r2.d && (r2.d.items || r2.d)) || [];
      if (Array.isArray(list)) tr = list.find(function (x) { return x && (x.client_transaction_id === tx || x.id === tx || x.transaction_code === tx); }) || null;
    }
    if (!tr) return res.status(200).json({ ok: true, status: "PENDING" }); // pas encore créée => en attente
    const st = (tr.status || tr.transaction_status || "PENDING").toUpperCase();
    return res.status(200).json({ ok: true, status: st, amount: tr.amount, code: tr.transaction_code || null });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e.message || e) });
  }
}
