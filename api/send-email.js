// ─────────────────────────────────────────────────────────────────────────────
// Vercel Serverless Function — /api/send-email
// Envoie un email de confirmation au client via Resend
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { order } = req.body;
  if (!order?.email) return res.status(400).json({ error: "Missing order data" });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(500).json({ error: "Resend API key not configured" });

  const items = Array.isArray(order.items) ? order.items : [];
  const invoiceNum = "ACT-" + order.id.toUpperCase().slice(-8);
  const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#EDF0F3;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#FBF8F4;border-radius:12px;overflow:hidden;">

    <!-- Header -->
    <div style="background:#7C97AC;padding:2rem;text-align:center;">
      <p style="font-size:22px;color:#F3E7DA;margin:0;font-style:italic;">à contre-temps</p>
      <p style="font-size:10px;letter-spacing:.2em;color:rgba(243,231,218,.65);margin:.3rem 0 0;">FOURNIL VIVANT</p>
    </div>

    <!-- Body -->
    <div style="padding:2rem;">
      <h1 style="font-size:22px;font-weight:400;color:#3E5A70;margin:0 0 .5rem;">Commande reçue ✓</h1>
      <p style="font-size:14px;color:rgba(43,41,37,.6);margin:0 0 1.5rem;">Bonjour ${order.name.split(" ")[0]}, merci pour votre commande ! Nous revenons vers vous très vite pour confirmer.</p>

      <!-- Récap commande -->
      <div style="background:#F3E7DA;border-radius:8px;padding:1.25rem;margin-bottom:1.5rem;">
        <p style="font-size:10px;letter-spacing:.14em;color:#A6713F;margin:0 0 .75rem;">RÉCAPITULATIF — ${invoiceNum}</p>
        ${items.map(it => `
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:.35rem 0;border-bottom:1px solid rgba(166,113,63,.15);">
          <span>${it.name} × ${it.qty}</span>
          <span style="color:rgba(43,41,37,.6)">${(it.price * it.qty).toFixed(2)} €</span>
        </div>`).join("")}
        <div style="display:flex;justify-content:space-between;font-size:15px;padding:.75rem 0 0;margin-top:.25rem;border-top:1px solid rgba(43,41,37,.15);">
          <strong>Total indicatif</strong>
          <strong>${Number(order.total).toFixed(2)} €</strong>
        </div>
      </div>

      ${order.note ? `<p style="font-size:13px;color:rgba(43,41,37,.6);margin-bottom:1.5rem;padding:.75rem;background:#F0F3F5;border-radius:6px;"><strong>Note :</strong> ${order.note}</p>` : ""}

      <p style="font-size:13px;color:rgba(43,41,37,.7);line-height:1.7;margin-bottom:1.5rem;">
        Nous vous confirmerons votre commande par email ou par téléphone, et vous communiquerons les modalités de livraison ou de retrait.
      </p>

      <a href="https://fournilvivant.fr" style="display:inline-block;padding:.75rem 1.5rem;background:#3E5A70;color:#F3E7DA;border-radius:999px;font-size:11px;letter-spacing:.12em;text-decoration:none;">
        VOIR MON COMPTE
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:1.25rem 2rem;border-top:1px solid #D6DFE5;text-align:center;">
      <p style="font-size:11px;color:rgba(43,41,37,.45);line-height:1.7;">
        à contre-temps — Fournil vivant<br>
        <a href="https://fournilvivant.fr" style="color:#7C97AC;">fournilvivant.fr</a> · acontretemps@fournilvivant.fr
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "à contre-temps <acontretemps@fournilvivant.fr>",
        to: [order.email],
        bcc: ["acontretemps@fournilvivant.fr"],
        subject: `Commande reçue — ${invoiceNum}`,
        html,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Resend error:", err);
      return res.status(500).json({ error: "Email sending failed" });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error("Send email error:", e);
    return res.status(500).json({ error: e.message });
  }
}
