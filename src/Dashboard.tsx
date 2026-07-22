import { useCallback, useEffect, useState } from 'react'
import { api, type Connector, type Notification, type User } from './api'
import Tasks from './sections/Tasks'
import Files from './sections/Files'
import Gmail from './sections/Gmail'
import Meetings from './sections/Meetings'
import Notifications from './sections/Notifications'
import Connectors from './sections/Connectors'
import './Dashboard.css'

type SectionId = 'tasks' | 'files' | 'gmail' | 'meetings' | 'notifications' | 'connectors'

const NAV: { id: SectionId; label: string; icon: string }[] = [
  { id: 'tasks', label: 'Tasks', icon: '🗂️' },
  { id: 'files', label: 'Files', icon: '📁' },
  { id: 'gmail', label: 'Gmail', icon: '✉️' },
  { id: 'meetings', label: 'Meetings', icon: '📅' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'connectors', label: 'Connectors', icon: '🔌' },
]

export default function Dashboard({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [section, setSection] = useState<SectionId>('tasks')
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [collapsed, setCollapsed] = useState(false)

  const loadConnectors = useCallback(() => api.connectors().then((d) => setConnectors(d.connectors)), [])
  const loadNotifications = useCallback(
    () =>
      api.notifications().then((d) => {
        setNotifications(d.notifications)
        setUnread(d.unread)
      }),
    [],
  )

  useEffect(() => {
    loadConnectors()
    loadNotifications()
  }, [loadConnectors, loadNotifications])

  const isConnected = (id: string) => connectors.find((c) => c.id === id)?.connected ?? false

  const render = () => {
    switch (section) {
      case 'tasks':
        return <Tasks />
      case 'files':
        return <Files />
      case 'gmail':
        return <Gmail connected={isConnected('gmail')} onGoConnectors={() => setSection('connectors')} />
      case 'meetings':
        return (
          <Meetings
            connected={isConnected('gcal') || isConnected('outlook')}
            onGoConnectors={() => setSection('connectors')}
          />
        )
      case 'notifications':
        return <Notifications notifications={notifications} onRefresh={loadNotifications} />
      case 'connectors':
        return (
          <Connectors
            connectors={connectors}
            onChange={() => {
              loadConnectors()
              loadNotifications()
            }}
          />
        )
    }
  }

  return (
    <div className={`dash ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <div className="mark small">Ve</div>
            {!collapsed && <span className="brand-name">Ve</span>}
          </div>
          <button className="collapse-btn" onClick={() => setCollapsed((c) => !c)} aria-label="Toggle sidebar">
            {collapsed ? '»' : '«'}
          </button>
        </div>

        <nav>
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${section === item.id ? 'active' : ''}`}
              onClick={() => setSection(item.id)}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
              {item.id === 'notifications' && unread > 0 && <span className="badge">{unread}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          {user.picture ? (
            <img className="avatar tiny" src={user.picture} alt="" referrerPolicy="no-referrer" />
          ) : (
            <div className="avatar-fallback">{(user.name || user.email)[0].toUpperCase()}</div>
          )}
          {!collapsed && (
            <div className="user-meta">
              <span className="user-name">{user.name || 'Signed in'}</span>
              <span className="user-email">{user.email}</span>
            </div>
          )}
          {!collapsed && (
            <button className="icon-btn" onClick={onSignOut} title="Sign out">⏻</button>
          )}
        </div>
      </aside>

      <main className="dash-main">{render()}</main>
    </div>
  )
}
