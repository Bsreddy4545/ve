import { useEffect } from 'react'
import { api, type Notification } from '../api'

const SOURCE_ICON: Record<string, string> = {
  system: '🔔',
  google: '🔵',
  gmail: '✉️',
  gcal: '📅',
  outlook: '📧',
  slack: '💬',
  clickup: '✅',
  jira: '🧭',
  whatsapp: '🟢',
  instagram: '📷',
  facebook: '🔷',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function Notifications({
  notifications,
  onRefresh,
}: {
  notifications: Notification[]
  onRefresh: () => void
}) {
  // Mark everything read when this view opens.
  useEffect(() => {
    if (notifications.some((n) => !n.read)) {
      api.markNotificationsRead().then(onRefresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="section">
      <header className="section-head">
        <div>
          <h2>Notifications</h2>
          <p>Everything from your connected tools, in one place</p>
        </div>
      </header>

      {notifications.length === 0 ? (
        <div className="empty">
          <p>No notifications yet. Connect tools to start receiving them here.</p>
        </div>
      ) : (
        <ul className="notif-list">
          {notifications.map((n) => (
            <li key={n.id} className={n.read ? '' : 'unread'}>
              <span className="notif-icon">{SOURCE_ICON[n.source] ?? '🔔'}</span>
              <div className="notif-body">
                <span className="notif-title">{n.title}</span>
                {n.body && <span className="notif-text">{n.body}</span>}
              </div>
              <span className="notif-time">{timeAgo(n.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
