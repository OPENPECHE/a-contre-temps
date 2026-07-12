// ─────────────────────────────────────────────────────────────────────────────
// Vercel Serverless Function — /api/newsletter
// action "count" : nombre d'inscrits · action "send" : envoie l'annonce à tous
// Protégée par un jeton (NEWSLETTER_TOKEN). Lit les inscrits via la clé service_role.
// ─────────────────────────────────────────────────────────────────────────────

const SB_URL = process.env.SUPABASE_URL || "https://jxxgafyqfbnqieiqltcn.supabase.co";
const FROM = "à contre-temps <acontretemps@fournilvivant.fr>";

const esc = (s) => String(s || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function buildHtml(subject, message, link, unsub) {
  const paragraphs = String(message || "").split(/\n{2,}/)
    .map(p => `<p style="font-size:15px;color:#2B2925;line-height:1.7;margin:0 0 1rem;">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#EDF0F3;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#FBF8F4;border-radius:12px;overflow:hidden;">
    <div style="background:#7C97AC;padding:2rem;text-align:center;">
      <p style="font-size:22px;color:#F3E7DA;margin:0;font-style:italic;">à contre-temps</p>
      <p style="font-size:10px;letter-spacing:.2em;color:rgba(243,231,218,.65);margin:.3rem 0 0;">FOURNIT LE VIVANT · CRÉATEUR D'INSTANTS</p>
    </div>
    <div style="padding:2rem;">
      <h1 style="font-size:22px;font-weight:400;color:#3E5A70;margin:0 0 1.25rem;">${esc(subject)}</h1>
      ${paragraphs}
      ${link ? `<a href="${esc(link)}" style="display:inline-block;margin-top:.5rem;padding:.75rem 1.5rem;background:#A6713F;color:#F3E7DA;border-radius:999px;font-size:11px;letter-spacing:.12em;text-decoration:none;">DÉCOUVRIR</a>` : ""}
    </div>
    <div style="padding:1.25rem 2rem;border-top:1px solid #D6DFE5;text-align:center;">
      <p style="font-size:11px;color:rgba(43,41,37,.45);line-height:1.7;">
        à contre-temps — Fournil vivant · <a href="https://fournilvivant.fr" style="color:#7C97AC;">fournilvivant.fr</a><br>
        Vous recevez cet email car vous êtes inscrit au menu de la semaine.${unsub ? `<br><a href="${unsub}" style="color:#7C97AC;">Se désinscrire</a>` : ""}
      </p>
    </div>
  </div>
</body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { token, action, subject, message, link } = req.body || {};
  if (!process.env.NEWSLETTER_TOKEN || token !== process.env.NEWSLETTER_TOKEN) {
    return res.status(401).json({ error: "Jeton invalide" });
  }

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!SERVICE_KEY) return res.status(500).json({ error: "Service key manquante" });

  // Récupère les inscrits actifs
  let subscribers = [];
  try {
    const r = await fetch(SB_URL + "/rest/v1/newsletter_subscribers?active=eq.true&select=email", {
      headers: { "apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY },
    });
    subscribers = await r.json();
    if (!Array.isArray(subscribers)) subscribers = [];
  } catch (e) {
    return res.status(500).json({ error: "Lecture des inscrits impossible" });
  }

  if (action === "count") {
    return res.status(200).json({ count: subscribers.length });
  }

  if (action !== "send") return res.status(400).json({ error: "Action inconnue" });
  if (!subject || !message) return res.status(400).json({ error: "Objet et message requis" });
  if (!RESEND_API_KEY) return res.status(500).json({ error: "Resend API key manquante" });
  if (subscribers.length === 0) return res.status(200).json({ sent: 0 });

  const unsubBase = "https://fournilvivant.fr/api/unsubscribe?email=";

  // Envoi par lots de 100 (limite de l'API batch Resend), un destinataire par message,
  // avec lien + en-tête de désinscription personnalisés (bon pour la délivrabilité + RGPD)
  let sent = 0;
  for (let i = 0; i < subscribers.length; i += 100) {
    const chunk = subscribers.slice(i, i + 100).map(s => {
      const unsub = unsubBase + encodeURIComponent(s.email);
      return {
        from: FROM, to: [s.email], reply_to: "acontretemps@fournilvivant.fr",
        subject,
        html: buildHtml(subject, message, link, unsub),
        text: `${subject}\n\n${message}${link ? `\n\n${link}` : ""}\n\n— à contre-temps · fournilvivant.fr\nSe désinscrire : ${unsub}`,
        headers: {
          "List-Unsubscribe": `<${unsub}>, <mailto:acontretemps@fournilvivant.fr?subject=Desinscription>`,
        },
      };
    });
    try {
      const r = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
      });
      if (r.ok) sent += chunk.length;
      else console.error("Resend batch error:", r.status, await r.text());
    } catch (e) {
      console.error("Batch exception:", e);
    }
  }

  return res.status(200).json({ sent, total: subscribers.length });
}
