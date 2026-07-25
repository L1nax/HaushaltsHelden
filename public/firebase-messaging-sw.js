/* eslint-disable no-undef */
// Firebase Messaging Service Worker.
// Muss auf demselben Origin und im Root liegen, damit FCM ihn findet.
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB_kwBN3qnuep2jUNrGAhLgU02hAP-MGdc",
  authDomain: "haushaltshelden-aa312.firebaseapp.com",
  projectId: "haushaltshelden-aa312",
  storageBucket: "haushaltshelden-aa312.firebasestorage.app",
  messagingSenderId: "61293662138",
  appId: "1:61293662138:web:c5a17d0226b88e5f305783",
});

const messaging = firebase.messaging();

// Wenn die App im Hintergrund ist, zeigt der Browser die Notification automatisch
// (aus dem `notification`-Feld der Payload). Wir setzen hier nur einen Fallback,
// falls nur `data` geschickt wurde.
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "🏡 Haushalts-Helden";
  const body = payload.notification?.body || payload.data?.body || "";
  self.registration.showNotification(title, {
    body,
    icon: "/pwa-192x192.v2.png",
    badge: "/pwa-64x64.v2.png",
    tag: payload.data?.tag || "hh-notification",
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});
