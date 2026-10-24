// Service worker Pétrin — isolé sur le scope /petrin.
// Passe-plat réseau (aucun cache) : rend l'appli installable sans interférer
// avec les autres PWA (caisse /caisse, borne /borne, site /).
self.addEventListener("install", function(){ self.skipWaiting(); });
self.addEventListener("activate", function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", function(){ /* laisse le réseau gérer la requête */ });
