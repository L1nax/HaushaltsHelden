import { useState, useEffect, useCallback } from "react";

function useIsTablet() {
  const [isTablet, setIsTablet] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const handler = () => setIsTablet(window.innerWidth >= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isTablet;
}

const COLORS = {
  sun: "#FFD93D", mint: "#6BCB77", sky: "#4D96FF",
  rose: "#FF6B6B", lavender: "#C77DFF", cream: "#FFF8ED",
  dark: "#1A1A2E", card: "#FFFFFF",
};

const EMOJIS = ["🧹","🍽️","🛏️","🐕","🌿","🧺","🗑️","🚿","📚","🧴","🪣","🧽","🏠","🪟","🚗","🐈","🌻","🧸"];
const REWARD_EMOJIS = ["🎮","🍕","🎬","🛍️","🍦","🎁","🎨","🏖️","🍫","🎡","🃏","🧩"];

const RECURRING_OPTIONS = [
  { value: "daily",    label: "Täglich",    badge: "Täglich",    color: COLORS.sky },
  { value: "weekdays", label: "Mo–Fr",      badge: "Mo–Fr",      color: COLORS.mint },
  { value: "weekend",  label: "Wochenende", badge: "Wochenende", color: COLORS.lavender },
  { value: "weekly",   label: "Wöchentlich",badge: "Wöchentlich",color: "#FF9F43" },
  { value: "once",     label: "Einmalig",   badge: "Einmalig",   color: COLORS.rose },
];

const recurringLabel = (val) => RECURRING_OPTIONS.find(o => o.value === val) || RECURRING_OPTIONS[0];

const uid = () => Math.random().toString(36).slice(2, 9);

function isTaskDueToday(task) {
  const now = new Date();
  const dow = now.getDay();
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
    { id: uid(), emoji: "🧹", title: "Zimmer aufräumen", stars: 2, recurring: "daily" },
    { id: uid(), emoji: "🍽️", title: "Tisch decken", stars: 1, recurring: "weekdays" },
    { id: uid(), emoji: "🐕", title: "Hund füttern", stars: 2, recurring: "daily" },
    { id: uid(), emoji: "🧺", title: "Wäsche zusammenlegen", stars: 3, recurring: "weekly" },
  ],
  completions: [],
  starLog: [],
  notifications: [],
  rewards: [
    { id: uid(), emoji: "🎮", title: "1 Stunde extra Spielzeit", cost: 20 },
    { id: uid(), emoji: "🍕", title: "Pizza-Abend wählen", cost: 30 },
    { id: uid(), emoji: "🎬", title: "Film aussuchen", cost: 15 },
  ],
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
    new Notification("🏡 Haushalts-Helden", {
      body: `${child.avatar} ${child.name}: ${text}`,
      icon: "https://cdn.jsdelivr.net/npm/twemoji@14/assets/72x72/1f3e1.png",
    });
  }
  return { ...data, notifications: [note, ...(data.notifications || [])] };
}

async function requestPushPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return await Notification.requestPermission();
}

function Badge({ color, children }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}44`,
      borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700,
    }}>{children}</span>
  );
}

function Btn({ onClick, color = COLORS.sky, children, small, outline, disabled }) {
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
    }}
      onMouseDown={e => !disabled && (e.currentTarget.style.transform = "scale(.96)")}
      onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
    >{children}</button>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: COLORS.card, borderRadius: 20,
      padding: "20px 24px", boxShadow: "0 4px 24px #0001", ...style,
    }}>{children}</div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#0006", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <Card style={{ width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </Card>
    </div>
  );
}

function EmojiPicker({ value, onChange, list, accentColor }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {list.map(e => (
        <button key={e} onClick={() => onChange(e)}
          style={{
            fontSize: 24,
            background: value === e ? accentColor + "33" : "#f5f5f5",
            border: `2px solid ${value === e ? accentColor : "transparent"}`,
            borderRadius: 10, padding: "6px 10px", cursor: "pointer",
          }}>
          {e}
        </button>
      ))}
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "2px solid #eee", fontSize: 15, boxSizing: "border-box" };

function TaskForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const save = () => { if (!form.title.trim()) return; onSave({ ...form, stars: Number(form.stars) }); };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <FormField label="Emoji auswählen">
        <EmojiPicker value={form.emoji} onChange={e => setForm({ ...form, emoji: e })} list={EMOJIS} accentColor={COLORS.sky} />
      </FormField>
      <FormField label="Aufgabe">
        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
          placeholder="z.B. Zimmer aufräumen" style={inputStyle} />
      </FormField>
      <FormField label="⭐ Sterne">
        <input type="number" min={1} max={10} value={form.stars}
          onChange={e => setForm({ ...form, stars: e.target.value })} style={inputStyle} />
      </FormField>
      <FormField label="🔁 Wiederholung">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {RECURRING_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setForm({ ...form, recurring: opt.value })}
              style={{
                padding: "10px 12px", borderRadius: 12, cursor: "pointer", fontWeight: 700,
                fontSize: 13, textAlign: "center",
                background: form.recurring === opt.value ? opt.color + "22" : "#f5f5f5",
                border: `2px solid ${form.recurring === opt.value ? opt.color : "transparent"}`,
                color: form.recurring === opt.value ? opt.color : "#555",
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </FormField>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn color={COLORS.mint} onClick={save}>Speichern</Btn>
        <Btn outline color={COLORS.rose} onClick={onCancel}>Abbrechen</Btn>
      </div>
    </div>
  );
}

function RewardForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const save = () => { if (!form.title.trim()) return; onSave({ ...form, cost: Number(form.cost) }); };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <FormField label="Emoji">
        <EmojiPicker value={form.emoji} onChange={e => setForm({ ...form, emoji: e })} list={REWARD_EMOJIS} accentColor={COLORS.lavender} />
      </FormField>
      <FormField label="Belohnung">
        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
          placeholder="z.B. 1 Stunde extra Spielzeit" style={inputStyle} />
      </FormField>
      <FormField label="⭐ Sterne-Kosten">
        <input type="number" min={1} value={form.cost}
          onChange={e => setForm({ ...form, cost: e.target.value })} style={inputStyle} />
      </FormField>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn color={COLORS.lavender} onClick={save}>Speichern</Btn>
        <Btn outline color={COLORS.rose} onClick={onCancel}>Abbrechen</Btn>
      </div>
    </div>
  );
}

function EditDeleteBtns({ onEdit, onDelete }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={onEdit}
        style={{ background: COLORS.sky + "18", border: `1.5px solid ${COLORS.sky}44`, borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 15, color: COLORS.sky, fontWeight: 700 }}>
        ✏️
      </button>
      <button onClick={onDelete}
        style={{ background: "#0001", border: "1.5px solid #ddd", borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 15 }}>
        🗑️
      </button>
    </div>
  );
}

function StarAdjustModal({ child, data, setData, onClose }) {
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
    <Modal title={`⭐ Sterne anpassen – ${child.avatar} ${child.name}`} onClose={onClose}>
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ background: COLORS.sun + "22", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 32 }}>⭐</span>
          <div>
            <div style={{ fontSize: 13, color: "#888" }}>Aktuelles Guthaben</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: COLORS.dark }}>{child.stars} Sterne</div>
          </div>
        </div>

        <FormField label="Aktion">
          <div style={{ display: "flex", gap: 10 }}>
            {["+", "−"].map(s => (
              <button key={s} onClick={() => setSign(s === "−" ? "-" : "+")}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12, fontSize: 22, fontWeight: 900, cursor: "pointer",
                  background: sign === (s === "−" ? "-" : "+") ? (s === "+" ? COLORS.mint + "33" : COLORS.rose + "33") : "#f5f5f5",
                  border: `2px solid ${sign === (s === "−" ? "-" : "+") ? (s === "+" ? COLORS.mint : COLORS.rose) : "transparent"}`,
                  color: s === "+" ? COLORS.mint : COLORS.rose,
                }}>
                {s}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="Anzahl Sterne">
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            {[1, 2, 3, 5, 10].map(n => (
              <button key={n} onClick={() => setDelta(n)}
                style={{
                  padding: "8px 14px", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer",
                  background: delta === n ? COLORS.sky + "33" : "#f5f5f5",
                  border: `2px solid ${delta === n ? COLORS.sky : "transparent"}`,
                  color: delta === n ? COLORS.sky : "#555",
                }}>
                {n}
              </button>
            ))}
          </div>
          <input type="number" min={1} max={999} value={delta}
            onChange={e => setDelta(Math.max(1, Number(e.target.value)))}
            style={inputStyle} />
        </FormField>

        <div style={{ background: "#f8f8f8", borderRadius: 12, padding: "10px 16px", fontSize: 14, color: "#555", display: "flex", justifyContent: "space-between" }}>
          <span>Ergebnis:</span>
          <strong style={{ color: COLORS.dark }}>{Math.max(0, child.stars + (sign === "+" ? delta : -delta))} Sterne</strong>
        </div>

        <FormField label="Kommentar (optional)">
          <input value={comment} onChange={e => setComment(e.target.value)}
            placeholder="z.B. Super beim Aufräumen geholfen!"
            style={inputStyle} />
        </FormField>

        <div style={{ display: "flex", gap: 10 }}>
          <Btn color={sign === "+" ? COLORS.mint : COLORS.rose} onClick={apply}>
            {sign === "+" ? "⭐ Hinzufügen" : "⭐ Abziehen"}
          </Btn>
          <Btn outline color="#aaa" onClick={onClose}>Abbrechen</Btn>
        </div>

        {childLog.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#888", marginBottom: 8 }}>Letzte Änderungen</div>
            <div style={{ display: "grid", gap: 6 }}>
              {childLog.map(entry => (
                <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8f8f8", borderRadius: 10, padding: "8px 12px" }}>
                  <span style={{ fontWeight: 800, fontSize: 15, color: entry.delta >= 0 ? COLORS.mint : COLORS.rose, minWidth: 40 }}>
                    {entry.delta >= 0 ? "+" : ""}{entry.delta}⭐
                  </span>
                  <div style={{ flex: 1 }}>
                    {entry.comment && <div style={{ fontSize: 13 }}>{entry.comment}</div>}
                    <div style={{ fontSize: 11, color: "#aaa" }}>
                      {new Date(entry.date).toLocaleDateString("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ParentOverview({ data, setData, setView, setSelectedChild }) {
  const todayStr = new Date().toDateString();
  const dueTodayTasks = data.tasks.filter(isTaskDueToday);
  const [adjustChild, setAdjustChild] = useState(null);

  const tasksDoneToday = (childId) =>
    data.completions.filter(c => c.childId === childId && new Date(c.date).toDateString() === todayStr).length;
  const tasksPending = (childId) => {
    const done = data.completions.filter(c => c.childId === childId && new Date(c.date).toDateString() === todayStr).map(c => c.taskId);
    return dueTodayTasks.filter(t => !done.includes(t.id)).length;
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 6, color: COLORS.dark }}>👨‍👩‍👧‍👦 Kinder-Übersicht</h2>
      <p style={{ color: "#888", marginBottom: 20, marginTop: 0 }}>
        {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
      </p>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        {data.children.map(child => (
          <Card key={child.id} style={{ borderTop: `4px solid ${COLORS.mint}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 42 }}>{child.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 20 }}>{child.name}</div>
                <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge color={COLORS.sun}>⭐ {child.stars} Sterne</Badge>
                  <button onClick={() => setAdjustChild(child)}
                    title="Sterne anpassen"
                    style={{ background: COLORS.sun + "33", border: `1.5px solid ${COLORS.sun}88`, borderRadius: 8, padding: "2px 8px", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#b8860b" }}>
                    ±
                  </button>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#666" }}>✅ {tasksDoneToday(child.id)} erledigt</div>
              <div style={{ fontSize: 13, color: "#666" }}>⏳ {tasksPending(child.id)} offen</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn small color={COLORS.sky} onClick={() => { setSelectedChild(child.id); setView("childMode"); }}>Kindansicht</Btn>
              <Btn small outline color={COLORS.lavender} onClick={() => { setSelectedChild(child.id); setView("childDetail"); }}>Details</Btn>
            </div>
          </Card>
        ))}
      </div>

      {adjustChild && (
        <StarAdjustModal child={adjustChild} data={data} setData={setData} onClose={() => setAdjustChild(null)} />
      )}

      <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Btn color={COLORS.mint} onClick={() => setView("tasks")}>📋 Aufgaben verwalten</Btn>
        <Btn color={COLORS.lavender} onClick={() => setView("rewards")}>🎁 Belohnungen</Btn>
        <Btn color={COLORS.rose} outline onClick={() => setView("children")}>👤 Kinder verwalten</Btn>
      </div>
    </div>
  );
}

function TasksView({ data, setData }) {
  const BLANK = { emoji: "🧹", title: "", stars: 1, recurring: "daily" };
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState(null);

  const addTask = (form) => {
    const updated = { ...data, tasks: [...data.tasks, { ...form, id: uid() }] };
    setData(updated); saveData(updated); setShowAdd(false);
  };
  const saveEdit = (form) => {
    const updated = { ...data, tasks: data.tasks.map(t => t.id === editTask.id ? { ...form, id: t.id } : t) };
    setData(updated); saveData(updated); setEditTask(null);
  };
  const deleteTask = (id) => {
    const updated = { ...data, tasks: data.tasks.filter(t => t.id !== id) };
    setData(updated); saveData(updated);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>📋 Aufgaben</h2>
        <Btn color={COLORS.mint} onClick={() => setShowAdd(true)}>+ Neue Aufgabe</Btn>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {data.tasks.map(task => {
          const rec = recurringLabel(task.recurring);
          return (
            <Card key={task.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px" }}>
              <span style={{ fontSize: 32 }}>{task.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{task.title}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  <Badge color={COLORS.sun}>⭐ {task.stars}</Badge>
                  <Badge color={rec.color}>{rec.badge}</Badge>
                </div>
              </div>
              <EditDeleteBtns onEdit={() => setEditTask(task)} onDelete={() => deleteTask(task.id)} />
            </Card>
          );
        })}
      </div>

      {showAdd && (
        <Modal title="Neue Aufgabe" onClose={() => setShowAdd(false)}>
          <TaskForm initial={BLANK} onSave={addTask} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
      {editTask && (
        <Modal title="Aufgabe bearbeiten" onClose={() => setEditTask(null)}>
          <TaskForm
            initial={{ emoji: editTask.emoji, title: editTask.title, stars: editTask.stars, recurring: editTask.recurring }}
            onSave={saveEdit} onCancel={() => setEditTask(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function RewardsView({ data, setData }) {
  const BLANK = { emoji: "🎮", title: "", cost: 20 };
  const [showAdd, setShowAdd] = useState(false);
  const [editReward, setEditReward] = useState(null);

  const addReward = (form) => {
    const updated = { ...data, rewards: [...data.rewards, { ...form, id: uid() }] };
    setData(updated); saveData(updated); setShowAdd(false);
  };
  const saveEdit = (form) => {
    const updated = { ...data, rewards: data.rewards.map(r => r.id === editReward.id ? { ...form, id: r.id } : r) };
    setData(updated); saveData(updated); setEditReward(null);
  };
  const deleteReward = (id) => {
    const updated = { ...data, rewards: data.rewards.filter(r => r.id !== id) };
    setData(updated); saveData(updated);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>🎁 Belohnungen</h2>
        <Btn color={COLORS.lavender} onClick={() => setShowAdd(true)}>+ Neue Belohnung</Btn>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {data.rewards.map(r => (
          <Card key={r.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px" }}>
            <span style={{ fontSize: 32 }}>{r.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{r.title}</div>
              <Badge color={COLORS.sun}>⭐ {r.cost} Sterne</Badge>
            </div>
            <EditDeleteBtns onEdit={() => setEditReward(r)} onDelete={() => deleteReward(r.id)} />
          </Card>
        ))}
      </div>

      {showAdd && (
        <Modal title="Neue Belohnung" onClose={() => setShowAdd(false)}>
          <RewardForm initial={BLANK} onSave={addReward} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
      {editReward && (
        <Modal title="Belohnung bearbeiten" onClose={() => setEditReward(null)}>
          <RewardForm
            initial={{ emoji: editReward.emoji, title: editReward.title, cost: editReward.cost }}
            onSave={saveEdit} onCancel={() => setEditReward(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function ChildrenView({ data, setData }) {
  const AVATARS = ["🦊","🐻","🐼","🦁","🐯","🦄","🐸","🐨","🐙","🦋"];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", avatar: "🦊" });
  const [adjustChild, setAdjustChild] = useState(null);

  const addChild = () => {
    if (!form.name.trim()) return;
    const updated = { ...data, children: [...data.children, { ...form, id: uid(), stars: 0 }] };
    setData(updated); saveData(updated); setShowForm(false);
    setForm({ name: "", avatar: "🦊" });
  };
  const removeChild = (id) => {
    const updated = { ...data, children: data.children.filter(c => c.id !== id) };
    setData(updated); saveData(updated);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>👤 Kinder</h2>
        <Btn color={COLORS.sky} onClick={() => setShowForm(true)}>+ Kind hinzufügen</Btn>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {data.children.map(child => (
          <Card key={child.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px" }}>
            <span style={{ fontSize: 36 }}>{child.avatar}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{child.name}</div>
              <div style={{ marginTop: 4 }}><Badge color={COLORS.sun}>⭐ {child.stars} Sterne</Badge></div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setAdjustChild(child)}
                style={{ background: COLORS.sun + "33", border: `1.5px solid ${COLORS.sun}88`, borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 15, fontWeight: 700, color: "#b8860b" }}>
                ⭐±
              </button>
              <button onClick={() => removeChild(child.id)}
                style={{ background: "#0001", border: "1.5px solid #ddd", borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 15 }}>🗑️</button>
            </div>
          </Card>
        ))}
      </div>

      {adjustChild && (
        <StarAdjustModal child={adjustChild} data={data} setData={setData} onClose={() => setAdjustChild(null)} />
      )}

      {showForm && (
        <Modal title="Kind hinzufügen" onClose={() => setShowForm(false)}>
          <div style={{ display: "grid", gap: 14 }}>
            <FormField label="Avatar">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {AVATARS.map(a => (
                  <button key={a} onClick={() => setForm({ ...form, avatar: a })}
                    style={{ fontSize: 28, background: form.avatar === a ? COLORS.sky + "33" : "#f5f5f5", border: `2px solid ${form.avatar === a ? COLORS.sky : "transparent"}`, borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}>
                    {a}
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label="Name">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Name des Kindes" style={inputStyle} />
            </FormField>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn color={COLORS.sky} onClick={addChild}>Hinzufügen</Btn>
              <Btn outline color={COLORS.rose} onClick={() => setShowForm(false)}>Abbrechen</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ChildDetail({ data, setData, childId, setView }) {
  const child = data.children.find(c => c.id === childId);
  const todayStr = new Date().toDateString();
  const doneToday = data.completions
    .filter(c => c.childId === childId && new Date(c.date).toDateString() === todayStr)
    .map(c => c.taskId);

  const redeemReward = (reward) => {
    if (child.stars < reward.cost) return;
    const updChildren = data.children.map(c => c.id === childId ? { ...c, stars: c.stars - reward.cost } : c);
    const updated = { ...data, children: updChildren };
    setData(updated); saveData(updated);
  };

  const dueTasks = data.tasks.filter(isTaskDueToday);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setView("overview")} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>←</button>
        <span style={{ fontSize: 36 }}>{child.avatar}</span>
        <h2 style={{ margin: 0 }}>{child.name}</h2>
        <div style={{ marginLeft: "auto" }}><Badge color={COLORS.sun}>⭐ {child.stars}</Badge></div>
      </div>
      <h3>Heutige Erledigungen</h3>
      <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
        {dueTasks.map(task => {
          const done = doneToday.includes(task.id);
          return (
            <Card key={task.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", opacity: done ? 0.6 : 1, borderLeft: `4px solid ${done ? COLORS.mint : "#eee"}` }}>
              <span style={{ fontSize: 26 }}>{task.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{task.title}</div>
                <Badge color={COLORS.sun}>+{task.stars}⭐</Badge>
              </div>
              {done && <span style={{ color: COLORS.mint, fontSize: 22 }}>✅</span>}
            </Card>
          );
        })}
      </div>
      <h3>Belohnungen einlösen</h3>
      <div style={{ display: "grid", gap: 10 }}>
        {data.rewards.map(reward => (
          <Card key={reward.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px" }}>
            <span style={{ fontSize: 26 }}>{reward.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{reward.title}</div>
              <Badge color={COLORS.sun}>⭐ {reward.cost} Sterne</Badge>
            </div>
            <Btn small color={COLORS.lavender} disabled={child.stars < reward.cost} onClick={() => redeemReward(reward)}>
              Einlösen
            </Btn>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PinDialog({ pin, onSuccess, onCancel, mode = "check" }) {
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
        const next = input + d;
        setInput(next);
        if (next.length === 4) setStep(2);
      } else {
        const next = confirm + d;
        setConfirm(next);
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
  const label = mode === "check" ? "Eltern-PIN eingeben"
    : step === 1 ? "Neuen PIN wählen (4 Ziffern)"
    : "PIN bestätigen";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000a", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{ background: "white", borderRadius: 24, padding: "32px 28px", width: "100%", maxWidth: 320, textAlign: "center", boxShadow: "0 20px 60px #0004" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6, color: COLORS.dark }}>{label}</div>
        {error && <div style={{ color: COLORS.rose, fontSize: 14, marginBottom: 8, fontWeight: 700 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "center", gap: 12, margin: "20px 0" }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: 16, height: 16, borderRadius: "50%",
              background: i < current.length ? COLORS.dark : "#e0e0e0",
              transition: "background .15s",
            }} />
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[1,2,3,4,5,6,7,8,9].map(d => (
            <button key={d} onClick={() => handleDigit(String(d))}
              style={{ padding: "16px", borderRadius: 14, border: "none", background: "#f5f5f5", fontSize: 20, fontWeight: 700, cursor: "pointer", color: COLORS.dark, transition: "background .1s" }}
              onMouseDown={e => e.currentTarget.style.background = "#e0e0e0"}
              onMouseUp={e => e.currentTarget.style.background = "#f5f5f5"}>
              {d}
            </button>
          ))}
          <div />
          <button onClick={() => handleDigit("0")}
            style={{ padding: "16px", borderRadius: 14, border: "none", background: "#f5f5f5", fontSize: 20, fontWeight: 700, cursor: "pointer", color: COLORS.dark }}>
            0
          </button>
          <button onClick={handleDel}
            style={{ padding: "16px", borderRadius: 14, border: "none", background: "#f5f5f5", fontSize: 20, cursor: "pointer", color: "#888" }}>
            ⌫
          </button>
        </div>

        {onCancel && (
          <button onClick={onCancel}
            style={{ background: "none", border: "none", color: "#aaa", fontSize: 14, cursor: "pointer", marginTop: 4 }}>
            Abbrechen
          </button>
        )}
      </div>
    </div>
  );
}

function AutoRedirect({ onRedirect }) {
  useEffect(() => { onRedirect(); }, []);
  return null;
}

function ChildMode({ data, setData, childId, setSelectedChild, setView }) {
  const child = data.children.find(c => c.id === childId);
  const todayStr = new Date().toDateString();
  const doneToday = data.completions
    .filter(c => c.childId === childId && new Date(c.date).toDateString() === todayStr)
    .map(c => c.taskId);
  const [celebrating, setCelebrating] = useState(null);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const isTablet = useIsTablet();

  const dueTasks = data.tasks.filter(task => {
    if (!isTaskDueToday(task)) return false;
    if (task.recurring === "weekly") return !completedThisWeek(data.completions, task.id, childId);
    return true;
  });

  const isDone = (task) => {
    if (task.recurring === "weekly") return completedThisWeek(data.completions, task.id, childId);
    return doneToday.includes(task.id);
  };

  const completeTask = (task) => {
    if (isDone(task)) return;
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

  const allDueToday = data.tasks.filter(isTaskDueToday);
  const doneTasks = allDueToday.filter(isDone).length;
  const totalTasks = allDueToday.length;
  const progress = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;

  // ── shared sub-sections ──────────────────────────────────────────────────
  const taskList = (
    <>
      <h3 style={{ margin: "0 0 12px", fontSize: 17 }}>📋 Meine Aufgaben heute</h3>
      <div style={{ display: "grid", gap: 12, marginBottom: isTablet ? 0 : 24 }}>
        {allDueToday.map(task => {
          const done = isDone(task);
          const isCelebrating = celebrating === task.id;
          const rec = recurringLabel(task.recurring);
          return (
            <div key={task.id} onClick={() => !done && completeTask(task)}
              style={{
                background: done ? COLORS.mint + "22" : "white",
                borderRadius: 18, padding: "16px 20px",
                display: "flex", alignItems: "center", gap: 14,
                cursor: done ? "default" : "pointer",
                border: `2px solid ${done ? COLORS.mint : "#eee"}`,
                boxShadow: done ? "none" : "0 4px 16px #0001",
                transform: isCelebrating ? "scale(1.04)" : "scale(1)",
                transition: "all .3s",
              }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: done ? COLORS.mint : COLORS.sky + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
                {done ? "✅" : task.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, textDecoration: done ? "line-through" : "none", color: done ? "#888" : COLORS.dark }}>
                  {task.title}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 3, alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#666" }}>+{task.stars}⭐</span>
                  <Badge color={rec.color}>{rec.badge}</Badge>
                </div>
              </div>
              {!done && <span style={{ fontSize: 22, color: "#ddd" }}>→</span>}
              {isCelebrating && <span style={{ fontSize: 28 }}>🎊</span>}
            </div>
          );
        })}
        {allDueToday.length === 0 && (
          <div style={{ textAlign: "center", padding: 32, color: "#aaa" }}>Heute keine Aufgaben 🎉</div>
        )}
      </div>
    </>
  );

  const shopList = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 17 }}>🛒 Belohnungs-Shop</h3>
        <span style={{ fontSize: 13, color: "#888" }}>⭐ {child.stars} verfügbar</span>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {data.rewards.map(reward => {
          const canAfford = child.stars >= reward.cost;
          return (
            <div key={reward.id}
              style={{
                background: "white", borderRadius: 16, padding: "14px 18px",
                display: "flex", alignItems: "center", gap: 14,
                border: `2px solid ${canAfford ? COLORS.lavender + "55" : "#eee"}`,
                opacity: canAfford ? 1 : 0.6,
              }}>
              <span style={{ fontSize: 28 }}>{reward.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{reward.title}</div>
                <span style={{ fontSize: 13, color: COLORS.sun, fontWeight: 700 }}>⭐ {reward.cost}</span>
              </div>
              <Btn small color={COLORS.lavender} disabled={!canAfford} onClick={() => redeemReward(reward)}>
                {canAfford ? "Holen!" : "Noch nicht"}
              </Btn>
            </div>
          );
        })}
      </div>
    </>
  );

  const header = (
    <div style={{ background: `linear-gradient(135deg, ${COLORS.sky}, ${COLORS.mint})`, padding: "24px 20px 30px", borderRadius: isTablet ? "0 0 30px 30px" : "0 0 30px 30px" }}>
      <div style={{ maxWidth: isTablet ? 1100 : undefined, margin: isTablet ? "0 auto" : undefined }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: "white", opacity: 0.85, fontSize: 14, marginBottom: 4 }}>Hallo!</div>
            <div style={{ color: "white", fontSize: isTablet ? 32 : 28, fontWeight: 900 }}>{child.avatar} {child.name}</div>
          </div>
          <button onClick={() => setShowPinDialog(true)}
            style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 12, padding: "8px 14px", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Eltern 🔒
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
          {data.children.length > 1 && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {data.children.map(c => {
                const isActive = c.id === childId;
                return (
                  <button key={c.id} onClick={() => !isActive && setSelectedChild(c.id)}
                    style={{
                      background: isActive ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)",
                      border: `2px solid ${isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)"}`,
                      borderRadius: 14, padding: "6px 14px",
                      display: "flex", alignItems: "center", gap: 7,
                      cursor: isActive ? "default" : "pointer", transition: "all .2s",
                    }}>
                    <span style={{ fontSize: 20 }}>{c.avatar}</span>
                    <span style={{ color: "white", fontWeight: isActive ? 800 : 600, fontSize: 14 }}>{c.name}</span>
                    {isActive && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
          <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: 16, padding: "12px 20px", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28 }}>⭐</span>
            <div>
              <div style={{ color: "white", fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{child.stars}</div>
              <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>Sterne gesammelt</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const progressCard = (
    <Card style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontWeight: 700 }}>Heute geschafft</span>
        <span style={{ fontWeight: 700, color: COLORS.mint }}>{doneTasks}/{totalTasks}</span>
      </div>
      <div style={{ background: "#f0f0f0", borderRadius: 10, height: 14, overflow: "hidden" }}>
        <div style={{ background: `linear-gradient(90deg, ${COLORS.mint}, ${COLORS.sky})`, height: "100%", width: `${progress}%`, borderRadius: 10, transition: "width .5s" }} />
      </div>
      {progress === 100 && totalTasks > 0 && (
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 22 }}>🎉 Alle Aufgaben erledigt! Super gemacht!</div>
      )}
    </Card>
  );

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${COLORS.sky}22, ${COLORS.mint}22)` }}>
      {header}

      {showPinDialog && (
        data.pin
          ? <PinDialog pin={data.pin} onSuccess={() => { setShowPinDialog(false); setView("overview"); }} onCancel={() => setShowPinDialog(false)} />
          : <AutoRedirect onRedirect={() => { setShowPinDialog(false); setView("overview"); }} />
      )}

      {isTablet ? (
        // ── Tablet: 2-column layout ──────────────────────────────────────────
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 28, alignItems: "start" }}>
          <div>
            {progressCard}
            {taskList}
          </div>
          <div style={{ position: "sticky", top: 24 }}>
            {shopList}
          </div>
        </div>
      ) : (
        // ── Mobile: single column ─────────────────────────────────────────────
        <div style={{ padding: "20px 16px" }}>
          {progressCard}
          {taskList}
          {shopList}
        </div>
      )}
    </div>
  );
}

function SettingsView({ data, setData }) {
  const [showSetPin, setShowSetPin] = useState(false);
  const [showRemovePin, setShowRemovePin] = useState(false);
  const [saved, setSaved] = useState(false);

  const savePin = (newPin) => {
    const updated = { ...data, pin: newPin };
    setData(updated); saveData(updated);
    setShowSetPin(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const removePin = () => {
    const updated = { ...data, pin: null };
    setData(updated); saveData(updated);
    setShowRemovePin(false);
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 20px" }}>⚙️ Einstellungen</h2>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 36 }}>🔒</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Eltern-PIN</div>
            <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
              {data.pin ? "PIN ist aktiv — Kinder können nicht ohne PIN in den Elternbereich." : "Kein PIN gesetzt — jeder kann in den Elternbereich wechseln."}
            </div>
          </div>
        </div>

        {saved && (
          <div style={{ background: COLORS.mint + "22", borderRadius: 10, padding: "10px 14px", color: COLORS.mint, fontWeight: 700, marginBottom: 14, fontSize: 14 }}>
            ✅ PIN gespeichert!
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn color={COLORS.sky} onClick={() => setShowSetPin(true)}>
            {data.pin ? "PIN ändern" : "PIN festlegen"}
          </Btn>
          {data.pin && (
            <Btn outline color={COLORS.rose} onClick={() => setShowRemovePin(true)}>PIN entfernen</Btn>
          )}
        </div>
      </Card>

      {showSetPin && (
        <PinDialog mode="set" onSuccess={savePin} onCancel={() => setShowSetPin(false)} />
      )}
      {showRemovePin && (
        <PinDialog pin={data.pin} mode="check"
          onSuccess={removePin}
          onCancel={() => setShowRemovePin(false)} />
      )}
    </div>
  );
}

function NotificationBell({ data, setData, onClick }) {
  const unread = (data.notifications || []).filter(n => !n.read).length;
  return (
    <button onClick={onClick} style={{ position: "relative", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 12, padding: "8px 12px", cursor: "pointer", color: "white", fontSize: 20 }}>
      🔔
      {unread > 0 && (
        <span style={{
          position: "absolute", top: 4, right: 4,
          background: COLORS.rose, color: "white",
          borderRadius: "50%", width: 18, height: 18,
          fontSize: 11, fontWeight: 900,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "2px solid #1A1A2E",
        }}>{unread > 9 ? "9+" : unread}</span>
      )}
    </button>
  );
}

function NotificationsView({ data, setData }) {
  const notes = data.notifications || [];

  const markAllRead = () => {
    const updated = { ...data, notifications: notes.map(n => ({ ...n, read: true })) };
    setData(updated); saveData(updated);
  };

  const clearAll = () => {
    const updated = { ...data, notifications: [] };
    setData(updated); saveData(updated);
  };

  const getChild = (childId) => data.children.find(c => c.id === childId);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>🔔 Benachrichtigungen</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {notes.some(n => !n.read) && <Btn small outline color={COLORS.sky} onClick={markAllRead}>Alle gelesen</Btn>}
          {notes.length > 0 && <Btn small outline color={COLORS.rose} onClick={clearAll}>Leeren</Btn>}
        </div>
      </div>

      {notes.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 40, color: "#aaa" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔕</div>
          <div>Noch keine Benachrichtigungen</div>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {notes.map(note => {
            const child = getChild(note.childId);
            return (
              <div key={note.id} style={{
                background: note.read ? "white" : COLORS.sky + "0f",
                borderRadius: 16, padding: "14px 18px",
                display: "flex", gap: 12, alignItems: "flex-start",
                border: `2px solid ${note.read ? "#f0f0f0" : COLORS.sky + "44"}`,
              }}>
                <div style={{ fontSize: 28, lineHeight: 1 }}>
                  {note.type === "task" ? "✅" : "🎁"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: note.read ? 500 : 700, fontSize: 15, color: COLORS.dark }}>
                    {note.text}
                  </div>
                  <div style={{ fontSize: 12, color: "#999", marginTop: 4, display: "flex", gap: 8 }}>
                    {child && <span>{child.avatar} {child.name}</span>}
                    <span>{new Date(note.date).toLocaleDateString("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
                {!note.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.sky, marginTop: 6, flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(() => loadData());
  const [view, setView] = useState("overview");
  const [selectedChild, setSelectedChild] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const isTablet = useIsTablet();

  useEffect(() => { requestPushPermission(); }, []);

  const openNotifications = () => {
    setShowNotifications(true);
    const updated = { ...data, notifications: (data.notifications || []).map(n => ({ ...n, read: true })) };
    setData(updated); saveData(updated);
  };

  const NAV = [
    { id: "overview", label: "🏠 Start",     icon: "🏠" },
    { id: "tasks",    label: "📋 Aufgaben",  icon: "📋" },
    { id: "rewards",  label: "🎁 Shop",      icon: "🎁" },
    { id: "children", label: "👤 Kinder",    icon: "👤" },
    { id: "settings", label: "⚙️ Einst.",    icon: "⚙️" },
  ];

  if (view === "childMode" && selectedChild) return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <ChildMode data={data} setData={setData} childId={selectedChild} setSelectedChild={setSelectedChild} setView={setView} />
    </div>
  );

  const content = (
    <>
      {view === "overview"    && <ParentOverview data={data} setData={setData} setView={setView} setSelectedChild={setSelectedChild} />}
      {view === "tasks"       && <TasksView data={data} setData={setData} />}
      {view === "rewards"     && <RewardsView data={data} setData={setData} />}
      {view === "children"    && <ChildrenView data={data} setData={setData} />}
      {view === "settings"    && <SettingsView data={data} setData={setData} />}
      {view === "childDetail" && selectedChild && <ChildDetail data={data} setData={setData} childId={selectedChild} setView={setView} />}
    </>
  );

  const notifPanel = showNotifications && (
    <div style={{ position: "fixed", inset: 0, zIndex: 150, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={() => setShowNotifications(false)} style={{ flex: 1, background: "#0004" }} />
      <div style={{ width: "min(420px, 100vw)", background: COLORS.cream, height: "100vh", overflowY: "auto", padding: 20, boxShadow: "-4px 0 30px #0003", animation: "slideIn .25s ease" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          <button onClick={() => setShowNotifications(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888" }}>✕</button>
        </div>
        <NotificationsView data={data} setData={setData} />
      </div>
    </div>
  );

  if (isTablet) {
    // ── Tablet layout: fixed sidebar + main ────────────────────────────────
    return (
      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", display: "flex", minHeight: "100vh", background: COLORS.cream }}>
        {/* Sidebar */}
        <div style={{ width: 220, background: COLORS.dark, display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
          <div style={{ padding: "22px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>🏡</span>
              <span style={{ color: "white", fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>Haushalts-<br />Helden</span>
            </div>
          </div>

          <nav style={{ padding: "12px 10px", flex: 1 }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setView(n.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  background: view === n.id ? "rgba(255,255,255,0.12)" : "transparent",
                  border: "none",
                  borderLeft: view === n.id ? `3px solid ${COLORS.sky}` : "3px solid transparent",
                  borderRadius: view === n.id ? "0 10px 10px 0" : "0 10px 10px 0",
                  padding: "12px 14px", marginBottom: 4,
                  color: view === n.id ? "white" : "rgba(255,255,255,0.55)",
                  fontWeight: view === n.id ? 700 : 400, fontSize: 14,
                  cursor: "pointer", textAlign: "left", transition: "all .15s",
                }}>
                <span style={{ fontSize: 18 }}>{n.icon}</span>
                {n.label.replace(/^.\s/, "")}
              </button>
            ))}
          </nav>

          <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            {data.pin && <div style={{ color: COLORS.mint, fontSize: 12, marginBottom: 8, paddingLeft: 14 }}>🔒 PIN aktiv</div>}
            <button onClick={openNotifications}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: "transparent", border: "none", borderRadius: 10, padding: "10px 14px", color: "rgba(255,255,255,0.55)", fontSize: 14, cursor: "pointer", textAlign: "left", position: "relative" }}>
              <span style={{ fontSize: 18 }}>🔔</span>
              Benachrichtigungen
              {(data.notifications || []).filter(n => !n.read).length > 0 && (
                <span style={{ background: COLORS.rose, color: "white", borderRadius: "50%", width: 18, height: 18, fontSize: 11, fontWeight: 900, display: "inline-flex", alignItems: "center", justifyContent: "center", marginLeft: "auto" }}>
                  {(data.notifications || []).filter(n => !n.read).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 36px" }}>
            {content}
          </div>
        </div>

        {notifPanel}
        <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
      </div>
    );
  }

  // ── Mobile layout: top header + bottom tabs ────────────────────────────────
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 720, margin: "0 auto", minHeight: "100vh", background: COLORS.cream }}>
      <div style={{ background: COLORS.dark, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 24 }}>🏡</span>
        <span style={{ color: "white", fontWeight: 800, fontSize: 18 }}>Haushalts-Helden</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          {data.pin && <span style={{ color: COLORS.mint, fontSize: 12 }}>🔒</span>}
          <NotificationBell data={data} setData={setData} onClick={openNotifications} />
        </div>
      </div>

      {notifPanel}

      <div style={{ background: "white", display: "flex", borderBottom: "2px solid #f0f0f0" }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setView(n.id)}
            style={{
              flex: 1, background: "none", border: "none",
              borderBottom: view === n.id ? `3px solid ${COLORS.sky}` : "3px solid transparent",
              padding: "14px 4px", fontSize: 13, fontWeight: view === n.id ? 700 : 500,
              color: view === n.id ? COLORS.sky : "#888", cursor: "pointer", transition: "all .2s",
            }}>
            {n.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 24 }}>{content}</div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
    </div>
  );
}
