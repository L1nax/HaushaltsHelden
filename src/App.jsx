import { useState, useEffect } from "react";

// ── Accent colors (same in light/dark) ────────────────────────────────────────
const A = {
  sun: "#FFD93D", mint: "#6BCB77", sky: "#4D96FF",
  rose: "#FF6B6B", lavender: "#C77DFF", green: "#4CAF50",
  orange: "#FF9F43",
};

// ── Theme ─────────────────────────────────────────────────────────────────────
const theme = (dark) => ({
  bg:          dark ? "#111113" : "#F0F4F8",
  card:        dark ? "#1C1C1E" : "#FFFFFF",
  cardAlt:     dark ? "#2C2C2E" : "#F7FAFC",
  border:      dark ? "#2C2C2E" : "#E2E8F0",
  borderAlt:   dark ? "#3A3A3C" : "#EEE",
  text:        dark ? "#FFFFFF" : "#1A1A2E",
  textSub:     dark ? "#AEAEB2" : "#718096",
  textMuted:   dark ? "#636366" : "#A0AEC0",
  navBg:       dark ? "#1C1C1E" : "#FFFFFF",
  headerBg:    dark ? "#000000" : "#1A1A2E",
  inputBg:     dark ? "#2C2C2E" : "#FFFFFF",
  taskBg:      dark ? "#2C2C2E" : "#FAFAFA",
  taskDoneBg:  dark ? "#1A2E1A" : A.mint + "22",
  sidebarBg:   dark ? "#0A0A0C" : "#F7FAFC",
  sectionHdr:  dark ? "#636366" : "#A0AEC0",
});

const EMOJIS = ["🧹","🍽️","🛏️","🐕","🌿","🧺","🗑️","🚿","📚","🧴","🪣","🧽","🏠","🪟","🚗","🐈","🌻","🧸"];
const REWARD_EMOJIS = ["🎮","🍕","🎬","🛍️","🍦","🎁","🎨","🏖️","🍫","🎡","🃏","🧩"];

const RECURRING_OPTIONS = [
  { value: "daily",    label: "Jederzeit / Täglich", badge: "Jederzeit", short: "JEDERZEIT", color: A.sky },
  { value: "weekdays", label: "Mo–Fr",               badge: "Mo–Fr",     short: "WOCHENTAGE", color: A.mint },
  { value: "weekend",  label: "Wochenende",           badge: "Wochenende",short: "WOCHENENDE", color: A.lavender },
  { value: "weekly",   label: "Wöchentlich",          badge: "Wöchentlich",short: "WÖCHENTLICH", color: A.orange },
  { value: "once",     label: "Einmalig",             badge: "Einmalig",  short: "EINMALIG",  color: A.rose },
];

const recurringOpt = (val) => RECURRING_OPTIONS.find(o => o.value === val) || RECURRING_OPTIONS[0];

const uid = () => Math.random().toString(36).slice(2, 9);

const DAYS_SHORT = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"];

function isTaskDueToday(task, date = new Date()) {
  const dow = date.getDay();
  switch (task.recurring) {
    case "daily":    return true;
    case "weekdays": return dow >= 1 && dow <= 5;
    case "weekend":  return dow === 0 || dow === 6;
    case "weekly":   return true;
    case "once":     return true;
    default:         return true;
  }
}

function completedThisWeek(completions, taskId, childId) {
  const now = new Date();
  const startOfWeek = new Date(now);
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
  startOfWeek.setDate(now.getDate() - day);
  startOfWeek.setHours(0, 0, 0, 0);
  return completions.some(c =>
    c.taskId === taskId && c.childId === childId && new Date(c.date) >= startOfWeek
  );
}

const DEFAULT_DATA = {
  children: [
    { id: uid(), name: "Jaro", avatar: "🦊", stars: 12 },
    { id: uid(), name: "Kiro", avatar: "🐻", stars: 8 },
  ],
  tasks: [
    { id: uid(), emoji: "🧹", title: "Zimmer aufräumen",       stars: 2, recurring: "daily" },
    { id: uid(), emoji: "🍽️", title: "Tisch decken",           stars: 1, recurring: "weekdays" },
    { id: uid(), emoji: "🐕", title: "Hund füttern",           stars: 2, recurring: "daily" },
    { id: uid(), emoji: "🧺", title: "Wäsche zusammenlegen",   stars: 3, recurring: "weekly" },
  ],
  completions: [],
  starLog: [],
  notifications: [],
  rewards: [
    { id: uid(), emoji: "🎮", title: "1 Stunde extra Spielzeit", cost: 20 },
    { id: uid(), emoji: "🍕", title: "Pizza-Abend wählen",       cost: 30 },
    { id: uid(), emoji: "🎬", title: "Film aussuchen",           cost: 15 },
  ],
  darkMode: true,
  pin: null,
};

function loadData() {
  try {
    const r = localStorage.getItem("haushalts-app-data");
    return r ? JSON.parse(r) : DEFAULT_DATA;
  } catch { return DEFAULT_DATA; }
}

function saveData(data) {
  try { localStorage.setItem("haushalts-app-data", JSON.stringify(data)); } catch {}
}

function addNotification(data, type, child, text) {
  const note = { id: uid(), type, childId: child.id, text, date: new Date().toISOString(), read: false };
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("🏡 Haushalts-Helden", { body: `${child.avatar} ${child.name}: ${text}` });
  }
  return { ...data, notifications: [note, ...(data.notifications || [])] };
}

// ── Week helpers ──────────────────────────────────────────────────────────────
function getWeekDays(referenceDate = new Date()) {
  const dow = referenceDate.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(referenceDate);
    d.setDate(referenceDate.getDate() + mondayOffset + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

// ── Primitives ────────────────────────────────────────────────────────────────
function Badge({ color, children }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}44`,
      borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700,
    }}>{children}</span>
  );
}

function Btn({ onClick, color = A.sky, children, small, outline, disabled, style: s }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: outline ? "transparent" : color,
      color: outline ? color : "#fff",
      border: `2px solid ${color}`,
      borderRadius: 12,
      padding: small ? "5px 14px" : "10px 22px",
      fontSize: small ? 13 : 15,
      fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      transition: "transform .1s",
      ...s,
    }}
      onMouseDown={e => !disabled && (e.currentTarget.style.transform = "scale(.96)")}
      onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
    >{children}</button>
  );
}

function Card({ children, style, T }) {
  return (
    <div style={{
      background: T.card, borderRadius: 20,
      padding: "20px 24px", border: `1px solid ${T.border}`, ...style,
    }}>{children}</div>
  );
}

function Modal({ title, onClose, children, T }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#0008", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: T.card, borderRadius: 20, padding: "20px 24px",
        width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
        border: `1px solid ${T.border}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: T.text }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: T.textSub }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmojiPicker({ value, onChange, list, accentColor }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {list.map(e => (
        <button key={e} onClick={() => onChange(e)} style={{
          fontSize: 24,
          background: value === e ? accentColor + "33" : "#f5f5f533",
          border: `2px solid ${value === e ? accentColor : "transparent"}`,
          borderRadius: 10, padding: "6px 10px", cursor: "pointer",
        }}>{e}</button>
      ))}
    </div>
  );
}

function FormField({ label, children, T }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: T.textSub, display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = (T) => ({
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: `2px solid ${T.borderAlt}`, fontSize: 15,
  boxSizing: "border-box", background: T.inputBg, color: T.text,
});

// ── Week Strip ────────────────────────────────────────────────────────────────
function WeekStrip({ data, childId, selectedDay, onSelectDay, T }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const week = getWeekDays(today);

  const hasCompletions = (date) => {
    const ds = date.toDateString();
    return data.completions.some(c => c.childId === childId && new Date(c.date).toDateString() === ds);
  };

  return (
    <div style={{ background: T.card, borderRadius: 16, padding: "12px 8px", marginBottom: 16, border: `1px solid ${T.border}` }}>
      <div style={{ textAlign: "center", fontSize: 13, color: T.textSub, marginBottom: 10, fontWeight: 600 }}>
        Heute, {today.toLocaleDateString("de-DE", { month: "long", day: "numeric" })}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {week.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString();
          const isSelected = d.toDateString() === selectedDay;
          const hasDone = hasCompletions(d);
          const isFuture = d > today;
          return (
            <div key={i} onClick={() => onSelectDay(d.toDateString())}
              style={{
                flex: 1, textAlign: "center", padding: "8px 2px",
                borderRadius: 12, cursor: isFuture ? "default" : "pointer",
                background: isToday ? A.mint : isSelected && !isToday ? T.cardAlt : "transparent",
                opacity: isFuture ? 0.35 : 1,
                transition: "background .15s",
              }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? "white" : T.textSub }}>
                {DAYS_SHORT[d.getDay()]}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: isToday ? "white" : T.text, lineHeight: 1.4 }}>
                {d.getDate()}
              </div>
              <div style={{ height: 6, display: "flex", justifyContent: "center", alignItems: "center" }}>
                {hasDone && !isToday && (
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: A.mint }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section header (like "JEDERZEIT ↻") ──────────────────────────────────────
function SectionHeader({ label, color, T }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "20px 0 8px", paddingLeft: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: T.sectionHdr, letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 13, color: T.sectionHdr }}>↻</span>
    </div>
  );
}

// ── Forms ─────────────────────────────────────────────────────────────────────
function TaskForm({ initial, onSave, onCancel, T }) {
  const [form, setForm] = useState(initial);
  const save = () => { if (!form.title.trim()) return; onSave({ ...form, stars: Number(form.stars) }); };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <FormField label="Emoji" T={T}>
        <EmojiPicker value={form.emoji} onChange={e => setForm({ ...form, emoji: e })} list={EMOJIS} accentColor={A.sky} />
      </FormField>
      <FormField label="Aufgabe" T={T}>
        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
          placeholder="z.B. Zimmer aufräumen" style={inputStyle(T)} />
      </FormField>
      <FormField label="⭐ Sterne" T={T}>
        <input type="number" min={1} max={10} value={form.stars}
          onChange={e => setForm({ ...form, stars: e.target.value })} style={inputStyle(T)} />
      </FormField>
      <FormField label="🔁 Wiederholung" T={T}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {RECURRING_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setForm({ ...form, recurring: opt.value })}
              style={{
                padding: "10px 12px", borderRadius: 12, cursor: "pointer", fontWeight: 700,
                fontSize: 13, textAlign: "center",
                background: form.recurring === opt.value ? opt.color + "22" : T.cardAlt,
                border: `2px solid ${form.recurring === opt.value ? opt.color : "transparent"}`,
                color: form.recurring === opt.value ? opt.color : T.textSub,
              }}>
              {opt.badge}
            </button>
          ))}
        </div>
      </FormField>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn color={A.mint} onClick={save}>Speichern</Btn>
        <Btn outline color={A.rose} onClick={onCancel}>Abbrechen</Btn>
      </div>
    </div>
  );
}

function RewardForm({ initial, onSave, onCancel, T }) {
  const [form, setForm] = useState(initial);
  const save = () => { if (!form.title.trim()) return; onSave({ ...form, cost: Number(form.cost) }); };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <FormField label="Emoji" T={T}><EmojiPicker value={form.emoji} onChange={e => setForm({ ...form, emoji: e })} list={REWARD_EMOJIS} accentColor={A.lavender} /></FormField>
      <FormField label="Belohnung" T={T}><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="z.B. 1 Stunde extra Spielzeit" style={inputStyle(T)} /></FormField>
      <FormField label="⭐ Sterne-Kosten" T={T}><input type="number" min={1} value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} style={inputStyle(T)} /></FormField>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn color={A.lavender} onClick={save}>Speichern</Btn>
        <Btn outline color={A.rose} onClick={onCancel}>Abbrechen</Btn>
      </div>
    </div>
  );
}

function EditDeleteBtns({ onEdit, onDelete, T }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={onEdit} style={{ background: A.sky + "18", border: `1.5px solid ${A.sky}44`, borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 15, color: A.sky, fontWeight: 700 }}>✏️</button>
      <button onClick={onDelete} style={{ background: T.cardAlt, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 15, color: T.textSub }}>🗑️</button>
    </div>
  );
}

// ── Star Adjust Modal ─────────────────────────────────────────────────────────
function StarAdjustModal({ child, data, setData, onClose, T }) {
  const [delta, setDelta] = useState(1);
  const [sign, setSign] = useState("+");
  const [comment, setComment] = useState("");

  const apply = () => {
    const change = sign === "+" ? Math.abs(delta) : -Math.abs(delta);
    const newStars = Math.max(0, child.stars + change);
    const logEntry = { id: uid(), childId: child.id, delta: change, comment: comment.trim(), date: new Date().toISOString() };
    const updChildren = data.children.map(c => c.id === child.id ? { ...c, stars: newStars } : c);
    const updated = { ...data, children: updChildren, starLog: [logEntry, ...(data.starLog || [])] };
    setData(updated); saveData(updated); onClose();
  };

  const childLog = (data.starLog || []).filter(e => e.childId === child.id).slice(0, 5);

  return (
    <Modal title={`⭐ Sterne – ${child.avatar} ${child.name}`} onClose={onClose} T={T}>
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ background: A.sun + "22", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 32 }}>⭐</span>
          <div>
            <div style={{ fontSize: 13, color: T.textSub }}>Aktuelles Guthaben</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: T.text }}>{child.stars} Sterne</div>
          </div>
        </div>
        <FormField label="Aktion" T={T}>
          <div style={{ display: "flex", gap: 10 }}>
            {["+", "−"].map(s => (
              <button key={s} onClick={() => setSign(s === "−" ? "-" : "+")}
                style={{ flex: 1, padding: "12px", borderRadius: 12, fontSize: 22, fontWeight: 900, cursor: "pointer",
                  background: sign === (s === "−" ? "-" : "+") ? (s === "+" ? A.mint + "33" : A.rose + "33") : T.cardAlt,
                  border: `2px solid ${sign === (s === "−" ? "-" : "+") ? (s === "+" ? A.mint : A.rose) : "transparent"}`,
                  color: s === "+" ? A.mint : A.rose }}>
                {s}
              </button>
            ))}
          </div>
        </FormField>
        <FormField label="Anzahl" T={T}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            {[1, 2, 3, 5, 10].map(n => (
              <button key={n} onClick={() => setDelta(n)}
                style={{ padding: "8px 14px", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer",
                  background: delta === n ? A.sky + "33" : T.cardAlt, border: `2px solid ${delta === n ? A.sky : "transparent"}`,
                  color: delta === n ? A.sky : T.textSub }}>
                {n}
              </button>
            ))}
          </div>
          <input type="number" min={1} max={999} value={delta} onChange={e => setDelta(Math.max(1, Number(e.target.value)))} style={inputStyle(T)} />
        </FormField>
        <div style={{ background: T.cardAlt, borderRadius: 12, padding: "10px 16px", fontSize: 14, color: T.textSub, display: "flex", justifyContent: "space-between" }}>
          <span>Ergebnis:</span>
          <strong style={{ color: T.text }}>{Math.max(0, child.stars + (sign === "+" ? delta : -delta))} Sterne</strong>
        </div>
        <FormField label="Kommentar (optional)" T={T}>
          <input value={comment} onChange={e => setComment(e.target.value)} placeholder="z.B. Super geholfen!" style={inputStyle(T)} />
        </FormField>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn color={sign === "+" ? A.mint : A.rose} onClick={apply}>{sign === "+" ? "⭐ Hinzufügen" : "⭐ Abziehen"}</Btn>
          <Btn outline color={T.textSub} onClick={onClose}>Abbrechen</Btn>
        </div>
        {childLog.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.textSub, marginBottom: 8 }}>Letzte Änderungen</div>
            {childLog.map(entry => (
              <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 10, background: T.cardAlt, borderRadius: 10, padding: "8px 12px", marginBottom: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: entry.delta >= 0 ? A.mint : A.rose, minWidth: 40 }}>
                  {entry.delta >= 0 ? "+" : ""}{entry.delta}⭐
                </span>
                <div style={{ flex: 1 }}>
                  {entry.comment && <div style={{ fontSize: 13, color: T.text }}>{entry.comment}</div>}
                  <div style={{ fontSize: 11, color: T.textMuted }}>{new Date(entry.date).toLocaleDateString("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── PIN Dialog ────────────────────────────────────────────────────────────────
function PinDialog({ pin, onSuccess, onCancel, mode = "check", T }) {
  const [input, setInput] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  const handleDigit = (d) => {
    setError("");
    if (mode === "check") {
      const next = input + d;
      setInput(next);
      if (next.length === 4) {
        if (next === pin) { onSuccess(); }
        else { setError("Falscher PIN!"); setTimeout(() => setInput(""), 600); }
      }
    } else {
      if (step === 1) {
        const next = input + d; setInput(next);
        if (next.length === 4) setStep(2);
      } else {
        const next = confirm + d; setConfirm(next);
        if (next.length === 4) {
          if (next === input) { onSuccess(input); }
          else { setError("PINs stimmen nicht überein!"); setTimeout(() => { setConfirm(""); setStep(1); setInput(""); }, 800); }
        }
      }
    }
  };

  const handleDel = () => {
    setError("");
    if (mode === "check") setInput(p => p.slice(0, -1));
    else if (step === 1) setInput(p => p.slice(0, -1));
    else setConfirm(p => p.slice(0, -1));
  };

  const current = mode === "check" ? input : (step === 1 ? input : confirm);
  const label = mode === "check" ? "Eltern-PIN eingeben" : step === 1 ? "Neuen PIN (4 Ziffern)" : "PIN bestätigen";

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000c", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: T.card, borderRadius: 24, padding: "32px 28px", width: "100%", maxWidth: 320, textAlign: "center", border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6, color: T.text }}>{label}</div>
        {error && <div style={{ color: A.rose, fontSize: 14, marginBottom: 8, fontWeight: 700 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "center", gap: 12, margin: "20px 0" }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: i < current.length ? T.text : T.border, transition: "background .15s" }} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[1,2,3,4,5,6,7,8,9].map(d => (
            <button key={d} onClick={() => handleDigit(String(d))}
              style={{ padding: "16px", borderRadius: 14, border: "none", background: T.cardAlt, fontSize: 20, fontWeight: 700, cursor: "pointer", color: T.text }}
              onMouseDown={e => e.currentTarget.style.opacity = "0.6"}
              onMouseUp={e => e.currentTarget.style.opacity = "1"}>
              {d}
            </button>
          ))}
          <div />
          <button onClick={() => handleDigit("0")} style={{ padding: "16px", borderRadius: 14, border: "none", background: T.cardAlt, fontSize: 20, fontWeight: 700, cursor: "pointer", color: T.text }}>0</button>
          <button onClick={handleDel} style={{ padding: "16px", borderRadius: 14, border: "none", background: T.cardAlt, fontSize: 20, cursor: "pointer", color: T.textSub }}>⌫</button>
        </div>
        {onCancel && <button onClick={onCancel} style={{ background: "none", border: "none", color: T.textMuted, fontSize: 14, cursor: "pointer" }}>Abbrechen</button>}
      </div>
    </div>
  );
}

function AutoRedirect({ onRedirect }) {
  useEffect(() => { onRedirect(); }, []);
  return null;
}

// ── START SCREEN ──────────────────────────────────────────────────────────────
function StartScreen({ data, setView, setSelectedChild, T }) {
  const previewTasks = data.tasks.slice(0, 3);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <h1 style={{ color: T.text, fontSize: 36, fontWeight: 900, textAlign: "center", marginBottom: 8, lineHeight: 1.2 }}>
          Kleine Aufgaben<br />Große Gewohnheiten
        </h1>
        <p style={{ color: T.textSub, textAlign: "center", marginBottom: 40, fontSize: 16 }}>
          Haushalts-Helden
        </p>

        {/* Preview task list */}
        <div style={{ marginBottom: 40, display: "grid", gap: 10 }}>
          {previewTasks.map((task, i) => (
            <div key={task.id} style={{
              background: i === 2 ? T.cardAlt : T.card,
              borderRadius: 14, padding: "14px 18px",
              display: "flex", alignItems: "center", gap: 14,
              border: `1px solid ${T.border}`,
              opacity: i === 2 ? 0.7 : 1,
            }}>
              {i === 2
                ? <div style={{ width: 24, height: 24, borderRadius: "50%", background: A.mint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ color: "white", fontSize: 14, fontWeight: 900 }}>✓</span></div>
                : <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${T.border}`, flexShrink: 0 }} />
              }
              <span style={{ fontSize: 22 }}>{task.emoji}</span>
              <span style={{ color: T.text, fontWeight: 600, flex: 1, textDecoration: i === 2 ? "line-through" : "none", opacity: i === 2 ? 0.5 : 1 }}>{task.title}</span>
              {i < 2 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ color: T.text, fontWeight: 700 }}>{task.stars}</span>
                  <span style={{ fontSize: 16 }}>⭐</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Role buttons */}
        <div style={{ display: "grid", gap: 12 }}>
          <button onClick={() => setView("overview")}
            style={{ background: A.green, border: "none", borderRadius: 16, padding: "18px", fontSize: 17, fontWeight: 800, color: "white", cursor: "pointer" }}>
            Ich bin Elternteil
          </button>
          <button onClick={() => {
            if (data.children.length > 0) {
              setSelectedChild(data.children[0].id);
              setView("childMode");
            } else {
              setView("overview");
            }
          }}
            style={{ background: T.card, border: `2px solid ${T.border}`, borderRadius: 16, padding: "18px", fontSize: 17, fontWeight: 700, color: T.text, cursor: "pointer" }}>
            Ich bin Kind
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PARENT VIEWS ──────────────────────────────────────────────────────────────
function ParentOverview({ data, setData, setView, setSelectedChild, T }) {
  const todayStr = new Date().toDateString();
  const [adjustChild, setAdjustChild] = useState(null);

  const tasksDoneToday = (childId) =>
    data.completions.filter(c => c.childId === childId && new Date(c.date).toDateString() === todayStr).length;
  const tasksPending = (childId) => {
    const dueTodayIds = data.tasks.filter(isTaskDueToday).map(t => t.id);
    const done = data.completions.filter(c => c.childId === childId && new Date(c.date).toDateString() === todayStr).map(c => c.taskId);
    return dueTodayIds.filter(id => !done.includes(id)).length;
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 6, color: T.text }}>👨‍👩‍👧‍👦 Kinder-Übersicht</h2>
      <p style={{ color: T.textSub, marginBottom: 20, marginTop: 0 }}>
        {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
      </p>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        {data.children.map(child => (
          <div key={child.id} style={{ background: T.card, borderRadius: 20, padding: "20px 24px", border: `1px solid ${T.border}`, borderTop: `4px solid ${A.mint}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 42 }}>{child.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 20, color: T.text }}>{child.name}</div>
                <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge color={A.sun}>⭐ {child.stars}</Badge>
                  <button onClick={() => setAdjustChild(child)} style={{ background: A.sun + "33", border: `1.5px solid ${A.sun}88`, borderRadius: 8, padding: "2px 8px", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#b8860b" }}>±</button>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: T.textSub }}>✅ {tasksDoneToday(child.id)} erledigt</div>
              <div style={{ fontSize: 13, color: T.textSub }}>⏳ {tasksPending(child.id)} offen</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn small color={A.sky} onClick={() => { setSelectedChild(child.id); setView("childMode"); }}>Kindansicht</Btn>
              <Btn small outline color={A.lavender} onClick={() => { setSelectedChild(child.id); setView("childDetail"); }}>Details</Btn>
            </div>
          </div>
        ))}
      </div>
      {adjustChild && <StarAdjustModal child={adjustChild} data={data} setData={setData} onClose={() => setAdjustChild(null)} T={T} />}
      <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Btn color={A.mint} onClick={() => setView("tasks")}>📋 Aufgaben</Btn>
        <Btn color={A.lavender} onClick={() => setView("rewards")}>🎁 Belohnungen</Btn>
        <Btn outline color={A.rose} onClick={() => setView("children")}>👤 Kinder</Btn>
      </div>
    </div>
  );
}

function TasksView({ data, setData, T }) {
  const BLANK = { emoji: "🧹", title: "", stars: 1, recurring: "daily" };
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState(null);

  const addTask = (form) => { const u = { ...data, tasks: [...data.tasks, { ...form, id: uid() }] }; setData(u); saveData(u); setShowAdd(false); };
  const saveEdit = (form) => { const u = { ...data, tasks: data.tasks.map(t => t.id === editTask.id ? { ...form, id: t.id } : t) }; setData(u); saveData(u); setEditTask(null); };
  const deleteTask = (id) => { const u = { ...data, tasks: data.tasks.filter(t => t.id !== id) }; setData(u); saveData(u); };

  // Group by recurring
  const grouped = RECURRING_OPTIONS.map(opt => ({
    ...opt,
    tasks: data.tasks.filter(t => t.recurring === opt.value),
  })).filter(g => g.tasks.length > 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: T.text }}>📋 Aufgaben</h2>
        <Btn color={A.mint} onClick={() => setShowAdd(true)}>+ Neue Aufgabe</Btn>
      </div>
      {grouped.map(group => (
        <div key={group.value}>
          <SectionHeader label={group.short} color={group.color} T={T} />
          <div style={{ display: "grid", gap: 10 }}>
            {group.tasks.map(task => (
              <div key={task.id} style={{ background: T.card, borderRadius: 16, display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", border: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 30 }}>{task.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{task.title}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <Badge color={A.sun}>⭐ {task.stars}</Badge>
                    <Badge color={group.color}>{group.badge}</Badge>
                  </div>
                </div>
                <EditDeleteBtns onEdit={() => setEditTask(task)} onDelete={() => deleteTask(task.id)} T={T} />
              </div>
            ))}
          </div>
        </div>
      ))}
      {showAdd && <Modal title="Neue Aufgabe" onClose={() => setShowAdd(false)} T={T}><TaskForm initial={BLANK} onSave={addTask} onCancel={() => setShowAdd(false)} T={T} /></Modal>}
      {editTask && <Modal title="Aufgabe bearbeiten" onClose={() => setEditTask(null)} T={T}><TaskForm initial={{ emoji: editTask.emoji, title: editTask.title, stars: editTask.stars, recurring: editTask.recurring }} onSave={saveEdit} onCancel={() => setEditTask(null)} T={T} /></Modal>}
    </div>
  );
}

function RewardsView({ data, setData, T }) {
  const BLANK = { emoji: "🎮", title: "", cost: 20 };
  const [showAdd, setShowAdd] = useState(false);
  const [editReward, setEditReward] = useState(null);

  const addReward = (form) => { const u = { ...data, rewards: [...data.rewards, { ...form, id: uid() }] }; setData(u); saveData(u); setShowAdd(false); };
  const saveEdit = (form) => { const u = { ...data, rewards: data.rewards.map(r => r.id === editReward.id ? { ...form, id: r.id } : r) }; setData(u); saveData(u); setEditReward(null); };
  const deleteReward = (id) => { const u = { ...data, rewards: data.rewards.filter(r => r.id !== id) }; setData(u); saveData(u); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: T.text }}>🎁 Belohnungen</h2>
        <Btn color={A.lavender} onClick={() => setShowAdd(true)}>+ Neue Belohnung</Btn>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {data.rewards.map(r => (
          <div key={r.id} style={{ background: T.card, borderRadius: 16, display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", border: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 30 }}>{r.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{r.title}</div>
              <Badge color={A.sun}>⭐ {r.cost} Sterne</Badge>
            </div>
            <EditDeleteBtns onEdit={() => setEditReward(r)} onDelete={() => deleteReward(r.id)} T={T} />
          </div>
        ))}
      </div>
      {showAdd && <Modal title="Neue Belohnung" onClose={() => setShowAdd(false)} T={T}><RewardForm initial={BLANK} onSave={addReward} onCancel={() => setShowAdd(false)} T={T} /></Modal>}
      {editReward && <Modal title="Belohnung bearbeiten" onClose={() => setEditReward(null)} T={T}><RewardForm initial={{ emoji: editReward.emoji, title: editReward.title, cost: editReward.cost }} onSave={saveEdit} onCancel={() => setEditReward(null)} T={T} /></Modal>}
    </div>
  );
}

function ChildrenView({ data, setData, T }) {
  const AVATARS = ["🦊","🐻","🐼","🦁","🐯","🦄","🐸","🐨","🐙","🦋"];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", avatar: "🦊" });
  const [adjustChild, setAdjustChild] = useState(null);

  const addChild = () => {
    if (!form.name.trim()) return;
    const u = { ...data, children: [...data.children, { ...form, id: uid(), stars: 0 }] };
    setData(u); saveData(u); setShowForm(false); setForm({ name: "", avatar: "🦊" });
  };
  const removeChild = (id) => { const u = { ...data, children: data.children.filter(c => c.id !== id) }; setData(u); saveData(u); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: T.text }}>👤 Kinder</h2>
        <Btn color={A.sky} onClick={() => setShowForm(true)}>+ Kind</Btn>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {data.children.map(child => (
          <div key={child.id} style={{ background: T.card, borderRadius: 16, display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", border: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 36 }}>{child.avatar}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: T.text }}>{child.name}</div>
              <Badge color={A.sun}>⭐ {child.stars}</Badge>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setAdjustChild(child)} style={{ background: A.sun + "33", border: `1.5px solid ${A.sun}88`, borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 15, fontWeight: 700, color: "#b8860b" }}>⭐±</button>
              <button onClick={() => removeChild(child.id)} style={{ background: T.cardAlt, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 15, color: T.textSub }}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
      {adjustChild && <StarAdjustModal child={adjustChild} data={data} setData={setData} onClose={() => setAdjustChild(null)} T={T} />}
      {showForm && (
        <Modal title="Kind hinzufügen" onClose={() => setShowForm(false)} T={T}>
          <div style={{ display: "grid", gap: 14 }}>
            <FormField label="Avatar" T={T}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {AVATARS.map(a => (
                  <button key={a} onClick={() => setForm({ ...form, avatar: a })}
                    style={{ fontSize: 28, background: form.avatar === a ? A.sky + "33" : T.cardAlt, border: `2px solid ${form.avatar === a ? A.sky : "transparent"}`, borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}>
                    {a}
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label="Name" T={T}>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name des Kindes" style={inputStyle(T)} />
            </FormField>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn color={A.sky} onClick={addChild}>Hinzufügen</Btn>
              <Btn outline color={A.rose} onClick={() => setShowForm(false)}>Abbrechen</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ChildDetail({ data, setData, childId, setView, T }) {
  const child = data.children.find(c => c.id === childId);
  const todayStr = new Date().toDateString();
  const doneToday = data.completions.filter(c => c.childId === childId && new Date(c.date).toDateString() === todayStr).map(c => c.taskId);

  const redeemReward = (reward) => {
    if (child.stars < reward.cost) return;
    const updChildren = data.children.map(c => c.id === childId ? { ...c, stars: c.stars - reward.cost } : c);
    const u = { ...data, children: updChildren }; setData(u); saveData(u);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setView("overview")} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: T.textSub }}>←</button>
        <span style={{ fontSize: 36 }}>{child.avatar}</span>
        <h2 style={{ margin: 0, color: T.text }}>{child.name}</h2>
        <div style={{ marginLeft: "auto" }}><Badge color={A.sun}>⭐ {child.stars}</Badge></div>
      </div>
      <h3 style={{ color: T.text }}>Heutige Erledigungen</h3>
      <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
        {data.tasks.filter(isTaskDueToday).map(task => {
          const done = doneToday.includes(task.id);
          return (
            <div key={task.id} style={{ background: T.card, borderRadius: 16, display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", opacity: done ? 0.6 : 1, borderLeft: `4px solid ${done ? A.mint : T.border}`, border: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 26 }}>{task.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: T.text }}>{task.title}</div>
                <Badge color={A.sun}>+{task.stars}⭐</Badge>
              </div>
              {done && <span style={{ color: A.mint, fontSize: 22 }}>✅</span>}
            </div>
          );
        })}
      </div>
      <h3 style={{ color: T.text }}>Belohnungen einlösen</h3>
      <div style={{ display: "grid", gap: 10 }}>
        {data.rewards.map(reward => (
          <div key={reward.id} style={{ background: T.card, borderRadius: 16, display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", border: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 26 }}>{reward.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: T.text }}>{reward.title}</div>
              <Badge color={A.sun}>⭐ {reward.cost}</Badge>
            </div>
            <Btn small color={A.lavender} disabled={child.stars < reward.cost} onClick={() => redeemReward(reward)}>Einlösen</Btn>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsView({ data, setData, T }) {
  const [showSetPin, setShowSetPin] = useState(false);
  const [showRemovePin, setShowRemovePin] = useState(false);
  const [saved, setSaved] = useState(false);

  const savePin = (newPin) => { const u = { ...data, pin: newPin }; setData(u); saveData(u); setShowSetPin(false); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const removePin = () => { const u = { ...data, pin: null }; setData(u); saveData(u); setShowRemovePin(false); };
  const toggleDark = () => { const u = { ...data, darkMode: !data.darkMode }; setData(u); saveData(u); };

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", color: T.text }}>⚙️ Einstellungen</h2>

      {/* Dark Mode */}
      <div style={{ background: T.card, borderRadius: 20, padding: "18px 24px", border: `1px solid ${T.border}`, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 28 }}>{data.darkMode ? "🌙" : "☀️"}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: T.text }}>Dark Mode</div>
              <div style={{ fontSize: 13, color: T.textSub }}>{data.darkMode ? "Dunkles Design aktiv" : "Helles Design aktiv"}</div>
            </div>
          </div>
          <button onClick={toggleDark} style={{
            width: 52, height: 30, borderRadius: 15,
            background: data.darkMode ? A.mint : T.border,
            border: "none", cursor: "pointer", position: "relative", transition: "background .2s",
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%", background: "white",
              position: "absolute", top: 3, left: data.darkMode ? 25 : 3,
              transition: "left .2s", boxShadow: "0 1px 4px #0004",
            }} />
          </button>
        </div>
      </div>

      {/* PIN */}
      <div style={{ background: T.card, borderRadius: 20, padding: "18px 24px", border: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <span style={{ fontSize: 28 }}>🔒</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: T.text }}>Eltern-PIN</div>
            <div style={{ fontSize: 13, color: T.textSub }}>{data.pin ? "PIN aktiv" : "Kein PIN gesetzt"}</div>
          </div>
        </div>
        {saved && <div style={{ background: A.mint + "22", borderRadius: 10, padding: "10px 14px", color: A.mint, fontWeight: 700, marginBottom: 14, fontSize: 14 }}>✅ PIN gespeichert!</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <Btn color={A.sky} onClick={() => setShowSetPin(true)}>{data.pin ? "PIN ändern" : "PIN festlegen"}</Btn>
          {data.pin && <Btn outline color={A.rose} onClick={() => setShowRemovePin(true)}>PIN entfernen</Btn>}
        </div>
      </div>

      {showSetPin && <PinDialog mode="set" onSuccess={savePin} onCancel={() => setShowSetPin(false)} T={T} />}
      {showRemovePin && <PinDialog pin={data.pin} mode="check" onSuccess={removePin} onCancel={() => setShowRemovePin(false)} T={T} />}
    </div>
  );
}

function NotificationBell({ data, setData, onClick, T }) {
  const unread = (data.notifications || []).filter(n => !n.read).length;
  return (
    <button onClick={onClick} style={{ position: "relative", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 12, padding: "8px 12px", cursor: "pointer", color: "white", fontSize: 20 }}>
      🔔
      {unread > 0 && (
        <span style={{ position: "absolute", top: 4, right: 4, background: A.rose, color: "white", borderRadius: "50%", width: 18, height: 18, fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}

function NotificationsView({ data, setData, T }) {
  const notes = data.notifications || [];
  const markAllRead = () => { const u = { ...data, notifications: notes.map(n => ({ ...n, read: true })) }; setData(u); saveData(u); };
  const clearAll = () => { const u = { ...data, notifications: [] }; setData(u); saveData(u); };
  const getChild = (childId) => data.children.find(c => c.id === childId);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: T.text }}>🔔 Benachrichtigungen</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {notes.some(n => !n.read) && <Btn small outline color={A.sky} onClick={markAllRead}>Alle gelesen</Btn>}
          {notes.length > 0 && <Btn small outline color={A.rose} onClick={clearAll}>Leeren</Btn>}
        </div>
      </div>
      {notes.length === 0 ? (
        <div style={{ background: T.card, borderRadius: 20, textAlign: "center", padding: 40, color: T.textMuted, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔕</div>
          <div>Noch keine Benachrichtigungen</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {notes.map(note => {
            const child = getChild(note.childId);
            return (
              <div key={note.id} style={{ background: note.read ? T.card : A.sky + "11", borderRadius: 16, padding: "14px 18px", display: "flex", gap: 12, alignItems: "flex-start", border: `1.5px solid ${note.read ? T.border : A.sky + "44"}` }}>
                <div style={{ fontSize: 28, lineHeight: 1 }}>{note.type === "task" ? "✅" : "🎁"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: note.read ? 500 : 700, fontSize: 15, color: T.text }}>{note.text}</div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4, display: "flex", gap: 8 }}>
                    {child && <span>{child.avatar} {child.name}</span>}
                    <span>{new Date(note.date).toLocaleDateString("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
                {!note.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: A.sky, marginTop: 6, flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── CHILD MODE (sidebar layout like NeatKid) ──────────────────────────────────
function ChildMode({ data, setData, childId, setSelectedChild, setView, T }) {
  const child = data.children.find(c => c.id === childId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toDateString();
  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [celebrating, setCelebrating] = useState(null);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks"); // "tasks" | "rewards"

  const isToday = selectedDay === todayStr;

  const isDone = (task, dayStr = selectedDay) => {
    if (task.recurring === "weekly") return completedThisWeek(data.completions, task.id, childId);
    return data.completions.some(c => c.childId === childId && c.taskId === task.id && new Date(c.date).toDateString() === dayStr);
  };

  const selectedDate = new Date(selectedDay);
  const dueTasks = data.tasks.filter(t => isTaskDueToday(t, selectedDate));

  const completeTask = (task) => {
    if (!isToday || isDone(task)) return;
    const completion = { id: uid(), taskId: task.id, childId, date: new Date().toISOString() };
    const updChildren = data.children.map(c => c.id === childId ? { ...c, stars: c.stars + task.stars } : c);
    let updated = { ...data, completions: [...data.completions, completion], children: updChildren };
    updated = addNotification(updated, "task", child, `${task.emoji} „${task.title}" erledigt (+${task.stars}⭐)`);
    setData(updated); saveData(updated);
    setCelebrating(task.id);
    setTimeout(() => setCelebrating(null), 1500);
  };

  const redeemReward = (reward) => {
    if (child.stars < reward.cost) return;
    const updChildren = data.children.map(c => c.id === childId ? { ...c, stars: c.stars - reward.cost } : c);
    let updated = { ...data, children: updChildren };
    updated = addNotification(updated, "reward", child, `${reward.emoji} „${reward.title}" eingelöst (-${reward.cost}⭐)`);
    setData(updated); saveData(updated);
  };

  const allDueToday = data.tasks.filter(t => isTaskDueToday(t, today));
  const doneTodayCount = allDueToday.filter(t => isDone(t, todayStr)).length;
  const progress = allDueToday.length > 0 ? (doneTodayCount / allDueToday.length) * 100 : 0;

  // Group tasks by recurring type
  const grouped = RECURRING_OPTIONS.map(opt => ({
    ...opt,
    tasks: dueTasks.filter(t => t.recurring === opt.value),
  })).filter(g => g.tasks.length > 0);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* ── Sidebar ── */}
      <div style={{ width: 220, background: T.sidebarBg, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", padding: "20px 12px", flexShrink: 0 }}>
        {/* Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, padding: "0 8px" }}>
          <div style={{ fontSize: 36 }}>{child.avatar}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>{child.name}</div>
            {data.children.length > 1 && (
              <select value={childId} onChange={e => setSelectedChild(e.target.value)}
                style={{ background: "transparent", border: "none", color: T.textSub, fontSize: 12, cursor: "pointer", padding: 0 }}>
                {data.children.map(c => <option key={c.id} value={c.id}>{c.avatar} {c.name}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: "grid", gap: 6 }}>
          {[
            { id: "tasks",   label: "Aufgaben",    icon: "✅" },
            { id: "rewards", label: "Belohnungen",  icon: "🎁" },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 14px", borderRadius: 12, border: "none", cursor: "pointer",
                background: activeTab === item.id ? A.mint + "22" : "transparent",
                color: activeTab === item.id ? A.mint : T.textSub,
                fontWeight: activeTab === item.id ? 700 : 500,
                fontSize: 14, textAlign: "left",
                borderLeft: activeTab === item.id ? `3px solid ${A.mint}` : "3px solid transparent",
              }}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Eltern-Button */}
        <button onClick={() => setShowPinDialog(true)}
          style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 14px", color: T.textSub, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          🔒 Eltern
        </button>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ background: T.sidebarBg, borderBottom: `1px solid ${T.border}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 20, color: T.text }}>
            {activeTab === "tasks" ? "Aufgaben" : "Belohnungen"}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: A.sun + "22", borderRadius: 20, padding: "6px 14px" }}>
              <span style={{ fontSize: 18 }}>⭐</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: A.sun }}>{child.stars}</span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {activeTab === "tasks" && (
            <>
              {/* Week strip */}
              <WeekStrip data={data} childId={childId} selectedDay={selectedDay} onSelectDay={setSelectedDay} T={T} />

              {/* Progress bar (only for today) */}
              {isToday && allDueToday.length > 0 && (
                <div style={{ background: T.card, borderRadius: 14, padding: "14px 18px", marginBottom: 16, border: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>Heute geschafft</span>
                    <span style={{ fontWeight: 700, color: A.mint, fontSize: 14 }}>{doneTodayCount}/{allDueToday.length}</span>
                  </div>
                  <div style={{ background: T.border, borderRadius: 10, height: 10, overflow: "hidden" }}>
                    <div style={{ background: `linear-gradient(90deg, ${A.mint}, ${A.sky})`, height: "100%", width: `${progress}%`, borderRadius: 10, transition: "width .5s" }} />
                  </div>
                  {progress === 100 && <div style={{ textAlign: "center", marginTop: 10, fontSize: 18 }}>🎉 Alle erledigt! Super gemacht!</div>}
                </div>
              )}

              {/* Tasks grouped */}
              {grouped.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: T.textMuted }}>Heute keine Aufgaben 🎉</div>
              )}
              {grouped.map(group => (
                <div key={group.value}>
                  <SectionHeader label={group.short} color={group.color} T={T} />
                  <div style={{ display: "grid", gap: 8 }}>
                    {group.tasks.map(task => {
                      const done = isDone(task);
                      const isCelebrating = celebrating === task.id;
                      const canComplete = isToday && !done;
                      return (
                        <div key={task.id} onClick={() => canComplete && completeTask(task)}
                          style={{
                            background: done ? T.taskDoneBg : T.card,
                            borderRadius: 14, padding: "14px 18px",
                            display: "flex", alignItems: "center", gap: 14,
                            cursor: canComplete ? "pointer" : "default",
                            border: `1px solid ${done ? A.mint + "44" : T.border}`,
                            transform: isCelebrating ? "scale(1.02)" : "scale(1)",
                            transition: "all .2s",
                          }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                            background: done ? A.mint : "transparent",
                            border: done ? "none" : `2px solid ${T.border}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {done && <span style={{ color: "white", fontSize: 14, fontWeight: 900 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 24, flexShrink: 0 }}>{task.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 15, color: done ? T.textSub : T.text, textDecoration: done ? "line-through" : "none" }}>
                              {task.title}
                            </div>
                          </div>
                          {!done && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                              <span style={{ fontWeight: 700, color: T.text }}>{task.stars}</span>
                              <span style={{ fontSize: 16 }}>⭐</span>
                            </div>
                          )}
                          {isCelebrating && <span style={{ fontSize: 24 }}>🎊</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          {activeTab === "rewards" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <p style={{ margin: 0, color: T.textSub, fontSize: 14 }}>⭐ {child.stars} Sterne verfügbar</p>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {data.rewards.map(reward => {
                  const canAfford = child.stars >= reward.cost;
                  return (
                    <div key={reward.id} style={{
                      background: T.card, borderRadius: 16, padding: "16px 18px",
                      display: "flex", alignItems: "center", gap: 14,
                      border: `1px solid ${canAfford ? A.lavender + "55" : T.border}`,
                      opacity: canAfford ? 1 : 0.55,
                    }}>
                      <span style={{ fontSize: 28 }}>{reward.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: T.text }}>{reward.title}</div>
                        <span style={{ fontSize: 13, color: A.sun, fontWeight: 700 }}>⭐ {reward.cost}</span>
                      </div>
                      <Btn small color={A.lavender} disabled={!canAfford} onClick={() => redeemReward(reward)}>
                        {canAfford ? "Einlösen" : "Noch nicht"}
                      </Btn>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {showPinDialog && (
        data.pin
          ? <PinDialog pin={data.pin} onSuccess={() => { setShowPinDialog(false); setView("overview"); }} onCancel={() => setShowPinDialog(false)} T={T} />
          : <AutoRedirect onRedirect={() => { setShowPinDialog(false); setView("overview"); }} />
      )}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(() => loadData());
  const [view, setView] = useState("start");
  const [selectedChild, setSelectedChild] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const T = theme(data.darkMode ?? true);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const openNotifications = () => {
    setShowNotifications(true);
    const u = { ...data, notifications: (data.notifications || []).map(n => ({ ...n, read: true })) };
    setData(u); saveData(u);
  };

  const NAV = [
    { id: "overview", label: "🏠 Start" },
    { id: "tasks",    label: "📋 Aufgaben" },
    { id: "rewards",  label: "🎁 Shop" },
    { id: "children", label: "👤 Kinder" },
    { id: "settings", label: "⚙️" },
  ];

  // Start screen
  if (view === "start") {
    return <StartScreen data={data} setView={setView} setSelectedChild={setSelectedChild} T={T} />;
  }

  // Child mode — full-screen with sidebar
  if (view === "childMode" && selectedChild) {
    return (
      <ChildMode
        data={data} setData={setData}
        childId={selectedChild} setSelectedChild={setSelectedChild}
        setView={setView} T={T}
      />
    );
  }

  // Parent mode
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 760, margin: "0 auto", minHeight: "100vh", background: T.bg }}>
      {/* Header */}
      <div style={{ background: T.headerBg, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22 }}>🏡</span>
        <span style={{ color: "white", fontWeight: 800, fontSize: 17 }}>Haushalts-Helden</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setView("start")} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, padding: "6px 12px", color: "white", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>← Start</button>
          {data.pin && <span style={{ color: A.mint, fontSize: 12 }}>🔒</span>}
          <NotificationBell data={data} setData={setData} onClick={openNotifications} T={T} />
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ background: T.navBg, display: "flex", borderBottom: `2px solid ${T.border}` }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setView(n.id)}
            style={{
              flex: 1, background: "none", border: "none",
              borderBottom: view === n.id ? `3px solid ${A.sky}` : "3px solid transparent",
              padding: "13px 4px", fontSize: 12, fontWeight: view === n.id ? 700 : 500,
              color: view === n.id ? A.sky : T.textSub, cursor: "pointer", transition: "all .2s",
            }}>
            {n.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 24 }}>
        {view === "overview"    && <ParentOverview data={data} setData={setData} setView={setView} setSelectedChild={setSelectedChild} T={T} />}
        {view === "tasks"       && <TasksView data={data} setData={setData} T={T} />}
        {view === "rewards"     && <RewardsView data={data} setData={setData} T={T} />}
        {view === "children"    && <ChildrenView data={data} setData={setData} T={T} />}
        {view === "settings"    && <SettingsView data={data} setData={setData} T={T} />}
        {view === "childDetail" && selectedChild && <ChildDetail data={data} setData={setData} childId={selectedChild} setView={setView} T={T} />}
      </div>

      {/* Notification panel */}
      {showNotifications && (
        <div style={{ position: "fixed", inset: 0, zIndex: 150, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={() => setShowNotifications(false)} style={{ flex: 1, background: "#0005" }} />
          <div style={{ width: "min(400px, 100vw)", background: T.bg, height: "100vh", overflowY: "auto", padding: 20, boxShadow: "-4px 0 30px #0004", animation: "slideIn .2s ease" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
              <button onClick={() => setShowNotifications(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: T.textSub }}>✕</button>
            </div>
            <NotificationsView data={data} setData={setData} T={T} />
          </div>
        </div>
      )}

      <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
    </div>
  );
}
