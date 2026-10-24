/* Garde Pétrin — écran PIN + service worker isolé.
   But : protéger l'outil interne (pas accessible au grand public) et rendre
   l'appli installable sur /petrin sans gêner l'installation des autres PWA. */
(function(){
  /* 1) Service worker dédié, isolé sur /petrin. */
  if ("serviceWorker" in navigator){
    window.addEventListener("load", function(){
      navigator.serviceWorker.register("/petrin-sw.js", { scope:"/petrin" }).catch(function(){});
    });
  }

  /* 2) Écran PIN (même principe que la caisse). Code par défaut 2026,
        modifiable via localStorage "petrin_pin". Déverrouillage 8 h. */
  var DEFAULT_PIN = "2026";
  function lsGet(k,d){ try{ var v=localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } }
  function lsSet(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  function unlocked(){ return lsGet("petrin_unlocked_ts",0) > Date.now()-1000*60*60*8; }

  var st=document.createElement("style");
  st.textContent =
    ".pg-wrap{position:fixed;inset:0;background:#3E5A70;color:#F3E7DA;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;gap:18px;font-family:'Outfit',system-ui,sans-serif;padding:20px;}"
    +".pg-wrap .ttl{font-family:'Fraunces',Georgia,serif;font-size:24px;font-style:italic;text-align:center;}"
    +".pg-dots{display:flex;gap:14px;}"
    +".pg-dots i{width:16px;height:16px;border-radius:50%;border:2px solid #F3E7DA;}"
    +".pg-dots i.f{background:#F3E7DA;}"
    +".pg-pad{display:grid;grid-template-columns:repeat(3,76px);gap:14px;}"
    +".pg-pad button{height:76px;border-radius:50%;background:rgba(243,231,218,.14);color:#F3E7DA;font-size:28px;font-family:'Fraunces',Georgia,serif;border:none;cursor:pointer;}"
    +".pg-pad button:active{background:rgba(243,231,218,.3);}"
    +".pg-err{font-size:13px;color:#E8B4AA;height:16px;}";
  (document.head||document.documentElement).appendChild(st);

  var buf="";
  function dots(){ var d=document.querySelectorAll("#pgDots i"); for(var i=0;i<4;i++) d[i].className = i<buf.length?"f":""; }
  function check(){
    var good=lsGet("petrin_pin",DEFAULT_PIN);
    if(buf===good){ lsSet("petrin_unlocked_ts",Date.now()); var s=document.getElementById("pgScreen"); if(s) s.remove(); buf=""; }
    else { var e=document.getElementById("pgErr"); if(e){ e.textContent="Code incorrect"; setTimeout(function(){ e.textContent=""; },1500); } buf=""; dots(); }
  }
  function build(){
    if(unlocked()) return;
    if(document.getElementById("pgScreen")) return;
    buf="";
    var ov=document.createElement("div"); ov.className="pg-wrap"; ov.id="pgScreen";
    ov.innerHTML='<div class="ttl">🥖 Pétrin — à contre-temps</div>'
      +'<div class="pg-dots" id="pgDots"><i></i><i></i><i></i><i></i></div>'
      +'<div class="pg-pad" id="pgPad"></div>'
      +'<div class="pg-err" id="pgErr"></div>';
    document.body.appendChild(ov);
    var pad=ov.querySelector("#pgPad");
    ["1","2","3","4","5","6","7","8","9","","0","⌫"].forEach(function(k){
      var b=document.createElement("button"); b.textContent=k; if(!k) b.style.visibility="hidden";
      b.onclick=function(){ if(k==="⌫") buf=buf.slice(0,-1); else if(k) buf+=k; dots(); if(buf.length===4) check(); };
      pad.appendChild(b);
    });
    dots();
  }
  /* Verrouillage manuel : window.petrinLock() depuis la console ou un bouton. */
  window.petrinLock=function(){ lsSet("petrin_unlocked_ts",0); build(); };

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
