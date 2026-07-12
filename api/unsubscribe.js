// ─────────────────────────────────────────────────────────────────────────────
// Vercel Serverless Function — /api/unsubscribe?email=...
// Désinscrit une adresse de la newsletter (lien cliqué depuis l'email)
// ─────────────────────────────────────────────────────────────────────────────

const SB_URL = process.env.SUPABASE_URL || "https://jxxgafyqfbnqieiqltcn.supabase.co";

function page(message) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Désinscription</title></head>
<body style="margin:0;font-family:Georgia,serif;background:#FBF8F4;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:420px;text-align:center;padding:2rem;">
    <p style="font-size:22px;color:#3E5A70;font-style:italic;margin:0 0 .5rem;">à contre-temps</p>
    <p style="font-size:15px;color:#2B2925;line-height:1.6;">${message}</p>
    <a href="https://fournilvivant.fr" style="display:inline-block;margin-top:1.5rem;color:#7C97AC;font-size:13px;">Retour au site</a>
  </div>
</body></html>`;
}

export default async function handler(req, res) {
  const email = String(req.query.email || "").trim().toLowerCase();
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (!email) return res.status(400).send(page("Lien de désinscription invalide."));

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) return res.status(500).send(page("Erreur technique, réessayez plus tard."));

  try {
    await fetch(SB_URL + "/rest/v1/newsletter_subscribers?email=eq." + encodeURIComponent(email), {
      method: "DELETE",
      headers: { "apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY, "Prefer": "return=minimal" },
    });
    return res.status(200).send(page("Vous êtes bien désinscrit du menu de la semaine. À bientôt !"));
  } catch {
    return res.status(500).send(page("Erreur lors de la désinscription, réessayez plus tard."));
  }
}
