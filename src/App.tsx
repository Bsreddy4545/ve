import { useEffect, useState } from 'react'
import { api, type User } from './api'
import Login from './Login'
import Dashboard from './Dashboard'
import './App.css'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    api
      .me()
      .then((d) => setUser(d.user))
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  const signOut = async () => {
    await api.logout()
    window.google?.accounts.id.disableAutoSelect()
    setUser(null)
  }

  if (!ready) {
    return (
      <main className="login-page">
        <div className="mark pulse">Ve</div>
      </main>
    )
  }

  return user ? <Dashboard user={user} onSignOut={signOut} /> : <Login onAuth={setUser} />
}

export default App
