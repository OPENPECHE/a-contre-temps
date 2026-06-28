// ─────────────────────────────────────────────────────────────────────────────
// Vercel Serverless Function — /api/send-email
// Envoie 2 emails via Resend :
//   1. Accusé de réception au CLIENT (to: client)
//   2. Notification de nouvelle commande au FOURNIL (to: acontretemps@…)
// ─────────────────────────────────────────────────────────────────────────────

const OWNER = "acontretemps@fournilvivant.fr";
const FROM = "à contre-temps <acontretemps@fournilvivant.fr>";

async function sendEmail(apiKey, payload) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  let data = {};
  try { data = await r.json(); } catch { /* corps vide */ }
  return { ok: r.ok, status: r.status, data };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { order } = req.body;
  if (!order?.email) return res.status(400).json({ error: "Missing order data" });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(500).json({ error: "Resend API key not configured" });

  const items = Array.isArray(order.items) ? order.items : [];
  const invoiceNum = "ACT-" + order.id.toUpperCase().slice(-8);
  const firstName = (order.name || "").split(" ")[0] || "";
  const total = Number(order.total).toFixed(2);

  // ── Email CLIENT : accusé de réception ─────────────────────────────────────
  const clientHtml = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#EDF0F3;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#FBF8F4;border-radius:12px;overflow:hidden;">
    <div style="background:#7C97AC;padding:2rem;text-align:center;">
      <p style="font-size:22px;color:#F3E7DA;margin:0;font-style:italic;">à contre-temps</p>
      <p style="font-size:10px;letter-spacing:.2em;color:rgba(243,231,218,.65);margin:.3rem 0 0;">FOURNIL VIVANT</p>
    </div>
    <div style="padding:2rem;">
      <h1 style="font-size:22px;font-weight:400;color:#3E5A70;margin:0 0 .5rem;">Commande reçue ✓</h1>
      <p style="font-size:14px;color:rgba(43,41,37,.6);margin:0 0 1.5rem;">Bonjour ${firstName}, merci pour votre commande ! Nous revenons vers vous très vite pour confirmer.</p>
      <div style="background:#F3E7DA;border-radius:8px;padding:1.25rem;margin-bottom:1.5rem;">
        <p style="font-size:10px;letter-spacing:.14em;color:#A6713F;margin:0 0 .75rem;">RÉCAPITULATIF — ${invoiceNum}</p>
        ${items.map(it => `
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:.35rem 0;border-bottom:1px solid rgba(166,113,63,.15);">
          <span>${it.name} × ${it.qty}</span>
          <span style="color:rgba(43,41,37,.6)">${(it.price * it.qty).toFixed(2)} €</span>
        </div>`).join("")}
        <div style="display:flex;justify-content:space-between;font-size:15px;padding:.75rem 0 0;margin-top:.25rem;border-top:1px solid rgba(43,41,37,.15);">
          <strong>Total indicatif</strong>
          <strong>${total} €</strong>
        </div>
      </div>
      ${order.note ? `<p style="font-size:13px;color:rgba(43,41,37,.6);margin-bottom:1.5rem;padding:.75rem;background:#F0F3F5;border-radius:6px;"><strong>Note :</strong> ${order.note}</p>` : ""}
      <p style="font-size:13px;color:rgba(43,41,37,.7);line-height:1.7;margin-bottom:1.5rem;">
        Nous vous confirmerons votre commande par email ou par téléphone, et vous communiquerons les modalités de livraison ou de retrait.
      </p>
      <a href="https://fournilvivant.fr" style="display:inline-block;padding:.75rem 1.5rem;background:#3E5A70;color:#F3E7DA;border-radius:999px;font-size:11px;letter-spacing:.12em;text-decoration:none;">
        VOIR LE SITE
      </a>
    </div>
    <div style="padding:1.25rem 2rem;border-top:1px solid #D6DFE5;text-align:center;">
      <p style="font-size:11px;color:rgba(43,41,37,.45);line-height:1.7;">
        à contre-temps — Fournil vivant<br>
        <a href="https://fournilvivant.fr" style="color:#7C97AC;">fournilvivant.fr</a> · ${OWNER}
      </p>
    </div>
  </div>
</body>
</html>`;

  // Version texte (améliore nettement la délivrabilité, évite le spam)
  const clientText =
    `Bonjour ${firstName},\n\n` +
    `Merci pour votre commande ${invoiceNum} !\n\n` +
    items.map(it => `- ${it.name} x${it.qty} : ${(it.price * it.qty).toFixed(2)} €`).join("\n") +
    `\nTotal indicatif : ${total} €\n` +
    (order.note ? `\nNote : ${order.note}\n` : "") +
    `\nNous revenons vers vous très vite pour confirmer et organiser la livraison ou le retrait.\n\n` +
    `à contre-temps — Fournil vivant\nhttps://fournilvivant.fr`;

  // ── Email FOURNIL : notification de nouvelle commande ──────────────────────
  const ownerHtml = `
<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#EDF0F3;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #D6DFE5;">
    <div style="background:#3E5A70;padding:1.25rem 1.5rem;">
      <p style="font-size:16px;color:#F3E7DA;margin:0;">Nouvelle commande — ${invoiceNum}</p>
    </div>
    <div style="padding:1.5rem;">
      <table style="width:100%;font-size:14px;color:#2B2925;border-collapse:collapse;">
        <tr><td style="color:#888;padding:4px 0;">Client</td><td style="text-align:right;">${order.name || "—"}</td></tr>
        <tr><td style="color:#888;padding:4px 0;">Email</td><td style="text-align:right;">${order.email}</td></tr>
        <tr><td style="color:#888;padding:4px 0;">Téléphone</td><td style="text-align:right;">${order.phone || "—"}</td></tr>
        <tr><td style="color:#888;padding:4px 0;">Livraison</td><td style="text-align:right;">${order.shipping || "—"}</td></tr>
        <tr><td style="color:#888;padding:4px 0;">Date souhaitée</td><td style="text-align:right;">${order.pickup_date || "—"}</td></tr>
        <tr><td style="color:#888;padding:4px 0;">Paiement</td><td style="text-align:right;">${order.payment_method || "—"}</td></tr>
      </table>
      <div style="border-top:1px solid #eee;margin-top:1rem;padding-top:1rem;">
        ${items.map(it => `<div style="display:flex;justify-content:space-between;font-size:14px;padding:3px 0;"><span>${it.name} × ${it.qty}</span><span>${(it.price * it.qty).toFixed(2)} €</span></div>`).join("")}
        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:bold;padding-top:8px;margin-top:4px;border-top:1px solid #ddd;"><span>Total</span><span>${total} €</span></div>
      </div>
      ${order.note ? `<p style="font-size:13px;color:#555;margin-top:1rem;padding:.75rem;background:#F3E7DA;border-radius:6px;"><strong>Note :</strong> ${order.note}</p>` : ""}
    </div>
  </div>
</body>
</html>`;

  try {
    // 1) Accusé de réception au client
    const client = await sendEmail(RESEND_API_KEY, {
      from: FROM,
      to: [order.email],
      reply_to: OWNER,
      subject: `Votre commande ${invoiceNum} — à contre-temps`,
      html: clientHtml,
      text: clientText,
    });

    // 2) Notification au fournil
    const owner = await sendEmail(RESEND_API_KEY, {
      from: FROM,
      to: [OWNER],
      reply_to: order.email,
      subject: `Nouvelle commande ${invoiceNum} — ${order.name || ""}`,
      html: ownerHtml,
    });

    if (!client.ok) console.error("Resend client error:", client.status, client.data);
    if (!owner.ok) console.error("Resend owner error:", owner.status, owner.data);

    // On renvoie le détail pour pouvoir diagnostiquer côté navigateur si besoin
    return res.status(200).json({
      client: { ok: client.ok, status: client.status, error: client.ok ? null : client.data },
      owner: { ok: owner.ok, status: owner.status, error: owner.ok ? null : owner.data },
    });
  } catch (e) {
    console.error("Send email error:", e);
    return res.status(500).json({ error: e.message });
  }
}
