// ─────────────────────────────────────────────────────────────────────────────
// /api/sumup-charge — envoie un montant sur le terminal SumUp Solo (Readers API)
// Variables d'environnement Vercel à renseigner :
//   SUMUP_API_KEY        → clé secrète SumUp (sup_sk_...) ou jeton OAuth
//   SUMUP_MERCHANT_CODE  → code marchand SumUp (ex. MXXXXXXX)
//   SUMUP_READER_ID      → identifiant du terminal Solo appairé (reader id)
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const KEY = process.env.SUMUP_API_KEY;
  const MERCHANT = process.env.SUMUP_MERCHANT_CODE;
  const READER = process.env.SUMUP_READER_ID;
  if (!KEY || !MERCHANT || !READER) {
    return res.status(200).json({ ok: false, error: "SumUp non configuré (clés manquantes sur le serveur)" });
  }

  const body = req.body || {};
  const amount = Number(body.amount);
  if (!amount || amount <= 0) return res.status(400).json({ ok: false, error: "Montant invalide" });
  const cents = Math.round(amount * 100);

  try {
    const r = await fetch(
      `https://api.sumup.com/v0.1/merchants/${MERCHANT}/readers/${READER}/checkout`,
      {
        method: "POST",
        headers: { "Authorization": "Bearer " + KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          total_amount: { value: cents, currency: "EUR", minor_unit: 2 },
          description: (body.description || "Vente marché").slice(0, 120),
        }),
      }
    );
    const txt = await r.text();
    let data = {}; try { data = txt ? JSON.parse(txt) : {}; } catch (_) {}
    if (!r.ok) {
      const msg = (data && (data.message || data.error_message)) || ("Erreur SumUp (" + r.status + ")");
      return res.status(200).json({ ok: false, error: msg });
    }
    const id = (data.data && (data.data.client_transaction_id || data.data.id)) || data.client_transaction_id || null;
    // Le terminal affiche le montant et attend la carte ; le résultat final se confirme sur le terminal.
    return res.status(200).json({ ok: true, sent: true, transaction_id: id });
  } catch (e) {
    return res.status(200).json({ ok: false, error: "Terminal injoignable : " + (e.message || "réseau") });
  }
}
