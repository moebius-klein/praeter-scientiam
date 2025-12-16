// sw.js – bewusst leer/harmlos: kein fetch handler
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());
