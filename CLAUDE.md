# CLAUDE.md

Diese Datei enthält Hinweise für Claude Code (claude.ai/code) beim Arbeiten in diesem Repository.

## Sprache

Antworte grundsätzlich auf Deutsch, unabhängig davon, in welcher Sprache eine Frage gestellt wird.

## Befehle

```bash
npm run dev       # Entwicklungsserver starten (Vite HMR)
npm run build     # Produktions-Build → dist/
npm run preview   # Den dist/-Build lokal vorschauen
npm run lint      # Oxlint ausführen
```

Es gibt keine Test-Suite.

## Architektur

Dies ist eine Single-Page-React-App (Vite + React 19) ohne Routing-Bibliothek. Die gesamte UI befindet sich in `src/App.jsx` (~1600 Zeilen) als flache Liste von Komponenten, die von einem einzigen `App`-Root gerendert werden.

### View-System

Die Navigation wird über einen `view`-State-String in `App` gesteuert. Das Wechseln der Ansicht rendert einfach bedingt eine andere Komponente — kein Router, keine URL-Änderungen. Aktuelle Views: `overview`, `tasks`, `rewards`, `children`, `settings`, `childDetail` und `childMode`.

`childMode` ist eine spezielle Vollbild-Übernahme für die kinderfreundliche UI. Sie verlässt das normale Eltern-Layout (Sidebar + Navigationsleiste) vollständig und rendert `ChildMode` direkt. Die Rückkehr in den Elternbereich erfordert einen PIN, sofern einer gesetzt ist.

### Datenmodell

Der gesamte App-State lebt in einem einzigen `data`-Objekt mit dieser Struktur:

```js
{
  children:      [{ id, name, avatar, stars }],
  tasks:         [{ id, emoji, title, stars, recurring }],
  completions:   [{ id, taskId, childId, date }],
  starLog:       [{ id, childId, delta, comment, date }],
  notifications: [{ id, type, childId, text, date, read }],
  rewards:       [{ id, emoji, title, cost }],
  pin:           string | null,
}
```

`task.recurring` ist eines von: `"daily"`, `"weekdays"`, `"weekend"`, `"weekly"`, `"once"`.

### Persistenz

Zwei Ebenen, immer gemeinsam über `saveData()` geschrieben:

1. **localStorage** (`"haushalts-app-data"`) — wird bei jeder Änderung synchron geschrieben
2. **Firebase Firestore** — wird im Hintergrund geschrieben; beim Start überschreiben Remote-Daten die lokalen, falls vorhanden

Das Firestore-Dokument liegt unter `families/{familyId}`. Die `familyId` wird automatisch generiert und in `localStorage("familyId")` gespeichert. Nutzer können ihre ID in den Einstellungen teilen, um geräteübergreifend zu synchronisieren.

### Responsives Layout

`useIsTablet()` (≥768px Breite) schaltet das gesamte Layout um:
- **Mobil**: Obere Headerleiste + untere Tab-Leiste + einspaltige Inhalte
- **Tablet**: Fixe 220px-Sidebar + Hauptinhaltsbereich

`ChildMode` hat ein eigenes responsives Layout: einspaltiger Aufbau auf Mobilgeräten, zweispaltig (Aufgaben | fixierter Shop) auf Tablets.

### Styling

Alle Styles sind inline (`style={{}}`). Keine CSS-Module, kein Tailwind. Das globale `src/index.css` definiert nur `@keyframes`-Animationen und die Basis-Schriftart. Die `COLORS`-Konstante am Anfang von `App.jsx` ist die einzige Quelle für die Farbpalette.

### Gemeinsame Primitive (definiert in App.jsx)

| Komponente | Zweck |
|------------|-------|
| `Btn` | Button mit gefüllter/umrissener Variante und Drück-Animation |
| `Card` | Weißes abgerundetes Kästchen mit Schatten |
| `Modal` | Zentrierter Overlay-Dialog |
| `Badge` | Farbiges Pill-Label |
| `EmojiPicker` | Raster mit auswählbaren Emoji-Buttons |
| `FormField` | Label + Kind-Input-Wrapper |
| `PinDialog` | 4-stelliger PIN-Nummernblock (Prüf- oder Setzmodus) |

### Firebase-Konfiguration

Die Firebase-Projekt-Credentials sind fest eingetragen in `src/firebase.js`. Das Projekt ist `haushaltshelden-aa312` auf Google Firebase (Firestore).
