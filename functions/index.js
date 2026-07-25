import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

// Triggert bei jeder Änderung an families/{familyId}. Vergleicht die
// notifications-Arrays vor/nach dem Write und pusht neue Einträge an alle
// Push-Tokens der Familie.
export const pushOnNotification = onDocumentWritten(
  { document: "families/{familyId}", region: "europe-west1" },
  async (event) => {
    const familyId = event.params.familyId;
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};

    const beforeIds = new Set((before.notifications || []).map((n) => n.id));
    const newNotes = (after.notifications || []).filter((n) => n && !beforeIds.has(n.id));
    if (newNotes.length === 0) return;

    const children = after.children || [];
    const findChild = (id) => children.find((c) => c.id === id);

    const tokensSnap = await db.collection("families").doc(familyId).collection("pushTokens").get();
    if (tokensSnap.empty) return;

    const tokens = tokensSnap.docs.map((d) => decodeURIComponent(d.id));

    for (const note of newNotes) {
      const child = findChild(note.childId);
      const prefix = child ? `${child.avatar} ${child.name}: ` : "";
      const message = {
        notification: {
          title: "🏡 Haushalts-Helden",
          body: `${prefix}${note.text || ""}`.trim(),
        },
        data: {
          type: String(note.type || ""),
          childId: String(note.childId || ""),
          noteId: String(note.id || ""),
          tag: `hh-${note.type || "note"}-${note.id}`,
        },
        webpush: {
          fcmOptions: { link: "/" },
        },
        tokens,
      };

      const res = await messaging.sendEachForMulticast(message);

      // Ungültige Tokens (unregistered / invalid-argument) aus Firestore löschen.
      const toDelete = [];
      res.responses.forEach((r, i) => {
        if (r.success) return;
        const code = r.error?.code || "";
        if (code.includes("registration-token-not-registered") || code.includes("invalid-argument") || code.includes("invalid-registration-token")) {
          toDelete.push(tokensSnap.docs[i].ref);
        }
      });
      if (toDelete.length > 0) {
        const batch = db.batch();
        toDelete.forEach((ref) => batch.delete(ref));
        await batch.commit();
      }
    }
  }
);
