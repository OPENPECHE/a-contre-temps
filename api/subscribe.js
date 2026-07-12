// ─────────────────────────────────────────────────────────────────────────────
// Vercel Serverless Function — /api/subscribe
// Inscrit une adresse email à la newsletter (table verrouillée, clé service_role)
// ─────────────────────────────────────────────────────────────────────────────

const SB_URL = process.env.SUPABASE_URL || "https://jxxgafyqfbnqieiqltcn.supabase.co";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body || {};
  const clean = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return res.status(400).json({ error: "Email invalide" });
  }

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) return res.status(500).json({ error: "Service key manquante" });

  try {
    const r = await fetch(SB_URL + "/rest/v1/newsletter_subscribers", {
      method: "POST",
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": "Bearer " + SERVICE_KEY,
        "Content-Type": "application/json",
        // upsert : si l'email existe déjà, on ne crée pas de doublon
        "Prefer": "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ email: clean, active: true }),
    });
    if (!r.ok && r.status !== 409) {
      const t = await r.text();
      console.error("Subscribe error:", r.status, t);
      return res.status(500).json({ error: "Inscription impossible" });
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error("Subscribe exception:", e);
    return res.status(500).json({ error: e.message });
  }
}
