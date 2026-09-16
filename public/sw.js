// Service worker — notifications push + installabilité PWA "à contre-temps"

// Prise de contrôle rapide (pour que l'app soit reconnue installable au 1er chargement)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Gestionnaire fetch minimal (passe-plat réseau, sans cache).
// Nécessaire pour que Chrome/Edge considèrent l'app installable (beforeinstallprompt).
self.addEventListener("fetch", () => { /* laisse le réseau gérer la requête */ });

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "à contre-temps", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "à contre-temps";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
