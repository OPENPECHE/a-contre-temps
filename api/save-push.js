// ─────────────────────────────────────────────────────────────────────────────
// Vercel Serverless Function — /api/save-push
// Enregistre l'abonnement push d'un téléphone (table verrouillée, clé service_role)
// ─────────────────────────────────────────────────────────────────────────────

const SB_URL = process.env.SUPABASE_URL || "https://jxxgafyqfbnqieiqltcn.supabase.co";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { subscription } = req.body || {};
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (!endpoint || !p256dh || !auth) return res.status(400).json({ error: "Abonnement invalide" });

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) return res.status(500).json({ error: "Service key manquante" });

  try {
    const r = await fetch(SB_URL + "/rest/v1/push_subscriptions", {
      method: "POST",
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": "Bearer " + SERVICE_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ endpoint, p256dh, auth }),
    });
    if (!r.ok && r.status !== 409) {
      console.error("save-push error:", r.status, await r.text());
      return res.status(500).json({ error: "Enregistrement impossible" });
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error("save-push exception:", e);
    return res.status(500).json({ error: e.message });
  }
}
