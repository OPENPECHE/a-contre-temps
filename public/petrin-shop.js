/* Liste de courses du Pétrin — somme TOUS les ingrédients (pains + viennoiseries)
   d'une date donnée, depuis petrin_days. Imprimable + copiable. Eau exclue. */
(function(){
  var SB_URL="https://jxxgafyqfbnqieiqltcn.supabase.co";
  var SB_KEY="sb_publishable_MdBMZ53hCDINWEu8jfsrzQ_sOeIuqZo";
  function sb(path){ return fetch(SB_URL+"/rest/v1/"+path,{headers:{apikey:SB_KEY,Authorization:"Bearer "+SB_KEY}}); }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"})[c];}); }
  var LOSS=0.82;

  var FORMATS=[ {key:"baguette",poids:250}, {key:"pave400",poids:400}, {key:"boule",poids:500}, {key:"pave1kg",poids:1000} ];
  var RECIPES=[
    { nom:"LE TRADITION", total:2020, levain:{g:250,type:"ble"}, pate:[{n:"Farine blé T65",g:1000},{n:"Eau (TB 70°C)",g:750},{n:"Sel",g:20}] },
    { nom:"LE CLASSIQUE LEVAIN", total:2040, levain:{g:250,type:"ble"}, pate:[{n:"Farine blé T65",g:700},{n:"Farine seigle T130",g:100},{n:"Farine blé T80",g:200},{n:"Eau (TB 70°C)",g:770},{n:"Sel",g:20}] },
    { nom:"LE FRUITE", total:3434, levain:{g:250,type:"ble"}, pate:[{n:"Farine blé T65",g:1000},{n:"Eau (TB 70°C)",g:750},{n:"Eau bassinage fruits",g:202},{n:"Sel",g:20},{n:"Mélange fruits",g:1212}] },
    { nom:"LE GRAINES TOASTEES", total:2340, levain:{g:250,type:"ble"}, pate:[{n:"Farine blé T65",g:700},{n:"Farine seigle T130",g:100},{n:"Farine blé T80",g:200},{n:"Eau (TB 70°C)",g:770},{n:"Sel",g:20},{n:"Mélange graines torréfiées",g:150},{n:"Eau trempage graines",g:150}] },
    { nom:"L'INTEGRAL", total:6084, levain:{g:30,type:"ble"}, pate:[{n:"Farine blé intégrale T150",g:3000},{n:"Eau (30°C)",g:3000},{n:"Levure",g:6},{n:"Sel",g:48}] },
    { nom:"LIN'VERSE", total:4442, levain:{g:5,type:"ble"}, pate:[{n:"Farine blé T65",g:2000},{n:"Eau (30°C)",g:2020},{n:"Levure",g:1},{n:"Graines de lin",g:180},{n:"B1",g:200},{n:"Sel",g:36}] },
    { nom:"L'ENGRAIN", total:2420, levain:{g:500,type:"epeautre"}, pate:[{n:"Farine engrain",g:1000},{n:"Eau tiède",g:900},{n:"Sel",g:20}] },
    { nom:"L'ORIGINE", total:1720, levain:{g:4,type:"ble"}, pate:[{n:"Farine blé T65",g:300},{n:"Farine meule T80",g:700},{n:"Eau (TB 70°C)",g:700},{n:"Sel",g:16}] }
  ];
  var DOUGHS=[
    { total:2520, levain:{g:200,type:"ble"}, pate:[{n:"Farine blé T65",g:1000},{n:"Sel fin",g:20},{n:"Sucre",g:120},{n:"Levure",g:45},{n:"Poudre de lait",g:50},{n:"Eau",g:405},{n:"Œuf",g:50},{n:"Beurre doux",g:60},{n:"Beurre de tourage",g:570}], produits:[{n:"Croissant",poids:70},{n:"Pain au chocolat",poids:68},{n:"Pain aux raisins",poids:65},{n:"Cruffin",poids:50},{n:"Jalousie",poids:60},{n:"Suisse",poids:60},{n:"Oranais",poids:60}] },
    { total:2113, levain:null, pate:[{n:"Farine blé T65",g:1000},{n:"Sel fin",g:20},{n:"Eau",g:493},{n:"Beurre doux",g:100},{n:"Beurre de tourage",g:500}], produits:[{n:"Palmier",poids:70},{n:"Chausson citron",poids:50},{n:"Chausson aux pommes",poids:50},{n:"Pâté aux pommes de terre",poids:68},{n:"Tarte aux fruits (plaque)",poids:700}] },
    { total:1000, levain:null, pate:[{n:"Farine blé T65",g:400},{n:"Sel fin",g:10},{n:"Sucre",g:60},{n:"Levure",g:20},{n:"Œuf (jaune)",g:80},{n:"Œuf (blanc)",g:180},{n:"Beurre doux",g:250}], produits:[{n:"Brioche nature",poids:350},{n:"Briochette nature",poids:60},{n:"Brioche pralines",poids:250},{n:"Briochette pralines",poids:50},{n:"Brioche pépites chocolat",poids:250},{n:"Briochette pépites chocolat",poids:50},{n:"Babka",poids:180},{n:"Babka individuelle",poids:50},{n:"Chinois",poids:180},{n:"Pompe aux grattons",poids:180}] },
    { total:1800, levain:null, pate:[{n:"Farine blé T65",g:1000},{n:"Sel fin",g:20},{n:"Eau",g:200},{n:"Œuf (jaune)",g:80},{n:"Beurre doux",g:500}], produits:[{n:"Base quiche (Ø20)",poids:300},{n:"Base flan (Ø20)",poids:360}] },
    { total:1205, levain:null, pate:[{n:"Farine blé T65",g:100},{n:"Beurre doux",g:100},{n:"Lait",g:1000},{n:"Sel fin",g:5}], produits:[{n:"Croque-Monsieur XL",poids:180},{n:"Croissant au jambon",poids:80},{n:"Crêpe garnie",poids:100}] }
  ];

  function add(mat,n,g){ mat[n]=(mat[n]||0)+g; }
  function painsMat(order,mat){
    RECIPES.forEach(function(r){
      var o=order[r.nom]||{}, dough=0;
      FORMATS.forEach(function(f){ dough += (o[f.key]||0)*(f.poids/LOSS); });
      if(dough<=0) return;
      var coeff=dough/r.total;
      r.pate.forEach(function(i){ add(mat,i.n,i.g*coeff); });
      add(mat, r.levain.type==="epeautre"?"Levain petit épeautre":"Levain blé", r.levain.g*coeff);
    });
  }
  function viennMat(order,mat){
    DOUGHS.forEach(function(d){
      var dough=0;
      d.produits.forEach(function(p){ dough += (order[p.n]||0)*p.poids; });
      if(dough<=0) return;
      var coeff=dough/d.total;
      d.pate.forEach(function(i){ add(mat,i.n,i.g*coeff); });
      if(d.levain) add(mat,"Levain blé", d.levain.g*coeff);
    });
  }
  function fmt(g){ g=Math.round(g); var s=g.toLocaleString("fr-FR")+" g"; if(g>=1000){ s+=" <span style='color:#888'>("+(Math.round(g/10)/100).toLocaleString("fr-FR")+" kg)</span>"; } return s; }
  function fmtTxt(g){ g=Math.round(g); return g>=1000 ? (Math.round(g/10)/100).toLocaleString("fr-FR")+" kg ("+g.toLocaleString("fr-FR")+" g)" : g+" g"; }
  function rk(n){ if(/levain/i.test(n))return 9; if(/^farine|engrain/i.test(n))return 0; if(/beurre/i.test(n))return 1; if(/œuf|oeuf|lait|poudre de lait/i.test(n))return 2; if(/sucre/i.test(n))return 3; if(/graine|lin|fruit|B1|melange|mélange/i.test(n))return 4; if(/sel/i.test(n))return 6; if(/levure/i.test(n))return 7; return 5; }

  window.petrinShoppingList=function(dayIso, dayLabel){
    var ov=document.createElement("div");
    ov.style.cssText="position:fixed;inset:0;background:rgba(43,41,37,.5);display:flex;align-items:flex-start;justify-content:center;z-index:300;padding:22px 14px;overflow:auto;";
    var card=document.createElement("div"); card.style.cssText="background:#fff;border:1px solid #D6DFE5;border-radius:16px;max-width:560px;width:100%;padding:18px;font-family:'Outfit',system-ui,sans-serif;";
    card.innerHTML='<div id="slBody" style="color:#2B2925"><div style="color:#888;text-align:center;padding:20px">Calcul de la liste…</div></div>';
    ov.appendChild(card); document.body.appendChild(ov);
    ov.onclick=function(e){ if(e.target===ov) ov.remove(); };
    Promise.all([
      sb("petrin_days?day=eq."+encodeURIComponent(dayIso)+"&select=data").then(function(r){return r.ok?r.json():[];}).catch(function(){return[];}),
      sb("petrin_days?day=eq."+encodeURIComponent(dayIso+"#v")+"&select=data").then(function(r){return r.ok?r.json():[];}).catch(function(){return[];})
    ]).then(function(res){
      var mat={};
      var po=(res[0]&&res[0][0]&&res[0][0].data)||{}; painsMat(po,mat);
      var vo=(res[1]&&res[1][0]&&res[1][0].data)||{}; viennMat(vo,mat);
      var keys=Object.keys(mat).filter(function(n){ return !/^eau/i.test(n) && mat[n]>=0.5; });
      keys.sort(function(a,b){ return rk(a)-rk(b)||a.localeCompare(b); });
      var body=card.querySelector("#slBody");
      if(!keys.length){ body.innerHTML='<div style="font-family:Georgia,serif;font-style:italic;font-size:20px;color:#3E5A70;margin-bottom:8px">🛒 Liste de courses</div><div style="color:#888;padding:14px 0">Rien de saisi pour '+esc(dayLabel||dayIso)+'. Saisissez des quantités (pains et/ou viennoiseries) pour générer la liste.</div><button id="slClose" style="margin-top:8px;background:#fff;border:1px solid #D6DFE5;border-radius:999px;padding:10px 18px;cursor:pointer;color:#3E5A70;font-weight:600">Fermer</button>';
        body.querySelector("#slClose").onclick=function(){ ov.remove(); }; return; }
      var rows=keys.map(function(n){ return '<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 2px;border-bottom:1px solid #EFE9E1;font-size:14.5px"><span>'+esc(n)+'</span><b style="white-space:nowrap">'+fmt(mat[n])+'</b></div>'; }).join("");
      var txt="🛒 Liste de courses — "+(dayLabel||dayIso)+"\n"+keys.map(function(n){ return "• "+n+" : "+fmtTxt(mat[n]); }).join("\n")+"\n(à contre-temps — eau et quantités arrondies non incluses)";
      body.innerHTML='<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:8px"><span style="font-family:Georgia,serif;font-style:italic;font-size:21px;color:#3E5A70">🛒 Liste de courses</span><span style="color:#888;font-size:12.5px">'+esc(dayLabel||dayIso)+'</span></div>'
        +'<div style="color:#888;font-size:11.5px;margin-bottom:8px">Tous les ingrédients (pains + viennoiseries) à prévoir. L\'eau n\'est pas listée ; le levain est à rafraîchir.</div>'
        +rows
        +'<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button id="slCopy" style="flex:1;background:#3E5A70;color:#F3E7DA;border:none;border-radius:999px;padding:11px;cursor:pointer;font-weight:600;font-size:14px">📋 Copier</button><button id="slPrint" style="flex:1;background:#fff;border:1px solid #D6DFE5;border-radius:999px;padding:11px;cursor:pointer;color:#3E5A70;font-weight:600;font-size:14px">🖨️ Imprimer</button><button id="slClose" style="background:#fff;border:1px solid #D6DFE5;border-radius:999px;padding:11px 16px;cursor:pointer;color:#3E5A70;font-weight:600;font-size:14px">Fermer</button></div>';
      body.querySelector("#slClose").onclick=function(){ ov.remove(); };
      body.querySelector("#slCopy").onclick=function(){ var b=body.querySelector("#slCopy"); (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(function(){ b.textContent="✓ Copié"; setTimeout(function(){ b.innerHTML="📋 Copier"; },1500); }).catch(function(){ try{ var ta=document.createElement("textarea"); ta.value=txt; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); b.textContent="✓ Copié"; setTimeout(function(){ b.innerHTML="📋 Copier"; },1500); }catch(e){ alert(txt); } }); };
      body.querySelector("#slPrint").onclick=function(){
        var w=window.open("","_blank"); if(!w){ alert("Autorisez les fenêtres pour imprimer."); return; }
        w.document.write('<html><head><title>Liste de courses</title><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;max-width:600px;margin:24px auto;color:#222}h1{font-size:20px}li{padding:4px 0;border-bottom:1px solid #eee;list-style:none;display:flex;justify-content:space-between}</style></head><body><h1>🛒 Liste de courses — '+esc(dayLabel||dayIso)+'</h1><ul>'+keys.map(function(n){ return "<li><span>"+esc(n)+"</span><b>"+fmtTxt(mat[n])+"</b></li>"; }).join("")+'</ul><p style="color:#888;font-size:12px">à contre-temps · pains + viennoiseries · eau non incluse</p></body></html>');
        w.document.close(); setTimeout(function(){ try{ w.print(); }catch(e){} }, 300);
      };
    }).catch(function(){ card.querySelector("#slBody").innerHTML='<div style="color:#B0402F;padding:14px">Erreur de chargement. Réessayez.</div>'; });
  };
})();
