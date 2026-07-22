import ConnectGate from './ConnectGate'

const SAMPLE = [
  { title: 'Design sync', time: 'Today · 2:00 PM', platform: 'Google Meet', with: 'Product team' },
  { title: '1:1 with Alex', time: 'Today · 4:30 PM', platform: 'Google Meet', with: 'Alex' },
  { title: 'Sprint planning', time: 'Tomorrow · 10:00 AM', platform: 'Outlook', with: 'Engineering' },
]

export default function Meetings({ connected, onGoConnectors }: { connected: boolean; onGoConnectors: () => void }) {
  return (
    <ConnectGate
      title="Meetings"
      provider="Google Calendar / Meet"
      icon="📅"
      blurb="Your calendar and meeting links"
      connected={connected}
      onGoConnectors={onGoConnectors}
    >
      <div className="section">
        <header className="section-head">
          <div>
            <h2>Meetings</h2>
            <p>Upcoming</p>
          </div>
          <button className="primary compact">+ New meeting</button>
        </header>
        <div className="note">
          Showing a sample schedule. Real events sync here once Calendar/Meet or Outlook is connected.
        </div>
        <ul className="meeting-list">
          {SAMPLE.map((m, i) => (
            <li key={i}>
              <div className="meeting-when">{m.time}</div>
              <div className="meeting-main">
                <span className="meeting-title">{m.title}</span>
                <span className="meeting-with">{m.with}</span>
              </div>
              <span className="pill">{m.platform}</span>
              <button className="ghost">Join</button>
            </li>
          ))}
        </ul>
      </div>
    </ConnectGate>
  )
}
