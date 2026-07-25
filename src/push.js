import { getToken, deleteToken, onMessage } from "firebase/messaging";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, getFamilyId, getMessagingIfSupported, VAPID_KEY } from "./firebase.js";

const DEVICE_ID_KEY = "hh-device-id";
const LAST_TOKEN_KEY = "hh-fcm-token";

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2)) + "-" + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

async function getSwRegistration() {
  // Wir registrieren den FCM-SW explizit, damit er neben dem Vite-PWA-SW koexistiert.
  return navigator.serviceWorker.register("/firebase-messaging-sw.js");
}

function tokenDocRef(token) {
  const familyId = getFamilyId();
  // Firestore-Doc-IDs dürfen keine "/" enthalten — FCM-Tokens sind url-safe base64,
  // enthalten aber ":" was zulässig ist. Wir hashen trotzdem nicht, sondern nehmen den Token direkt.
  return doc(db, "families", familyId, "pushTokens", encodeURIComponent(token));
}

// Beim Foreground zeigt FCM nichts an; die App macht bereits eigene In-App-Notifications.
// Wir registrieren onMessage nur, damit der Handler existiert (verhindert Warnings).
async function attachForegroundHandler() {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return;
  onMessage(messaging, () => {
    // no-op: In-App-UI erledigt die Anzeige, System-Push wäre doppelt.
  });
}

export async function registerPush() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return { ok: false, reason: "unsupported" };
  if (!VAPID_KEY) return { ok: false, reason: "no-vapid-key" };

  const messaging = await getMessagingIfSupported();
  if (!messaging) return { ok: false, reason: "unsupported" };

  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  const swReg = await getSwRegistration();
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
  if (!token) return { ok: false, reason: "no-token" };

  await setDoc(tokenDocRef(token), {
    deviceId: getDeviceId(),
    userAgent: navigator.userAgent,
    createdAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
  }, { merge: true });

  localStorage.setItem(LAST_TOKEN_KEY, token);
  attachForegroundHandler();
  return { ok: true, token };
}

export async function unregisterPush() {
  const token = localStorage.getItem(LAST_TOKEN_KEY);
  if (!token) return;
  try {
    const messaging = await getMessagingIfSupported();
    if (messaging) await deleteToken(messaging);
  } catch { /* ignore */ }
  try {
    await deleteDoc(tokenDocRef(token));
  } catch { /* ignore */ }
  localStorage.removeItem(LAST_TOKEN_KEY);
}
