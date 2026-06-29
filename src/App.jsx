import { useState, useEffect } from 'react'
import './App.css'

const STORAGE_KEY = 'haushaltshelden_data'

const DEFAULT_TASKS = [
  { id: 1, name: 'Staubsaugen', category: 'Reinigung', assignee: '', done: false, dueDate: '' },
  { id: 2, name: 'Geschirrspüler ausräumen', category: 'Küche', assignee: '', done: false, dueDate: '' },
  { id: 3, name: 'Badezimmer putzen', category: 'Reinigung', assignee: '', done: false, dueDate: '' },
  { id: 4, name: 'Einkaufen', category: 'Besorgungen', assignee: '', done: false, dueDate: '' },
  { id: 5, name: 'Müll rausbringen', category: 'Allgemein', assignee: '', done: false, dueDate: '' },
]

const CATEGORIES = ['Reinigung', 'Küche', 'Besorgungen', 'Allgemein', 'Garten', 'Wäsche']

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

export default function App() {
  const [tasks, setTasks] = useState(() => {
    const saved = loadData()
    return saved?.tasks ?? DEFAULT_TASKS
  })
  const [members, setMembers] = useState(() => {
    const saved = loadData()
    return saved?.members ?? ['Anna', 'Ben']
  })
  const [filter, setFilter] = useState('Alle')
  const [showForm, setShowForm] = useState(false)
  const [showMemberForm, setShowMemberForm] = useState(false)
  const [newTask, setNewTask] = useState({ name: '', category: 'Allgemein', assignee: '', dueDate: '' })
  const [newMember, setNewMember] = useState('')
  const [nextId, setNextId] = useState(() => {
    const saved = loadData()
    return saved?.nextId ?? 6
  })

  useEffect(() => {
    saveData({ tasks, members, nextId })
  }, [tasks, members, nextId])

  const filteredTasks = filter === 'Alle'
    ? tasks
    : filter === 'Offen'
    ? tasks.filter(t => !t.done)
    : filter === 'Erledigt'
    ? tasks.filter(t => t.done)
    : tasks.filter(t => t.category === filter)

  function toggleDone(id) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  function deleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  function addTask(e) {
    e.preventDefault()
    if (!newTask.name.trim()) return
    setTasks(prev => [...prev, { ...newTask, id: nextId, done: false }])
    setNextId(n => n + 1)
    setNewTask({ name: '', category: 'Allgemein', assignee: '', dueDate: '' })
    setShowForm(false)
  }

  function addMember(e) {
    e.preventDefault()
    if (!newMember.trim() || members.includes(newMember.trim())) return
    setMembers(prev => [...prev, newMember.trim()])
    setNewMember('')
    setShowMemberForm(false)
  }

  function removeMember(name) {
    setMembers(prev => prev.filter(m => m !== name))
    setTasks(prev => prev.map(t => t.assignee === name ? { ...t, assignee: '' } : t))
  }

  const stats = {
    total: tasks.length,
    done: tasks.filter(t => t.done).length,
    open: tasks.filter(t => !t.done).length,
  }

  const memberStats = members.map(m => ({
    name: m,
    total: tasks.filter(t => t.assignee === m).length,
    done: tasks.filter(t => t.assignee === m && t.done).length,
  }))

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <h1 className="logo">🏠 HaushaltsHelden</h1>
          <div className="stats-bar">
            <span className="stat"><strong>{stats.open}</strong> offen</span>
            <span className="stat done"><strong>{stats.done}</strong> erledigt</span>
            <span className="stat"><strong>{stats.total}</strong> gesamt</span>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="members-section">
          <div className="section-header">
            <h2>Mitglieder</h2>
            <button className="btn-icon" onClick={() => setShowMemberForm(v => !v)} title="Mitglied hinzufügen">+</button>
          </div>
          {showMemberForm && (
            <form className="inline-form" onSubmit={addMember}>
              <input
                autoFocus
                value={newMember}
                onChange={e => setNewMember(e.target.value)}
                placeholder="Name..."
                className="input"
              />
              <button className="btn btn-primary" type="submit">Hinzufügen</button>
              <button className="btn" type="button" onClick={() => setShowMemberForm(false)}>Abbrechen</button>
            </form>
          )}
          <div className="members-grid">
            {memberStats.map(m => (
              <div key={m.name} className="member-card">
                <div className="member-avatar">{m.name[0]}</div>
                <div className="member-info">
                  <strong>{m.name}</strong>
                  <span className="member-stats">{m.done}/{m.total} erledigt</span>
                </div>
                <button className="btn-remove" onClick={() => removeMember(m.name)} title="Entfernen">×</button>
              </div>
            ))}
          </div>
        </section>

        <section className="tasks-section">
          <div className="section-header">
            <h2>Aufgaben</h2>
            <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>+ Neue Aufgabe</button>
          </div>

          {showForm && (
            <form className="task-form" onSubmit={addTask}>
              <input
                autoFocus
                className="input"
                placeholder="Aufgabe..."
                value={newTask.name}
                onChange={e => setNewTask(p => ({ ...p, name: e.target.value }))}
              />
              <select
                className="input"
                value={newTask.category}
                onChange={e => setNewTask(p => ({ ...p, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <select
                className="input"
                value={newTask.assignee}
                onChange={e => setNewTask(p => ({ ...p, assignee: e.target.value }))}
              >
                <option value="">Niemand zugewiesen</option>
                {members.map(m => <option key={m}>{m}</option>)}
              </select>
              <input
                type="date"
                className="input"
                value={newTask.dueDate}
                onChange={e => setNewTask(p => ({ ...p, dueDate: e.target.value }))}
              />
              <div className="form-actions">
                <button className="btn btn-primary" type="submit">Speichern</button>
                <button className="btn" type="button" onClick={() => setShowForm(false)}>Abbrechen</button>
              </div>
            </form>
          )}

          <div className="filter-bar">
            {['Alle', 'Offen', 'Erledigt', ...CATEGORIES].map(f => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="task-list">
            {filteredTasks.length === 0 && (
              <p className="empty">Keine Aufgaben in dieser Ansicht.</p>
            )}
            {filteredTasks.map(task => (
              <div key={task.id} className={`task-card ${task.done ? 'done' : ''}`}>
                <label className="task-check">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleDone(task.id)}
                  />
                  <span className="checkmark" />
                </label>
                <div className="task-body">
                  <span className="task-name">{task.name}</span>
                  <div className="task-meta">
                    <span className="badge category">{task.category}</span>
                    {task.assignee && <span className="badge assignee">{task.assignee}</span>}
                    {task.dueDate && <span className="badge date">📅 {task.dueDate}</span>}
                  </div>
                </div>
                <button className="btn-remove" onClick={() => deleteTask(task.id)} title="Löschen">×</button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
