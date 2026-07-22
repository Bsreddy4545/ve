import { useEffect, useState } from 'react'
import { api, type Summary, type User } from '../api'

type SectionId = 'tasks' | 'files' | 'gmail' | 'meetings' | 'notifications' | 'connectors'

export default function Overview({ user, onGo }: { user: User; onGo: (s: SectionId) => void }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [mailEnabled, setMailEnabled] = useState(false)

  useEffect(() => {
    api.summary().then((d) => {
      setSummary(d.summary)
      setMailEnabled(d.mailEnabled)
    })
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = user.name?.split(' ')[0] || 'there'

  const stats = [
    { label: 'Open tasks', value: summary?.open_tasks ?? '—', go: 'tasks' as const, icon: '🗂️' },
    { label: 'Files', value: summary?.files ?? '—', go: 'files' as const, icon: '📁' },
    { label: 'Connected tools', value: summary?.connected ?? '—', go: 'connectors' as const, icon: '🔌' },
    { label: 'Unread alerts', value: summary?.unread ?? '—', go: 'notifications' as const, icon: '🔔' },
  ]

  return (
    <div className="section">
      <header className="section-head">
        <div>
          <h2>{greeting}, {firstName} 👋</h2>
          <p>Here's your workspace at a glance</p>
        </div>
      </header>

      <div className="stat-grid">
        {stats.map((s) => (
          <button key={s.label} className="stat-card" onClick={() => onGo(s.go)}>
            <span className="stat-icon">{s.icon}</span>
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="note">
        {mailEnabled
          ? `📧 Task emails are on — new tasks are sent to ${user.email}.`
          : '📭 Task emails are off — add a Google App Password in .env to email yourself on every new task.'}
      </div>

      <h3 className="group-title">Quick actions</h3>
      <div className="quick-actions">
        <button className="quick" onClick={() => onGo('tasks')}>➕ New task</button>
        <button className="quick" onClick={() => onGo('files')}>⬆ Upload a file</button>
        <button className="quick" onClick={() => onGo('connectors')}>🔌 Connect a tool</button>
      </div>
    </div>
  )
}
