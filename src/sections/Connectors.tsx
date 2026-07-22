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

export default function Connectors({
  connectors,
  onChange,
}: {
  connectors: Connector[]
  onChange: () => void
}) {
  const toggle = async (c: Connector) => {
    await api.setConnector(c.id, !c.connected)
    onChange()
  }

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
        Connecting here turns the integration on in Ve. Live data (real emails, messages, meetings)
        activates once each provider's OAuth is approved — this is the roadmap wiring.
      </div>

      {groups.map((kind) => (
        <div key={kind} className="connector-group">
          <h3 className="group-title">{KIND_LABELS[kind]}</h3>
          <div className="connector-grid">
            {connectors
              .filter((c) => c.kind === kind)
              .map((c) => (
                <div key={c.id} className={`connector-card ${c.connected ? 'on' : ''}`}>
                  <div className="connector-logo">{LOGOS[c.id] ?? '🔌'}</div>
                  <div className="connector-info">
                    <span className="connector-name">{c.name}</span>
                    <span className={`status ${c.connected ? 'connected' : ''}`}>
                      {c.connected ? 'Connected' : 'Not connected'}
                    </span>
                  </div>
                  <button className={c.connected ? 'ghost' : 'primary compact'} onClick={() => toggle(c)}>
                    {c.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
