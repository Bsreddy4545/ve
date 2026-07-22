import { useEffect, useState } from 'react'
import { api, type Task } from '../api'

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('normal')
  const [due, setDue] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.tasks().then((d) => setTasks(d.tasks)).finally(() => setLoading(false))
  }, [])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const { task } = await api.addTask({ title, priority, due_date: due || null })
    setTasks((t) => [task, ...t])
    setTitle('')
    setDue('')
    setPriority('normal')
  }

  const toggle = async (task: Task) => {
    const { task: updated } = await api.updateTask(task.id, { done: !task.done })
    setTasks((t) => t.map((x) => (x.id === task.id ? updated : x)).sort((a, b) => Number(a.done) - Number(b.done)))
  }

  const remove = async (id: number) => {
    await api.deleteTask(id)
    setTasks((t) => t.filter((x) => x.id !== id))
  }

  const open = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)

  return (
    <div className="section">
      <header className="section-head">
        <div>
          <h2>Tasks</h2>
          <p>{open.length} open · {done.length} done</p>
        </div>
      </header>

      <form className="task-add" onSubmit={add}>
        <input placeholder="Add a task…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <button type="submit" className="primary compact">Add</button>
      </form>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : tasks.length === 0 ? (
        <div className="empty">
          <p>No tasks yet. Add your first one above.</p>
        </div>
      ) : (
        <ul className="task-list">
          {[...open, ...done].map((task) => (
            <li key={task.id} className={task.done ? 'done' : ''}>
              <button className="check" onClick={() => toggle(task)} aria-label="Toggle done">
                {task.done ? '✓' : ''}
              </button>
              <span className="task-title">{task.title}</span>
              <span className={`pill priority-${task.priority}`}>{task.priority}</span>
              {task.due_date && <span className="pill due">{new Date(task.due_date).toLocaleDateString()}</span>}
              <button className="icon-btn" onClick={() => remove(task.id)} aria-label="Delete">✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
