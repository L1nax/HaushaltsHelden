import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyB_kwBN3qnuep2jUNrGAhLgU02hAP-MGdc",
  authDomain: "haushaltshelden-aa312.firebaseapp.com",
  projectId: "haushaltshelden-aa312",
  storageBucket: "haushaltshelden-aa312.firebasestorage.app",
  messagingSenderId: "61293662138",
  appId: "1:61293662138:web:c5a17d0226b88e5f305783",
  measurementId: "G-LL5VJW70ZQ",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// VAPID Public Key aus Firebase Console → Project Settings → Cloud Messaging →
// Web Push certificates. In .env.local als VITE_FIREBASE_VAPID_KEY hinterlegen.
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

let _messaging = null;
export async function getMessagingIfSupported() {
  if (_messaging) return _messaging;
  if (!(await isSupported())) return null;
  _messaging = getMessaging(app);
  return _messaging;
}

// Each device gets a familyId stored in localStorage.
// Share this ID across devices to sync data.
export function getFamilyId() {
  let id = localStorage.getItem("familyId");
  if (!id) {
    id = Math.random().toString(36).slice(2, 10).toUpperCase();
    localStorage.setItem("familyId", id);
  }
  return id;
}

export async function loadFromFirestore() {
  const id = getFamilyId();
  const snap = await getDoc(doc(db, "families", id));
  return snap.exists() ? snap.data() : null;
}

export async function saveToFirestore(data) {
  const id = getFamilyId();
  await setDoc(doc(db, "families", id), data);
}

// Subscribes to live updates from Firestore. Skips snapshots caused by our own
// pending writes so the local optimistic state isn't overwritten.
export function subscribeToFirestore(onRemoteChange) {
  const id = getFamilyId();
  return onSnapshot(doc(db, "families", id), (snap) => {
    if (snap.metadata.hasPendingWrites) return;
    if (!snap.exists()) return;
    onRemoteChange(snap.data());
  });
}
