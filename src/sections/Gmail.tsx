import ConnectGate from './ConnectGate'

// Sample layout of the inbox — real messages populate once Gmail OAuth is live.
const SAMPLE = [
  { from: 'Google Security', subject: 'Security alert for your account', time: '9:24 AM', unread: true },
  { from: 'Figma', subject: 'Your team was invited to a new project', time: '8:02 AM', unread: true },
  { from: 'GitHub', subject: '[Bsreddy4545/ve] Deploy succeeded', time: 'Yesterday', unread: false },
]

export default function Gmail({ connected, onGoConnectors }: { connected: boolean; onGoConnectors: () => void }) {
  return (
    <ConnectGate
      title="Gmail"
      provider="Gmail"
      icon="✉️"
      blurb="Your inbox, inside Ve"
      connected={connected}
      onGoConnectors={onGoConnectors}
    >
      <div className="section">
        <header className="section-head">
          <div>
            <h2>Gmail</h2>
            <p>Inbox preview</p>
          </div>
        </header>
        <div className="note">
          Showing a sample layout. Live mail loads here once Google approves the Gmail read scope.
        </div>
        <ul className="mail-list">
          {SAMPLE.map((m, i) => (
            <li key={i} className={m.unread ? 'unread' : ''}>
              <span className="dot" />
              <span className="mail-from">{m.from}</span>
              <span className="mail-subject">{m.subject}</span>
              <span className="mail-time">{m.time}</span>
            </li>
          ))}
        </ul>
      </div>
    </ConnectGate>
  )
}
