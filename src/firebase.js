import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

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
