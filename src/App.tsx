import { useState } from 'react'
import './App.css'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [signedIn, setSignedIn] = useState(false)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSignedIn(true)
  }

  if (signedIn) {
    return (
      <main className="login-page">
        <div className="login-card welcome">
          <div className="mark">Ve</div>
          <h1>Welcome back</h1>
          <p className="subtitle">
            You are signed in as <strong>{email}</strong>
          </p>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setSignedIn(false)
              setPassword('')
            }}
          >
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
        <h1>Welcome to Ve</h1>
        <p className="subtitle">Sign in to continue</p>

        <form onSubmit={handleSubmit}>
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
                autoComplete="current-password"
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

          <div className="row">
            <label className="remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <a className="forgot" href="#forgot" onClick={(e) => e.preventDefault()}>
              Forgot password?
            </a>
          </div>

          <button type="submit" className="primary">
            Sign in
          </button>
        </form>

        <p className="signup">
          New to Ve?{' '}
          <a href="#signup" onClick={(e) => e.preventDefault()}>
            Create an account
          </a>
        </p>
      </div>
    </main>
  )
}

export default App
