// ─────────────────────────────────────────────────────────────────────────────
// /api/voucher — bons cadeaux « Offrir un brunch » (clé service_role, RLS fermée)
//   action "create"   : crée un bon (après paiement) → renvoie le code
//   action "validate" : vérifie un code → renvoie le montant si actif
//   action "redeem"   : consomme un bon (atomique) → renvoie le montant
// ─────────────────────────────────────────────────────────────────────────────

const SB_URL = process.env.SUPABASE_URL || "https://jxxgafyqfbnqieiqltcn.supabase.co";

function sb(path, opts = {}) {
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(SB_URL + "/rest/v1/" + path, {
    ...opts,
    headers: { "apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
}
function genCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans I/O/0/1 (lisibilité)
  let s = ""; for (let i = 0; i < 8; i++) s += A[Math.floor(Math.random() * A.length)];
  return "OFFRE-" + s.slice(0, 4) + "-" + s.slice(4);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "Service key manquante" });
  const b = req.body || {};
  const action = b.action;

  try {
    // ── CREATE ────────────────────────────────────────────────────────────────
    if (action === "create") {
      const amount = Math.round((Number(b.amount) || 0) * 100) / 100;
      if (!(amount > 0)) return res.status(400).json({ ok: false, error: "Montant invalide" });
      let code = null, tries = 0;
      while (tries++ < 6) {
        const c = genCode();
        const chk = await sb("gift_vouchers?code=eq." + encodeURIComponent(c) + "&select=id");
        const ex = await chk.json();
        if (Array.isArray(ex) && ex.length === 0) { code = c; break; }
      }
      if (!code) return res.status(500).json({ ok: false, error: "Génération du code impossible" });
      const row = {
        code, amount, persons: (Number(b.persons) || null), status: "active",
        buyer_name: String(b.buyer_name || "").slice(0, 120), buyer_email: String(b.buyer_email || "").slice(0, 160),
        recipient_name: String(b.recipient_name || "").slice(0, 120), recipient_email: String(b.recipient_email || "").slice(0, 160),
        message: String(b.message || "").slice(0, 400),
      };
      const r = await sb("gift_vouchers", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
      const d = await r.json();
      if (!r.ok) { console.error("voucher create error:", d); return res.status(500).json({ ok: false, error: d }); }
      return res.status(200).json({ ok: true, code, amount });
    }

    // ── VALIDATE ──────────────────────────────────────────────────────────────
    if (action === "validate") {
      const code = String(b.code || "").trim().toUpperCase();
      if (!code) return res.status(400).json({ ok: false, error: "Code manquant" });
      const r = await sb("gift_vouchers?code=eq." + encodeURIComponent(code) + "&select=code,amount,status&limit=1");
      const d = await r.json(); const v = (Array.isArray(d) && d[0]) || null;
      if (!v) return res.status(200).json({ ok: false, reason: "introuvable" });
      if (v.status !== "active") return res.status(200).json({ ok: false, reason: "déjà utilisé" });
      return res.status(200).json({ ok: true, code: v.code, amount: Number(v.amount) || 0 });
    }

    // ── REDEEM (atomique) ─────────────────────────────────────────────────────
    if (action === "redeem") {
      const code = String(b.code || "").trim().toUpperCase();
      if (!code) return res.status(400).json({ ok: false, error: "Code manquant" });
      const r = await sb("gift_vouchers?code=eq." + encodeURIComponent(code) + "&status=eq.active",
        { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: "used", redeemed_at: new Date().toISOString(), order_id: b.order_id || null }) });
      const d = await r.json(); const v = (Array.isArray(d) && d[0]) || null;
      if (!v) return res.status(200).json({ ok: false, reason: "déjà utilisé ou introuvable" });
      return res.status(200).json({ ok: true, amount: Number(v.amount) || 0 });
    }

    return res.status(400).json({ error: "Action inconnue" });
  } catch (e) {
    console.error("voucher error:", e);
    return res.status(500).json({ error: e.message });
  }
}
