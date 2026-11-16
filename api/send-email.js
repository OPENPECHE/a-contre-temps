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

// Le cœur de marque, embarqué en pièce jointe "inline" (cid:heartlogo) pour qu'il
// s'affiche TOUJOURS, même quand la messagerie bloque les images distantes.
let HEART_CACHE = null;
async function heartAttachment() {
  if (HEART_CACHE !== null) return HEART_CACHE;
  try {
    const r = await fetch("https://www.fournilvivant.fr/heart-cream.png");
    const buf = Buffer.from(await r.arrayBuffer());
    HEART_CACHE = { filename: "coeur.png", content: buf.toString("base64"), content_id: "heartlogo" };
  } catch { HEART_CACHE = false; }
  return HEART_CACHE;
}

async function sendEmail(apiKey, payload) {
  if (!payload.attachments) {
    const h = await heartAttachment();
    if (h) payload = { ...payload, attachments: [h] };
  }
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
<body style="margin:0;padding:0;background:#EDF0F3;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EDF0F3;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;background:#FBF8F4;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#3E5A70;padding:28px 24px;text-align:center;">
          <img src="cid:heartlogo" width="40" alt="" style="display:block;margin:0 auto 9px;border:0;outline:none;" />
          <div style="font-size:26px;color:#F3E7DA;font-style:italic;line-height:1;">à contre-temps</div>
          <div style="font-size:10px;letter-spacing:3px;color:#BBC9D4;margin-top:10px;">FOURNIL VIVANT &middot; CRÉATEUR D'INSTANTS</div>
        </td></tr>
        <tr><td style="padding:28px;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #D6DFE5;text-align:center;">
          <p style="font-size:11px;color:#8A857E;line-height:1.7;margin:0;">
            <strong style="color:#3E5A70;">à contre-temps — Fournil vivant</strong><br>
            4 rue des Vignes Rousses, 63360 Gerzat · SIRET 108 719 105 00018<br>
            TVA non applicable, art. 293 B du CGI<br>
            <a href="https://fournilvivant.fr" style="color:#7C97AC;">fournilvivant.fr</a> · ${OWNER}<br>
            <a href="https://www.fournilvivant.fr/mentions-legales" style="color:#7C97AC;">Mentions légales</a> · <a href="https://www.fournilvivant.fr/cgv" style="color:#7C97AC;">CGV</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
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

  // ───────────── NOTIFICATION FOURNIL : un devis a été accepté en ligne ───────
  if (type === "devis_accepted") {
    const d = req.body.devis || {};
    const money = (n) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace(".", ",") + " €";
    let when = "";
    try { when = new Date(d.signed_at || Date.now()).toLocaleString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { /* */ }
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const items = Array.isArray(d.items) ? d.items : [];
    const rows = items.map((it) => `<tr><td style="padding:4px 0;font-size:13px;color:#2B2925">${esc(it.label)}${it.qty ? (" × " + (Number(it.qty) || 0)) : ""}</td><td style="padding:4px 0;font-size:13px;text-align:right;color:#2B2925">${money((Number(it.qty) || 0) * (Number(it.pu) || 0))}</td></tr>`).join("");
    const body = `
      <h1 style="font-size:22px;font-weight:400;color:#3E5A70;margin:0 0 .5rem;">✓ Devis accepté 🎉</h1>
      <p style="font-size:14px;color:rgba(43,41,37,.78);line-height:1.8;margin:0 0 1rem;"><strong>${esc(d.client_name)}</strong> vient d'accepter le devis <strong>${esc(d.number)}</strong> en ligne.</p>
      <div style="background:#F3E7DA;border-radius:8px;padding:1rem 1.25rem;margin-bottom:1rem;font-size:13px;color:rgba(43,41,37,.8);line-height:1.9">
        <div>Devis : <strong>${esc(d.number)}</strong></div>
        <div>Client : <strong>${esc(d.client_name)}</strong>${d.client_email ? (" · " + esc(d.client_email)) : ""}</div>
        <div>Accepté par : <strong>${esc(d.signed_name)}</strong> le ${esc(when)}</div>
        ${d.service_date ? `<div>Prestation prévue : ${esc(d.service_date)}</div>` : ""}
      </div>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #E6DFD3;border-bottom:1px solid #E6DFD3;margin-bottom:.6rem">${rows}</table>
      <p style="font-size:16px;font-weight:600;color:#3E5A70;text-align:right;margin:0 0 1rem">Total : ${money(d.total)}</p>
      <p style="font-size:13px;color:rgba(43,41,37,.7);line-height:1.7">Tu peux le convertir en facture dans le back-office : <strong>Devis → ➡ Facturer</strong>.</p>`;
    let svc = "";
    try { if (d.service_date) svc = new Date(String(d.service_date).slice(0, 10) + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); } catch { /* */ }
    const clientBody = `
      <h1 style="font-size:22px;font-weight:400;color:#3E5A70;margin:0 0 10px;">Merci pour votre validation 🙏</h1>
      <p style="font-size:14px;color:#4A443E;line-height:1.8;margin:0 0 16px;">Bonjour,<br>Nous avons bien reçu votre <strong>accord</strong> pour le devis <strong>${esc(d.number)}</strong> d'un montant de <strong>${money(d.total)}</strong>. Merci de votre confiance&nbsp;!</p>
      <p style="font-size:14px;color:#4A443E;line-height:1.8;margin:0 0 16px;">Nous revenons <strong>rapidement vers vous</strong> pour organiser la planification de votre prestation${svc ? ` (prévue le ${esc(svc)})` : ""}.</p>
      <p style="font-size:13px;color:#555;line-height:1.7;margin:0;">À très bientôt,<br>Mylène — à contre-temps, Fournil vivant</p>`;
    try {
      const owner = await sendEmail(RESEND_API_KEY, { from: FROM, to: [OWNER], reply_to: d.client_email || OWNER, subject: `✓ Devis ${d.number || ""} accepté par ${d.client_name || "un client"}`, html: shell(body) });
      let client = { ok: true };
      if (d.client_email) {
        client = await sendEmail(RESEND_API_KEY, { from: FROM, to: [d.client_email], reply_to: OWNER, subject: `Votre devis ${d.number || ""} est bien validé — merci !`, html: shell(clientBody) });
      }
      if (!owner.ok) console.error("Resend devis_accepted (fournil) error:", owner.status, owner.data);
      if (client && client.ok === false) console.error("Resend devis_accepted (client) error:", client.status, client.data);
      return res.status(200).json({ owner: { ok: owner.ok }, client: { ok: client.ok } });
    } catch (e) {
      console.error("Send devis_accepted error:", e);
      return res.status(500).json({ error: e.message });
    }
  }

  // ───────────── ENVOI DU DEVIS AU CLIENT (lien de validation, joli bouton) ───
  if (type === "devis_link") {
    const d = req.body.devis || {};
    if (!d.client_email) return res.status(400).json({ error: "E-mail client manquant" });
    const url = String(d.url || "");
    const money = (n) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace(".", ",") + " €";
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    let svc = "";
    try { if (d.service_date) svc = new Date(String(d.service_date).slice(0, 10) + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); } catch { /* */ }
    const msg = String(d.message == null ? "" : d.message).trim();
    const msgHtml = msg ? `<p style="font-size:14px;color:#4A443E;line-height:1.8;margin:0 0 18px;white-space:pre-line;">${esc(msg)}</p>` : "";
    const body = `
      <h1 style="font-size:22px;font-weight:400;color:#3E5A70;margin:0 0 10px;">Votre devis est prêt 🥐</h1>
      <p style="font-size:14px;color:#4A443E;line-height:1.8;margin:0 0 ${msgHtml ? "14px" : "18px"};">Bonjour,</p>
      ${msgHtml}
      <p style="font-size:14px;color:#4A443E;line-height:1.8;margin:0 0 18px;">Voici votre devis <strong>${esc(d.number)}</strong>${svc ? ` pour votre prestation du <strong>${esc(svc)}</strong>` : ""}, d'un montant de <strong>${money(d.total)}</strong>.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:6px auto 20px;"><tr><td align="center" bgcolor="#3E5A70" style="border-radius:10px;mso-padding-alt:15px 32px;">
        <a href="${esc(url)}" target="_blank" style="display:inline-block;padding:15px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;border-radius:10px;white-space:nowrap;"><span style="color:#FFFFFF;">Voir et valider mon devis &nbsp;&rarr;</span></a>
      </td></tr></table>
      <p style="font-size:13px;color:#555;line-height:1.7;margin:0 0 6px;text-align:center;">En un clic, vous pourrez le consulter, le télécharger et donner votre <strong>bon pour accord</strong> en ligne.</p>
      <p style="font-size:12px;color:#8A857E;line-height:1.6;margin:16px 0 0;text-align:center;">Devis gratuit, valable 30 jours.<br>Si le bouton ne s'affiche pas, copiez ce lien&nbsp;:<br><a href="${esc(url)}" style="text-decoration:underline;word-break:break-all;"><span style="color:#8A857E;">${esc(url)}</span></a></p>`;
    try {
      const r = await sendEmail(RESEND_API_KEY, { from: FROM, to: [d.client_email], reply_to: OWNER, subject: `Votre devis ${d.number || ""} — à contre-temps`, html: shell(body) });
      if (!r.ok) console.error("Resend devis_link error:", r.status, r.data);
      return res.status(200).json({ ok: r.ok, status: r.status, error: r.ok ? null : r.data });
    } catch (e) {
      console.error("Send devis_link error:", e);
      return res.status(500).json({ error: e.message });
    }
  }

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
