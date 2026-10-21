// TEMPORAIRE — appairage du terminal SumUp Solo. À SUPPRIMER après usage.
const TOKEN = "pair_4ob5zbngjz";
export default async function handler(req, res) {
  if ((req.query.key || "") !== TOKEN) return res.status(403).json({ error: "forbidden" });
  const KEY = process.env.SUMUP_API_KEY;
  if (!KEY) return res.status(200).json({ ok:false, error:"SUMUP_API_KEY n'est pas encore défini sur Vercel (étape clé API)." });
  const code = String(req.query.code || "").trim();
  try {
    const meR = await fetch("https://api.sumup.com/v0.1/me", { headers:{ Authorization:"Bearer "+KEY } });
    const me = await meR.json().catch(()=>({}));
    if (!meR.ok) return res.status(200).json({ ok:false, step:"auth", status:meR.status, error: me.message || me.error_message || "Clé API invalide ?" });
    const merchant = me.merchant_profile && me.merchant_profile.merchant_code;
    let reader_id=null, reader_name=null;
    if (code) {
      const pr = await fetch("https://api.sumup.com/v0.1/merchants/"+merchant+"/readers", {
        method:"POST", headers:{ Authorization:"Bearer "+KEY, "Content-Type":"application/json" },
        body: JSON.stringify({ pairing_code: code, name: "Caisse marche" })
      });
      const raw = await pr.text(); let pd={}; try{ pd=JSON.parse(raw); }catch(_){}
      if (!pr.ok) return res.status(200).json({ ok:false, step:"pair", status:pr.status, merchant_code:merchant, error: pd.message || pd.error_message || raw.slice(0,200) });
      reader_id = pd.id || (pd.data && pd.data.id) || null; reader_name = pd.name || null;
    }
    const lr = await fetch("https://api.sumup.com/v0.1/merchants/"+merchant+"/readers", { headers:{ Authorization:"Bearer "+KEY } });
    let readers=[]; try { const ld = await lr.json(); readers = (ld.items || ld || []).map(x=>({ id:x.id, name:x.name, status:x.status })); } catch(_){}
    return res.status(200).json({ ok:true, merchant_code:merchant, reader_id:reader_id, reader_name:reader_name, readers_existants:readers });
  } catch(e) { return res.status(200).json({ ok:false, error:String(e.message||e) }); }
}
