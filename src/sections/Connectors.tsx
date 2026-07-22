import { useState } from 'react'
import { api, type Connector } from '../api'

const LOGOS: Record<string, string> = {
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

const KIND_LABELS: Record<string, string> = {
  account: 'Account',
  mail: 'Email',
  meetings: 'Meetings',
  work: 'Work tools',
  social: 'Social',
}

function SlackCard({ connector, onChange }: { connector: Connector; onChange: () => void }) {
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  const connect = async () => {
    setError('')
    setBusy(true)
    try {
      await api.connectSlack(token.trim())
      setToken('')
      setOpen(false)
      onChange()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const sync = async () => {
    setSyncMsg('Syncing…')
    try {
      const { created } = await api.syncSlack()
      setSyncMsg(created ? `${created} new message${created === 1 ? '' : 's'}` : 'Up to date')
      onChange()
    } catch {
      setSyncMsg('Sync failed')
    }
  }

  const disconnect = async () => {
    await api.setConnector('slack', false)
    onChange()
  }

  return (
    <div className={`connector-card ${connector.connected ? 'on' : ''}`}>
      <div className="connector-row">
        <div className="connector-logo">{LOGOS.slack}</div>
        <div className="connector-info">
          <span className="connector-name">
            {connector.name} <span className="live-tag">LIVE</span>
          </span>
          <span className={`status ${connector.connected ? 'connected' : ''}`}>
            {connector.connected ? connector.account_label || 'Connected' : 'Not connected'}
          </span>
        </div>
        {connector.connected ? (
          <button className="ghost" onClick={disconnect}>Disconnect</button>
        ) : (
          <button className="primary compact" onClick={() => setOpen((o) => !o)}>Connect</button>
        )}
      </div>

      {connector.connected && (
        <div className="connector-actions">
          <button className="ghost" onClick={sync}>Sync now</button>
          {syncMsg && <span className="sync-msg">{syncMsg}</span>}
        </div>
      )}

      {open && !connector.connected && (
        <div className="token-form">
          <p className="token-help">
            Create a Slack app, add the bot scopes <code>channels:history</code> and{' '}
            <code>channels:read</code>, install it, invite it to a channel, then paste its Bot token
            (<code>xoxb-…</code>).
          </p>
          <div className="token-input">
            <input
              type="password"
              placeholder="xoxb-…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <button className="primary compact" onClick={connect} disabled={busy || !token.trim()}>
              {busy ? 'Checking…' : 'Connect'}
            </button>
          </div>
          {error && <p className="error small">{error}</p>}
        </div>
      )}
    </div>
  )
}

function MockCard({ connector, onChange }: { connector: Connector; onChange: () => void }) {
  const toggle = async () => {
    await api.setConnector(connector.id, !connector.connected)
    onChange()
  }
  return (
    <div className={`connector-card ${connector.connected ? 'on' : ''}`}>
      <div className="connector-row">
        <div className="connector-logo">{LOGOS[connector.id] ?? '🔌'}</div>
        <div className="connector-info">
          <span className="connector-name">{connector.name}</span>
          <span className={`status ${connector.connected ? 'connected' : ''}`}>
            {connector.connected ? 'Connected' : 'Not connected'}
          </span>
        </div>
        <button className={connector.connected ? 'ghost' : 'primary compact'} onClick={toggle}>
          {connector.connected ? 'Disconnect' : 'Connect'}
        </button>
      </div>
    </div>
  )
}

export default function Connectors({ connectors, onChange }: { connectors: Connector[]; onChange: () => void }) {
  const groups = Object.keys(KIND_LABELS).filter((k) => connectors.some((c) => c.kind === k))

  return (
    <div className="section">
      <header className="section-head">
        <div>
          <h2>Connectors</h2>
          <p>Connect your tools so their notifications land in Ve</p>
        </div>
      </header>

      <div className="note">
        <strong>Slack is live</strong> — connect it with a token and real messages flow into your
        Notifications. Other providers are UI toggles for now; each becomes live as its OAuth is wired.
      </div>

      {groups.map((kind) => (
        <div key={kind} className="connector-group">
          <h3 className="group-title">{KIND_LABELS[kind]}</h3>
          <div className="connector-grid">
            {connectors
              .filter((c) => c.kind === kind)
              .map((c) =>
                c.live ? (
                  <SlackCard key={c.id} connector={c} onChange={onChange} />
                ) : (
                  <MockCard key={c.id} connector={c} onChange={onChange} />
                ),
              )}
          </div>
        </div>
      ))}
    </div>
  )
}
