// ─────────────────────────────────────────────────────────────────────────────
// Vercel Serverless Function — /api/petrin-ask
// Assistant vocal du fournil : reçoit une question + un instantané des données
// (recettes, prix matières, commande du jour) et répond en langage naturel via
// Claude. Modèle : Claude Haiku 5.5 (rapide + économique, adapté au temps réel).
// Nécessite la variable d'environnement ANTHROPIC_API_KEY sur Vercel.
// Si la clé est absente, renvoie {error:"no_key"} → le client bascule sur son
// moteur de règles hors-ligne.
// ─────────────────────────────────────────────────────────────────────────────

const MODEL = "claude-haiku-5-5";

const SYSTEM = [
  "Tu es l'assistant vocal d'un fournil (boulangerie artisanale « à contre-temps »).",
  "Un boulanger te parle pendant qu'il travaille, les mains occupées.",
  "Réponds en français, TRÈS court (1 à 2 phrases), parlé et naturel, prêt à être lu à voix haute :",
  "pas de listes à puces, pas de markdown, pas de symboles, écris les nombres normalement.",
  "Base-toi UNIQUEMENT sur les données JSON fournies (recettes, prix des matières, commande du jour, formats).",
  "Les poids sont en GRAMMES. Tu peux calculer si besoin :",
  "poids cru = poids cuit / pertes ; coût matières = somme(ingrédient_g/1000 × prix_kg) ;",
  "coût chargé = coût matières × coef_charges ; marge = prix de vente − coût chargé.",
  "Si une information n'est pas dans les données, dis-le simplement, n'invente rien.",
  "Donne des nombres arrondis et, pour un poids, précise « grammes »."
].join(" ");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return res.status(200).json({ error: "no_key" });

  const body = req.body || {};
  const question = (body.question || "").toString().slice(0, 400).trim();
  const data = body.data || {};
  if (!question) return res.status(200).json({ error: "no_question" });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 350,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content:
              "Données (JSON) :\n" + JSON.stringify(data) +
              "\n\nQuestion du boulanger : " + question,
          },
        ],
      }),
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(200).json({ error: "api_error", status: r.status, detail: (j && j.error && j.error.message) || "" });
    }
    const text = Array.isArray(j.content)
      ? j.content.filter((b) => b.type === "text").map((b) => b.text).join(" ").trim()
      : "";
    if (!text) return res.status(200).json({ error: "empty" });
    return res.status(200).json({ answer: text });
  } catch (e) {
    return res.status(200).json({ error: "exception", detail: String(e && e.message || e) });
  }
}
