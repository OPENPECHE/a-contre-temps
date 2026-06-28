// ─────────────────────────────────────────────────────────────────────────────
// Vercel Serverless Function — /api/contact
// Envoie le message du formulaire de contact au fournil (via Resend)
// ─────────────────────────────────────────────────────────────────────────────

const OWNER = "acontretemps@fournilvivant.fr";
const FROM = "à contre-temps <acontretemps@fournilvivant.fr>";

const esc = (s) => String(s || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { nom, email, message } = req.body || {};
  if (!email || !message) return res.status(400).json({ error: "Email et message requis" });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(500).json({ error: "Resend API key not configured" });

  const html = `
<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#EDF0F3;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #D6DFE5;">
    <div style="background:#3E5A70;padding:1.25rem 1.5rem;">
      <p style="font-size:16px;color:#F3E7DA;margin:0;">Nouveau message — formulaire de contact</p>
    </div>
    <div style="padding:1.5rem;color:#2B2925;">
      <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:1rem;">
        <tr><td style="color:#888;padding:4px 0;width:90px;">Nom</td><td>${esc(nom) || "—"}</td></tr>
        <tr><td style="color:#888;padding:4px 0;">Email</td><td>${esc(email)}</td></tr>
      </table>
      <div style="background:#F3E7DA;border-radius:8px;padding:1rem;font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(message)}</div>
    </div>
  </div>
</body>
</html>`;

  const text = `Nouveau message du site fournilvivant.fr\n\nNom : ${nom || "—"}\nEmail : ${email}\n\nMessage :\n${message}`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [OWNER],
        reply_to: email,
        subject: `Message du site — ${nom || email}`,
        html,
        text,
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("Resend contact error:", err);
      return res.status(500).json({ error: "Envoi impossible" });
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error("Send contact error:", e);
    return res.status(500).json({ error: e.message });
  }
}
