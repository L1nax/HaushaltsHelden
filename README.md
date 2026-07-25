# 🏡 Haushalts-Helden

A small family app where kids complete household chores, earn ⭐ stars for them, and trade
those stars for rewards the parents define themselves. The interface is in German.

The app runs as an installable PWA — in the browser, on a phone, or on a wall-mounted
tablet in the kitchen. There are no user accounts and no passwords: every device of a
family shares one **family ID**, and the data syncs through it.

---

## Contents

- [What the app does](#what-the-app-does)
- [How the app is built](#how-the-app-is-built)
- [Installation for users](#installation-for-users-pwa)
- [Installation for developers](#installation-for-developers)
- [Setting up your own Firebase project](#setting-up-your-own-firebase-project)
- [Push notifications](#push-notifications)
- [Deployment](#deployment)
- [Data model](#data-model)
- [Security note](#security-note)

---

## What the app does

### Two areas

The app has a **parent area** and a **child mode**. Both live in the same application;
switching back to the parent area can be protected with a 4-digit parent PIN.

**Parent area**

| Section | Purpose |
|---|---|
| 🏠 Start | Overview of all children: star balance, chores done and still open today, jump into child mode or the detail view. Stars can be corrected manually here with a comment (±). |
| 📋 Aufgaben (Chores) | Create, edit and delete chores — each with emoji, title, star value and recurrence (daily, weekdays, weekends, weekly, one-off). |
| 🎁 Belohnungen (Rewards) | Maintain the shop entries: emoji, title, cost in stars. |
| 🏆 Erfolge (Achievements) | Manage achievements: title, description, condition, target, star bonus, enabled/disabled. |
| 👤 Kinder (Children) | Create, edit and delete child profiles with name and avatar. |
| ⚙️ Einstellungen (Settings) | Parent PIN, family ID (share/connect), kiosk mode. |
| 🔔 Bell | History of every event — completed chores, redeemed rewards, unlocked achievements. |

**Child mode**

A kid-friendly full-screen view with a large star balance, the progress for the day, the
list of chores due today and the reward shop. Tapping a chore marks it done and credits
the stars; tapping again undoes it after a confirmation. If several children exist, you
can switch between them right in the header.

### Achievements

Achievements are evaluated per child whenever something changes. Unlocking one triggers an
animation, grants the configured star bonus and adds an entry to the history. Five
condition types are available:

| Type | Meaning |
|---|---|
| `tasks_total` | Chores completed in total |
| `stars_total` | Stars earned in total |
| `streak_days` | Consecutive days with at least one chore |
| `tasks_day` | Most chores completed on a single day |
| `rewards_redeemed` | Rewards redeemed |

A new family starts with a catalogue of 13 preconfigured achievements, all of which can be
edited or disabled. Children, chores and rewards are created by the parents themselves.

### Kiosk mode

For a permanently installed tablet: the device then boots straight into child mode,
optionally always with a specific child. Combined with the parent PIN, there is no way
back into the parent area without the PIN. Kiosk devices are deliberately unsubscribed
from push notifications so the wall tablet does not chime.

### Push notifications

When a child completes a chore or redeems a reward, the parents' devices receive a push
notification. A Firebase Cloud Function takes care of this (see below) — the app itself
does not need to be open.

---

## How the app is built

- **React 19 + Vite**, no router and no state management library
- The entire UI lives in `src/App.jsx` as a flat list of components
- Navigation via a `view` state string, no URL routing
- Styling is inline only; `src/index.css` holds nothing but keyframes and the base font
- Two-layer persistence: **localStorage** synchronously on every change, **Firestore** in
  the background and as a live sync between devices
- PWA via `vite-plugin-pwa` (prompts for updates instead of applying them silently)

```
src/
  App.jsx           # entire UI, data model, persistence helpers
  firebase.js       # Firebase init, family ID, Firestore read/write/subscribe
  push.js           # register and unregister the FCM token
  UpdatePrompt.jsx  # notice shown when a new version is available
  main.jsx          # entry point
  index.css         # keyframes + base font
functions/
  index.js          # Cloud Function: sends push messages for new events
public/
  firebase-messaging-sw.js  # service worker for background push
```

More architectural detail is documented in [`CLAUDE.md`](CLAUDE.md) (in German).

---

## Installation for users (PWA)

1. Open the app URL in a browser (Chrome/Edge on Android and desktop, Safari on iOS).
2. **Android/desktop:** menu → "Install app" or "Add to home screen".
   **iOS:** share icon → "Add to Home Screen".
3. In the parent area, go to ⚙️ **Einstellungen** and set a **parent PIN** first.
4. Add the children under 👤 **Kinder**, then fill in 📋 **Aufgaben** and 🎁 **Belohnungen**.

### Connecting another device

1. On the first device: ⚙️ Einstellungen → copy the **family ID**.
2. On the new device: ⚙️ Einstellungen → enter the family ID → **Verbinden**.
   The app verifies that the ID exists and then loads that family's data.

Note that anyone who knows the family ID can access that family's data — see the
[security note](#security-note).

---

## Installation for developers

### Requirements

- **Node.js 20** or newer (the Cloud Function is pinned to Node 20)
- npm
- For deployment and Cloud Functions: the [Firebase CLI](https://firebase.google.com/docs/cli)
  (`npm install -g firebase-tools`)

### Running locally

```bash
git clone git@github.com:L1nax/HaushaltsHelden.git
cd HaushaltsHelden
npm install
npm run dev
```

The app is then served at `http://localhost:5173` (Vite picks the next free port if 5173
is taken).

### Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server with hot module replacement |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built output locally |
| `npm run lint` | Oxlint |
| `npm run generate-pwa-assets` | Generate the PWA icons from the source graphic |

There is no test suite.

> Note: without your own configuration the app talks to the Firebase project checked into
> this repository. For your own use, create a separate Firebase project — see the next
> section.

---

## Setting up your own Firebase project

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
   and enable **Firestore** in a region of your choice (production mode).
2. Register a **web app** inside the project and copy the configuration values.
3. Put those values in two places:
   - `src/firebase.js` → `firebaseConfig`
   - `public/firebase-messaging-sw.js` → `firebase.initializeApp({ … })`
     (the service worker cannot read Vite environment variables, hence the duplication)
4. Replace the project ID behind `"default"` in `.firebaserc`.
5. Publish the Firestore rules from `firestore.rules`:

   ```bash
   firebase deploy --only firestore:rules
   ```

The values in `firebaseConfig` are not secrets — they only identify the project. Access is
governed by the Firestore rules.

---

## Push notifications

1. In the Firebase console, go to **Project Settings → Cloud Messaging → Web Push
   certificates**, generate a key pair and copy the public key.
2. Put it in `.env` in the project root — the file is committed on purpose:

   ```
   VITE_FIREBASE_VAPID_KEY=your-public-vapid-key
   ```

   The VAPID *public* key is not a secret. It ships inside every client bundle and is
   readable by anyone in the browser, so hiding it in an ignored `.env.local` buys no
   security while making it easy to build without it. `vite build` refuses to run when the
   variable is missing or not 87 characters long: without it the minifier folds the
   `if (!VAPID_KEY)` guard in `src/push.js` into a constant and strips the rest of
   `registerPush()`, producing a build that has no push support and says nothing about it.
3. Deploy the Cloud Function (requires the Blaze plan):

   ```bash
   cd functions && npm install && cd ..
   firebase deploy --only functions
   ```

The `pushOnNotification` function is attached to the `families/{familyId}` document. On
every write it diffs the event list and sends new entries to all registered push tokens of
that family. Tokens that FCM reports as invalid are cleaned up automatically. The region is
set to `europe-west1` in `functions/index.js`.

Push requires HTTPS. Locally it only works via `http://localhost`, not across the network.

---

## Deployment

The build is a static site and can be served by any static host. All that matters is that
unknown paths fall back to `index.html` and that HTTPS is enabled (a prerequisite for both
PWA and push).

```bash
npm run build   # output goes to dist/
```

Then publish `dist/` with the host of your choice. The Cloud Function is deployed
separately through the Firebase CLI (see above).

---

## Data model

The complete state lives in a single object, stored under `families/{familyId}` in
Firestore and under the localStorage key `haushalts-app-data`:

```js
{
  children:             [{ id, name, avatar, stars }],
  tasks:                [{ id, emoji, title, stars, recurring }],
  completions:          [{ id, taskId, childId, date }],
  starLog:              [{ id, childId, delta, comment, date }],
  notifications:        [{ id, type, childId, text, date, read }],
  rewards:              [{ id, emoji, title, cost }],
  rewardLog:            [{ id, rewardId, childId, date }],
  achievements:         [{ id, emoji, title, description, type, target, starReward, enabled }],
  unlockedAchievements: [{ id, achievementId, childId, date, starReward }],
  pin:                  string | null,
}
```

`recurring` is one of `"daily"`, `"weekdays"`, `"weekend"`, `"weekly"`, `"once"`.

Missing fields are filled in by `ensureFields()` on load so that older data keeps working.

### Other localStorage keys

| Key | Purpose |
|---|---|
| `familyId` | This device's family ID |
| `kioskMode`, `kioskChild`, `kioskChildName` | This device's kiosk settings |
| `hh-device-id`, `hh-fcm-token` | This device's push registration |
| `noPinWarningSuppressed` | "No PIN set" warning dismissed permanently |

---

## Security note

The Firestore rules allow reads and writes for **anyone who knows the family ID**
(`firestore.rules`). There is no authentication. This is a deliberate choice for private
use within a single household — it keeps the app usable without accounts — but it means:

- Treat the family ID like a password and do not share it publicly.
- The parent PIN only guards the interface against your own kids, not the data itself.

For anything beyond private use, add Firebase Authentication and correspondingly stricter
Firestore rules.
