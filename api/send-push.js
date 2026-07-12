// ─────────────────────────────────────────────────────────────────────────────
// Vercel Serverless Function — /api/send-push
// action "count" : nombre d'abonnés · action "send" : envoie la notification
// Protégée par NEWSLETTER_TOKEN. Signe avec les clés VAPID.
// ─────────────────────────────────────────────────────────────────────────────

import webpush from "web-push";

const SB_URL = process.env.SUPABASE_URL || "https://jxxgafyqfbnqieiqltcn.supabase.co";

async function sb(path, opts = {}) {
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(SB_URL + "/rest/v1/" + path, {
    ...opts,
    headers: { "apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { token, action, title, body, url } = req.body || {};
  if (!process.env.NEWSLETTER_TOKEN || token !== process.env.NEWSLETTER_TOKEN) {
    return res.status(401).json({ error: "Jeton invalide" });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "Service key manquante" });
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: "Clés VAPID manquantes" });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:acontretemps@fournilvivant.fr",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  let subs = [];
  try {
    const r = await sb("push_subscriptions?select=id,endpoint,p256dh,auth");
    subs = await r.json();
    if (!Array.isArray(subs)) subs = [];
  } catch {
    return res.status(500).json({ error: "Lecture des abonnés impossible" });
  }

  if (action === "count") return res.status(200).json({ count: subs.length });
  if (action !== "send") return res.status(400).json({ error: "Action inconnue" });
  if (!title) return res.status(400).json({ error: "Titre requis" });

  const payload = JSON.stringify({ title, body: body || "", url: url || "https://fournilvivant.fr" });

  let sent = 0;
  const deadIds = [];
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      );
      sent++;
    } catch (err) {
      // 404 / 410 = abonnement expiré → on le supprimera
      if (err.statusCode === 404 || err.statusCode === 410) deadIds.push(s.id);
    }
  }));

  // Nettoyage des abonnements expirés
  if (deadIds.length) {
    try { await sb(`push_subscriptions?id=in.(${deadIds.join(",")})`, { method: "DELETE", headers: { Prefer: "return=minimal" } }); } catch {}
  }

  return res.status(200).json({ sent, total: subs.length, removed: deadIds.length });
}
