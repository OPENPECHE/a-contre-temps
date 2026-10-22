// Service worker de la Borne client — app shell pour l'installation (PWA).
// Périmètre : /borne uniquement (n'interfère pas avec /caisse ni le reste du site).
// La borne a besoin du réseau pour fonctionner ; le cache sert juste à ouvrir
// l'app en plein écran rapidement. Supabase / /api passent toujours par le réseau.
var CACHE = "borne-v3";
var SHELL = "/borne";

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.add(SHELL).catch(function(){}); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch(_) { return; }
  if (url.origin !== self.location.origin) return;      // Supabase… → réseau direct
  if (url.pathname.indexOf("/api/") === 0) return;        // fonctions serverless → réseau
  if (url.pathname.indexOf("/borne") !== 0) return;       // hors périmètre → on ne touche pas

  e.respondWith(
    caches.match(req).then(function(cached){
      var net = fetch(req).then(function(resp){
        if (resp && resp.ok && resp.type === "basic") {
          var copy = resp.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return resp;
      }).catch(function(){
        return cached || (req.mode === "navigate" ? caches.match(SHELL) : undefined);
      });
      return cached || net;
    })
  );
});
