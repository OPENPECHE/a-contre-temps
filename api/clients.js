// ─────────────────────────────────────────────────────────────────────────────
// Vercel Serverless Function — /api/clients
// Gestion de la base client (protégée par NEWSLETTER_TOKEN, clé service_role)
//   action "list"       : liste fusionnée (comptes + invités) + statut newsletter
//   action "update"     : modifie les infos d'un compte (clients table)
//   action "password"   : change le mot de passe d'un compte (Auth admin)
//   action "newsletter" : inscrit / désinscrit une adresse à la newsletter
// ─────────────────────────────────────────────────────────────────────────────

const SB_URL = process.env.SUPABASE_URL || "https://jxxgafyqfbnqieiqltcn.supabase.co";

function sb(path, opts = {}) {
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(SB_URL + "/rest/v1/" + path, {
    ...opts,
    headers: { "apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
}
function authAdmin(path, opts = {}) {
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(SB_URL + "/auth/v1/admin/" + path, {
    ...opts,
    headers: { "apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { token, action } = req.body || {};
  if (!process.env.NEWSLETTER_TOKEN || token !== process.env.NEWSLETTER_TOKEN) {
    return res.status(401).json({ error: "Jeton invalide" });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "Service key manquante" });

  try {
    // ── LISTE fusionnée ──────────────────────────────────────────────────────
    if (action === "list") {
      const [accsR, ordersR, subsR] = await Promise.all([
        sb("clients?select=id,email,name,phone,address,city,zip"),
        sb("orders?select=name,email,phone,total,created_at&order=created_at.desc"),
        sb("newsletter_subscribers?select=email&active=eq.true"),
      ]);
      const accounts = await accsR.json().catch(() => []);
      const orders = await ordersR.json().catch(() => []);
      const subs = await subsR.json().catch(() => []);
      const subSet = new Set((Array.isArray(subs) ? subs : []).map(s => (s.email || "").toLowerCase()));

      const map = {};
      (Array.isArray(accounts) ? accounts : []).forEach(a => {
        const key = (a.email || "").toLowerCase();
        if (!key) return;
        map[key] = { id: a.id, email: a.email, name: a.name || "", phone: a.phone || "",
          address: a.address || "", city: a.city || "", zip: a.zip || "",
          hasAccount: true, orders: 0, total: 0, last: null };
      });
      (Array.isArray(orders) ? orders : []).forEach(o => {
        const key = (o.email || "").toLowerCase();
        if (!key) return;
        if (!map[key]) map[key] = { id: null, email: o.email, name: o.name || "", phone: o.phone || "",
          address: "", city: "", zip: "", hasAccount: false, orders: 0, total: 0, last: null };
        const c = map[key];
        c.orders++; c.total += Number(o.total) || 0;
        if (!c.name && o.name) c.name = o.name;
        if (!c.phone && o.phone) c.phone = o.phone;
        if (!c.last || new Date(o.created_at) > new Date(c.last)) c.last = o.created_at;
      });
      const list = Object.values(map).map(c => ({ ...c, newsletter: subSet.has(c.email.toLowerCase()) }))
        .sort((a, b) => new Date(b.last || 0) - new Date(a.last || 0));
      return res.status(200).json({ clients: list });
    }

    // ── MODIFIER les infos d'un compte ─────────────────────────────────────────
    if (action === "update") {
      const { id, name, phone, address, city, zip } = req.body;
      if (!id) return res.status(400).json({ error: "Ce client n'a pas de compte modifiable." });
      const r = await sb("clients?id=eq." + id, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ name, phone, address, city, zip }),
      });
      if (!r.ok) return res.status(500).json({ error: "Modification impossible" });
      return res.status(200).json({ success: true });
    }

    // ── CHANGER le mot de passe d'un compte ────────────────────────────────────
    if (action === "password") {
      const { id, password } = req.body;
      if (!id) return res.status(400).json({ error: "Ce client n'a pas de compte." });
      if (!password || password.length < 6) return res.status(400).json({ error: "Mot de passe trop court (min 6)." });
      const r = await authAdmin("users/" + id, { method: "PUT", body: JSON.stringify({ password }) });
      if (!r.ok) return res.status(500).json({ error: "Changement de mot de passe impossible" });
      return res.status(200).json({ success: true });
    }

    // ── INSCRIRE / DÉSINSCRIRE de la newsletter ────────────────────────────────
    if (action === "newsletter") {
      const { email, subscribe } = req.body;
      const clean = String(email || "").trim().toLowerCase();
      if (!clean) return res.status(400).json({ error: "Email requis" });
      if (subscribe) {
        await sb("newsletter_subscribers", {
          method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ email: clean, active: true }),
        });
      } else {
        await sb("newsletter_subscribers?email=eq." + encodeURIComponent(clean), {
          method: "DELETE", headers: { Prefer: "return=minimal" },
        });
      }
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Action inconnue" });
  } catch (e) {
    console.error("clients error:", e);
    return res.status(500).json({ error: e.message });
  }
}
