// Service worker de la Caisse — permet le chargement hors-ligne (app shell).
// Périmètre : /caisse uniquement. Les appels Supabase / /api passent par le réseau.
var CACHE = "caisse-v21";
var SHELL = "/caisse";

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
  if (url.origin !== self.location.origin) return;      // Supabase, SumUp… → réseau direct
  if (url.pathname.indexOf("/api/") === 0) return;        // fonctions serverless → réseau

  // App shell : cache d'abord, réseau en secours (met le cache à jour en arrière-plan)
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
