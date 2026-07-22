import { useEffect, useRef, useState } from 'react'
import type { User } from './api'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export default function Login({ onAuth }: { onAuth: (user: User) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const googleSlot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
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
          if (r.ok) onAuth(data.user)
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
  }, [onAuth])

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
      if (r.ok) onAuth(data.user)
      else setError(data.error ?? 'Something went wrong')
    } catch {
      setError('Cannot reach the server — is the API running? (npm run dev:all)')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="mark">Ve</div>
        <h1>{mode === 'signin' ? 'Welcome to Ve' : 'Create your account'}</h1>
        <p className="subtitle">{mode === 'signin' ? 'Sign in to continue' : 'Join Ve in seconds'}</p>

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
              <input type="text" placeholder="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
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
                placeholder="••••••••"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="toggle-password" onClick={() => setShowPassword((s) => !s)}>
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
