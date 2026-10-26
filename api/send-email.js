// ─────────────────────────────────────────────────────────────────────────────
// Vercel Serverless Function — /api/send-email
// Types d'e-mails (champ "type" du corps JSON) :
//   "received"  (défaut) → accusé de réception au CLIENT + notification au FOURNIL
//   "confirmed"           → confirmation de commande au CLIENT (uniquement)
//   "welcome"             → e-mail de bienvenue au nouveau CLIENT (uniquement)
// Tout passe par Resend, depuis l'adresse de marque à contre-temps.
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

// En-tête + pied de page de marque, partagés par tous les e-mails clients.
function shell(bodyHtml) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#EDF0F3;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#FBF8F4;border-radius:12px;overflow:hidden;">
    <div style="background:#3E5A70;padding:1.9rem 2rem;text-align:center;">
      <img src="https://www.fournilvivant.fr/heart-cream.png" width="42" alt="" style="display:block;margin:0 auto .55rem;" />
      <p style="font-size:26px;color:#F3E7DA;margin:0;font-style:italic;font-family:Georgia,'Times New Roman',serif;">à contre-temps</p>
      <p style="font-size:10px;letter-spacing:.22em;color:rgba(243,231,218,.7);margin:.4rem 0 0;">FOURNIL VIVANT · CRÉATEUR D'INSTANTS</p>
    </div>
    <div style="padding:2rem;">
      ${bodyHtml}
    </div>
    <div style="padding:1.25rem 2rem;border-top:1px solid #D6DFE5;text-align:center;">
      <p style="font-size:11px;color:rgba(43,41,37,.5);line-height:1.7;">
        <strong>à contre-temps — Fournil vivant</strong><br>
        4 rue des Vignes Rousses, 63360 Gerzat · SIRET 108 719 105 00018<br>
        TVA non applicable, art. 293 B du CGI<br>
        <a href="https://fournilvivant.fr" style="color:#7C97AC;">fournilvivant.fr</a> · ${OWNER}<br>
        <a href="https://www.fournilvivant.fr/mentions-legales" style="color:#7C97AC;">Mentions légales</a> · <a href="https://www.fournilvivant.fr/cgv" style="color:#7C97AC;">CGV</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function recapBlock(invoiceNum, items, total, note) {
  return `
      <div style="background:#F3E7DA;border-radius:8px;padding:1.25rem;margin-bottom:1.5rem;">
        <p style="font-size:10px;letter-spacing:.14em;color:#A6713F;margin:0 0 .75rem;">RÉCAPITULATIF — ${invoiceNum}</p>
        ${items.map(it => `
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:.35rem 0;border-bottom:1px solid rgba(166,113,63,.15);">
          <span>${it.name} × ${it.qty}</span>
          <span style="color:rgba(43,41,37,.6)">${(it.price * it.qty).toFixed(2)} €</span>
        </div>`).join("")}
        <div style="display:flex;justify-content:space-between;font-size:15px;padding:.75rem 0 0;margin-top:.25rem;border-top:1px solid rgba(43,41,37,.15);">
          <strong>Total</strong>
          <strong>${total} €</strong>
        </div>
        <p style="font-size:10px;color:rgba(43,41,37,.5);margin:.6rem 0 0;">TVA non applicable, art. 293 B du CGI</p>
      </div>
      ${note ? `<p style="font-size:13px;color:rgba(43,41,37,.6);margin-bottom:1.5rem;padding:.75rem;background:#F0F3F5;border-radius:6px;"><strong>Note :</strong> ${note}</p>` : ""}`;
}

function siteButton(label = "VOIR LE SITE", href = "https://fournilvivant.fr") {
  return `<a href="${href}" style="display:inline-block;padding:.75rem 1.5rem;background:#3E5A70;color:#F3E7DA;border-radius:999px;font-size:11px;letter-spacing:.12em;text-decoration:none;">${label}</a>`;
}
function reviewBlock() {
  return `
      <div style="margin:1.5rem 0 0;padding:1.1rem 1.25rem;background:#F3E7DA;border-radius:10px;text-align:center;">
        <div style="font-size:20px;color:#F4B400;letter-spacing:3px;">★★★★★</div>
        <p style="font-size:13.5px;color:rgba(43,41,37,.75);margin:.4rem 0 .8rem;">Vous avez aimé&nbsp;? Votre avis nous aide énormément.</p>
        <a href="https://www.fournilvivant.fr/avis" style="display:inline-block;padding:.7rem 1.4rem;background:#3E5A70;color:#F3E7DA;border-radius:999px;font-size:12px;letter-spacing:.06em;text-decoration:none;font-weight:600;">Laisser un avis Google</a>
      </div>`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(500).json({ error: "Resend API key not configured" });

  const type = (req.body && req.body.type) || "received";

  // ───────────────────────── E-MAIL DE BIENVENUE ─────────────────────────────
  if (type === "welcome") {
    const client = req.body.client || {};
    if (!client.email) return res.status(400).json({ error: "Missing client email" });
    const firstName = (client.name || "").split(" ")[0] || "";
    const body = `
      <h1 style="font-size:22px;font-weight:400;color:#3E5A70;margin:0 0 .5rem;">Bienvenue chez à contre-temps 🌾</h1>
      <p style="font-size:14px;color:rgba(43,41,37,.7);line-height:1.8;margin:0 0 1.25rem;">
        Bonjour ${firstName}, votre compte est créé — merci et bienvenue dans la maison&nbsp;!
        Vous pouvez désormais commander en quelques clics et retrouver vos informations à chaque fois.
      </p>
      <div style="background:#F3E7DA;border-radius:8px;padding:1.25rem;margin-bottom:1.5rem;">
        <p style="font-size:13px;color:rgba(43,41,37,.75);line-height:1.8;margin:0;">
          🥖 <strong>Votre carte de fidélité</strong> est active : 1 achat = 1 tampon, et au bout de 10,
          votre pain (ou votre douceur) préféré vous est offert.
        </p>
      </div>
      <p style="font-size:13px;color:rgba(43,41,37,.7);line-height:1.7;margin-bottom:1.5rem;">
        À très vite sur le marché ou en livraison&nbsp;!
      </p>
      ${siteButton("COMMANDER", "https://www.fournilvivant.fr/commander")}`;
    const html = shell(body);
    const text =
      `Bonjour ${firstName},\n\n` +
      `Bienvenue chez à contre-temps — votre compte est créé !\n\n` +
      `Votre carte de fidélité est active : 1 achat = 1 tampon, 10 tampons = un produit offert.\n\n` +
      `Commander : https://www.fournilvivant.fr/commander\n\n` +
      `à contre-temps — Fournil vivant\nhttps://fournilvivant.fr`;
    try {
      const r = await sendEmail(RESEND_API_KEY, {
        from: FROM, to: [client.email], reply_to: OWNER,
        subject: "Bienvenue chez à contre-temps 🌾", html, text,
      });
      if (!r.ok) console.error("Resend welcome error:", r.status, r.data);
      return res.status(200).json({ welcome: { ok: r.ok, status: r.status, error: r.ok ? null : r.data } });
    } catch (e) {
      console.error("Send welcome error:", e);
      return res.status(500).json({ error: e.message });
    }
  }

  // ───────────────────────── TICKET DE CAISSE ────────────────────────────────
  if (type === "ticket") {
    const t = req.body.ticket || {};
    if (!t.email) return res.status(400).json({ error: "Missing email" });
    const items = Array.isArray(t.items) ? t.items : [];
    const money = (n) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace(".", ",") + " €";
    const PAY = { especes: "espèces", carte: "carte bancaire", sumup: "carte bancaire (SumUp)" };
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    let when = "";
    try { when = new Date(t.created_at || Date.now()).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { /* */ }
    const rows = items.map((l) => `<tr><td style="padding:5px 0;font-size:13px;color:#2B2925;">${Number(l.qty) || 1}× ${esc(l.name)}</td><td style="padding:5px 0;font-size:13px;text-align:right;color:#2B2925;white-space:nowrap;">${money((Number(l.price) || 0) * (Number(l.qty) || 0))}</td></tr>`).join("");
    const body = `
      <h1 style="font-size:20px;font-weight:400;color:#3E5A70;margin:0 0 .2rem;">Votre ticket 🧾</h1>
      <p style="font-size:12.5px;color:rgba(43,41,37,.6);margin:0 0 1rem;">à contre-temps — Fournil vivant · ${esc(when)}</p>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #E6DFD3;border-bottom:1px solid #E6DFD3;">${rows}</table>
      <p style="font-size:18px;font-weight:600;color:#3E5A70;text-align:right;margin:.8rem 0 .15rem;">Total : ${money(t.total)}</p>
      <p style="font-size:12px;color:rgba(43,41,37,.6);text-align:right;margin:0 0 1.3rem;">Payé en ${esc(PAY[t.payment_method] || t.payment_method || "")}</p>
      <p style="font-size:13px;color:rgba(43,41,37,.7);line-height:1.7;">Merci pour votre achat et à très vite, sur le marché ou en livraison&nbsp;!</p>`;
    const html = shell(body);
    const text = `Votre ticket — à contre-temps\n${when}\n\n` +
      items.map((l) => `${Number(l.qty) || 1}x ${l.name}  ${money((Number(l.price) || 0) * (Number(l.qty) || 0))}`).join("\n") +
      `\n\nTotal : ${money(t.total)} (payé ${PAY[t.payment_method] || t.payment_method || ""})\n\nMerci ! https://fournilvivant.fr`;
    try {
      const r = await sendEmail(RESEND_API_KEY, { from: FROM, to: [t.email], reply_to: OWNER, subject: "Votre ticket — à contre-temps 🧾", html, text });
      if (!r.ok) console.error("Resend ticket error:", r.status, r.data);
      return res.status(200).json({ ticket: { ok: r.ok, status: r.status, error: r.ok ? null : r.data } });
    } catch (e) {
      console.error("Send ticket error:", e);
      return res.status(500).json({ error: e.message });
    }
  }

  // ───────────────── E-MAILS LIÉS À UNE COMMANDE (received / confirmed) ───────
  const { order } = req.body;
  if (!order?.email) return res.status(400).json({ error: "Missing order data" });

  const items = Array.isArray(order.items) ? order.items : [];
  const invoiceNum = "ACT-" + String(order.id || "").toUpperCase().slice(-8);
  const firstName = (order.name || "").split(" ")[0] || "";
  const total = Number(order.total).toFixed(2);

  // ── Confirmation de commande (déclenchée depuis le back-office) ─────────────
  if (type === "confirmed") {
    const retrait = order.shipping || "";
    const quand = order.pickup_date
      ? new Date(order.pickup_date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
      : "";
    const body = `
      <h1 style="font-size:22px;font-weight:400;color:#3E5A70;margin:0 0 .5rem;">Votre commande est confirmée ✓</h1>
      <p style="font-size:14px;color:rgba(43,41,37,.7);line-height:1.8;margin:0 0 1.25rem;">
        Bonjour ${firstName}, bonne nouvelle&nbsp;: votre commande est confirmée et prise en compte.
        Nous la préparons avec soin${quand ? ` pour le <strong>${quand}</strong>` : ""}${retrait ? ` — ${retrait}` : ""}.
      </p>
      ${recapBlock(invoiceNum, items, total, order.note)}
      <p style="font-size:13px;color:rgba(43,41,37,.7);line-height:1.7;margin-bottom:1.5rem;">
        À très bientôt, et merci de votre confiance&nbsp;!
      </p>
      ${siteButton()}
      ${reviewBlock()}`;
    const html = shell(body);
    const text =
      `Bonjour ${firstName},\n\n` +
      `Votre commande ${invoiceNum} est confirmée et prise en compte.\n` +
      (quand ? `Préparation pour le ${quand}.\n` : "") +
      (retrait ? `${retrait}\n` : "") +
      `\n` +
      items.map(it => `- ${it.name} x${it.qty} : ${(it.price * it.qty).toFixed(2)} €`).join("\n") +
      `\nTotal : ${total} €\n\n` +
      `Merci de votre confiance !\n\nà contre-temps — Fournil vivant\nhttps://fournilvivant.fr`;
    try {
      const r = await sendEmail(RESEND_API_KEY, {
        from: FROM, to: [order.email], reply_to: OWNER,
        subject: `Votre commande ${invoiceNum} est confirmée — à contre-temps`, html, text,
      });
      if (!r.ok) console.error("Resend confirmed error:", r.status, r.data);
      return res.status(200).json({ confirmed: { ok: r.ok, status: r.status, error: r.ok ? null : r.data } });
    } catch (e) {
      console.error("Send confirmed error:", e);
      return res.status(500).json({ error: e.message });
    }
  }

  // ── Accusé de réception (type "received", par défaut) ──────────────────────
  const clientBody = `
      <h1 style="font-size:22px;font-weight:400;color:#3E5A70;margin:0 0 .5rem;">Commande reçue ✓</h1>
      <p style="font-size:14px;color:rgba(43,41,37,.6);margin:0 0 1.5rem;">Bonjour ${firstName}, merci pour votre commande ! Nous revenons vers vous très vite pour la confirmer.</p>
      ${recapBlock(invoiceNum, items, total, order.note)}
      <p style="font-size:13px;color:rgba(43,41,37,.7);line-height:1.7;margin-bottom:1.5rem;">
        Nous vous confirmerons votre commande par email ou par téléphone, et vous communiquerons les modalités de livraison ou de retrait.
      </p>
      ${siteButton()}`;
  const clientHtml = shell(clientBody);

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
    <div style="background:#3E5A70;padding:1.25rem 1.5rem;display:flex;align-items:center;gap:10px;">
      <img src="https://www.fournilvivant.fr/heart-cream.png" width="26" alt="" style="display:inline-block;" />
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

    return res.status(200).json({
      client: { ok: client.ok, status: client.status, error: client.ok ? null : client.data },
      owner: { ok: owner.ok, status: owner.status, error: owner.ok ? null : owner.data },
    });
  } catch (e) {
    console.error("Send email error:", e);
    return res.status(500).json({ error: e.message });
  }
}
