import type { ReactNode } from 'react'

// Shows a "connect first" state for integration sections whose provider is off.
export default function ConnectGate({
  title,
  provider,
  icon,
  blurb,
  connected,
  onGoConnectors,
  children,
}: {
  title: string
  provider: string
  icon: string
  blurb: string
  connected: boolean
  onGoConnectors: () => void
  children: ReactNode
}) {
  if (connected) return <>{children}</>
  return (
    <div className="section">
      <header className="section-head">
        <div>
          <h2>{title}</h2>
          <p>{blurb}</p>
        </div>
      </header>
      <div className="connect-hero">
        <div className="connect-icon">{icon}</div>
        <h3>Connect {provider}</h3>
        <p>Once connected, your {title.toLowerCase()} will appear right here inside Ve.</p>
        <button className="primary" onClick={onGoConnectors}>Go to Connectors</button>
      </div>
    </div>
  )
}
