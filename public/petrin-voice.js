/* Moteur vocal mains-libres partagé (pains & viennoiseries).
   La page fournit window.PETRIN_ANSWER(questionNormalisee) -> Promise<{sp, h}>.
   Besoin dans la page : un bouton #btnMic et un conteneur #voiceBar. */
(function(){
  var btn=document.getElementById("btnMic"), bar=document.getElementById("voiceBar");
  if(!btn||!bar) return;
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  var WAKE=/\b(dis |dit |ok |hey )?p[eé]?trin\b/;
  var IDLE="🎤 <b>Mains-libres actif</b> — dites par ex. « <b>Pétrin</b>, combien de farine pour le tradition ? ». Touchez à nouveau le micro pour arrêter.";
  var hf=false, rec=null, speaking=false, restartT=null, armed=false, armT=null, speakSafety=null;
  function norm(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,""); }
  function showBar(h){ bar.innerHTML=h; bar.style.display="block"; }
  function disarm(){ armed=false; clearTimeout(armT); }
  function arm(){ armed=true; clearTimeout(armT); armT=setTimeout(function(){ armed=false; if(hf) showBar(IDLE); }, 12000); }
  function speakGuarded(txt){
    speaking=true; clearTimeout(speakSafety);
    var done=function(){ speaking=false; };
    try{
      window.speechSynthesis.cancel();
      var u=new SpeechSynthesisUtterance(txt); u.lang="fr-FR";
      u.onend=function(){ setTimeout(done,150); };
      u.onerror=function(){ setTimeout(done,150); };
      window.speechSynthesis.speak(u);
      speakSafety=setTimeout(done, Math.min(7000, 900+txt.length*70));
    }catch(e){ done(); }
  }
  function handle(tr){
    var t=norm(tr), m=t.match(WAKE), q=null;
    if(m){ q=t.slice(t.indexOf(m[0])+m[0].length).trim(); }
    else if(armed){ q=t.trim(); }
    else return;
    if(q.length<3){ arm(); showBar("🎤 Oui ? Posez votre question…"); speakGuarded("Oui ?"); return; }
    disarm();
    showBar("🤔 …");
    var p;
    try{ p=window.PETRIN_ANSWER ? window.PETRIN_ANSWER(q) : null; }catch(e){ p=null; }
    Promise.resolve(p).then(function(a){
      if(!a){ a={sp:"Désolé, je n'ai pas compris.", h:"« "+q+" » — non compris."}; }
      showBar(a.h); speakGuarded(a.sp);
    }).catch(function(){
      showBar("Désolé, une erreur est survenue."); speakGuarded("Désolé, une erreur est survenue.");
    });
  }
  function startHF(){
    if(!SR){ showBar("Reconnaissance vocale indisponible sur ce navigateur — essayez Chrome (Android) ou Safari (iOS récent)."); return; }
    hf=true; btn.classList.add("on"); showBar(IDLE);
    rec=new SR(); rec.lang="fr-FR"; rec.continuous=true; rec.interimResults=false; rec.maxAlternatives=1;
    rec.onresult=function(e){ if(speaking) return; for(var i=e.resultIndex;i<e.results.length;i++){ if(e.results[i].isFinal) handle(e.results[i][0].transcript); } };
    rec.onerror=function(e){ if(e.error==="not-allowed"||e.error==="service-not-allowed"){ stopHF(); showBar("Micro refusé — autorisez le microphone pour le mode mains-libres."); } };
    rec.onend=function(){ if(hf){ clearTimeout(restartT); restartT=setTimeout(function(){ try{ rec.start(); }catch(e){ try{ startHF(); }catch(_){} } }, 400); } };
    try{ rec.start(); }catch(e){}
  }
  function stopHF(){ hf=false; btn.classList.remove("on"); clearTimeout(restartT); if(rec){ rec.onend=null; try{ rec.stop(); }catch(e){} rec=null; } bar.style.display="none"; }
  btn.onclick=function(){ hf?stopHF():startHF(); };
  window.petrinAsk=function(tr){ handle(tr); }; // test/debug sans micro
})();
