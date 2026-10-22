// TEMPORAIRE — test création d'un paiement en ligne SumUp. À SUPPRIMER.
const TOKEN="ck_0in4okp2";
export default async function handler(req,res){
  if((req.query.key||"")!==TOKEN) return res.status(403).json({error:"forbidden"});
  const KEY=process.env.SUMUP_API_KEY, MERCHANT=process.env.SUMUP_MERCHANT_CODE;
  if(!KEY||!MERCHANT) return res.status(200).json({ok:false,error:"clé/merchant manquant"});
  try{
    const r=await fetch("https://api.sumup.com/v0.1/checkouts",{method:"POST",headers:{Authorization:"Bearer "+KEY,"Content-Type":"application/json"},
      body:JSON.stringify({checkout_reference:"test-"+Date.now(),amount:1.00,currency:"EUR",merchant_code:MERCHANT,description:"Test paiement en ligne"})});
    const t=await r.text(); let d={}; try{d=JSON.parse(t);}catch(_){}
    return res.status(200).json({ok:r.ok,status:r.status,checkout_id:d.id||null,resp:t.slice(0,300)});
  }catch(e){ return res.status(200).json({ok:false,error:String(e.message||e)}); }
}
