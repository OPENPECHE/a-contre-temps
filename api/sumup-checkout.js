// Crée un paiement en ligne SumUp (Checkouts API) pour une commande marché.
// Le widget carte côté client complète ensuite ce checkout.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method" });
  const KEY = process.env.SUMUP_API_KEY, MERCHANT = process.env.SUMUP_MERCHANT_CODE;
  if (!KEY || !MERCHANT) return res.status(200).json({ ok: false, error: "paiement non configuré" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  body = body || {};
  const amount = Math.round(Number(body.amount) * 100) / 100;
  if (!amount || amount <= 0) return res.status(200).json({ ok: false, error: "montant invalide" });
  const description = String(body.description || "Commande marché").slice(0, 120);

  try {
    const r = await fetch("https://api.sumup.com/v0.1/checkouts", {
      method: "POST",
      headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        checkout_reference: "mkt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
        amount: amount,
        currency: "EUR",
        merchant_code: MERCHANT,
        description: description
      })
    });
    const t = await r.text(); let d = {}; try { d = JSON.parse(t); } catch (_) {}
    if (!r.ok || !d.id) return res.status(200).json({ ok: false, error: "SumUp " + r.status });
    return res.status(200).json({ ok: true, checkout_id: d.id, merchant_code: MERCHANT });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e.message || e) });
  }
}
