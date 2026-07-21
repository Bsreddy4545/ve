import { useEffect, useRef, useState } from 'react'
import './App.css'

type User = {
  id: number
  email: string
  name: string | null
  picture: string | null
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

function App() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const googleSlot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data?.user && setUser(data.user))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (user || !GOOGLE_CLIENT_ID) return
    // The GIS script loads async; poll briefly until it is available
    const timer = window.setInterval(() => {
      if (!window.google || !googleSlot.current) return
      window.clearInterval(timer)
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          const r = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential }),
          })
          const data = await r.json()
          if (r.ok) setUser(data.user)
          else setError(data.error ?? 'Google sign-in failed')
        },
      })
      window.google.accounts.id.renderButton(googleSlot.current, {
        theme: 'outline',
        size: 'large',
        width: 308,
        text: 'continue_with',
      })
    }, 200)
    return () => window.clearInterval(timer)
  }, [user])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const endpoint = mode === 'signin' ? '/api/auth/login' : '/api/auth/register'
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      const data = await r.json()
      if (r.ok) setUser(data.user)
      else setError(data.error ?? 'Something went wrong')
    } catch {
      setError('Cannot reach the server — is the API running? (npm run server)')
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.google?.accounts.id.disableAutoSelect()
    setUser(null)
    setPassword('')
  }

  if (user) {
    return (
      <main className="login-page">
        <div className="login-card welcome">
          {user.picture ? (
            <img className="avatar" src={user.picture} alt="" referrerPolicy="no-referrer" />
          ) : (
            <div className="mark">Ve</div>
          )}
          <h1>Welcome{user.name ? `, ${user.name.split(' ')[0]}` : ' back'}</h1>
          <p className="subtitle">
            Signed in as <strong>{user.email}</strong>
          </p>
          <button type="button" className="primary" onClick={signOut}>
            Sign out
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="mark">Ve</div>
        <h1>{mode === 'signin' ? 'Welcome to Ve' : 'Create your account'}</h1>
        <p className="subtitle">
          {mode === 'signin' ? 'Sign in to continue' : 'Join Ve in seconds'}
        </p>

        {GOOGLE_CLIENT_ID ? (
          <>
            <div className="google-slot" ref={googleSlot}></div>
            <div className="divider">
              <span>or</span>
            </div>
          </>
        ) : null}

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                name="name"
                placeholder="Your name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <div className="password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="••••••••"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((show) => !show)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="signup">
          {mode === 'signin' ? 'New to Ve?' : 'Already have an account?'}{' '}
          <button
            type="button"
            className="link"
            onClick={() => {
              setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
              setError('')
            }}
          >
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </div>
    </main>
  )
}

export default App
