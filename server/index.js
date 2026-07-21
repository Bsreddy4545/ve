import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import pg from 'pg'
import { OAuth2Client } from 'google-auth-library'

const { DATABASE_URL, GOOGLE_CLIENT_ID, JWT_SECRET, PORT = 3001 } = process.env

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL in .env — add your Postgres connection string.')
  process.exit(1)
}
if (!JWT_SECRET) {
  console.error('Missing JWT_SECRET in .env — set it to any long random string.')
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  // Hosted Postgres (Supabase/Neon/Render) requires SSL; local does not
  ssl: /localhost|127\.0\.0\.1/.test(DATABASE_URL) ? false : { rejectUnauthorized: false },
})

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID)
const app = express()
app.use(express.json())
app.use(cookieParser())

await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    picture TEXT,
    google_id TEXT UNIQUE,
    password_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`)

const PUBLIC_FIELDS = 'id, email, name, picture'

function setSession(res, user) {
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
  res.cookie('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

function getSession(req) {
  try {
    return jwt.verify(req.cookies.session, JWT_SECRET)
  } catch {
    return null
  }
}

app.post('/api/auth/google', async (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_ID is not configured on the server' })
  }
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.credential,
      audience: GOOGLE_CLIENT_ID,
    })
    const p = ticket.getPayload()
    const { rows } = await pool.query(
      `INSERT INTO users (email, name, picture, google_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name,
             picture = EXCLUDED.picture,
             google_id = EXCLUDED.google_id,
             last_login = now()
       RETURNING ${PUBLIC_FIELDS}`,
      [p.email, p.name ?? null, p.picture ?? null, p.sub],
    )
    setSession(res, rows[0])
    res.json({ user: rows[0] })
  } catch (err) {
    console.error('google auth failed:', err.message)
    res.status(401).json({ error: 'Google sign-in could not be verified' })
  }
})

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Email and a password of at least 8 characters are required' })
  }
  try {
    const hash = await bcrypt.hash(password, 10)
    const { rows } = await pool.query(
      `INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING ${PUBLIC_FIELDS}`,
      [email.toLowerCase(), name || null, hash],
    )
    setSession(res, rows[0])
    res.json({ user: rows[0] })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists — sign in instead' })
    }
    console.error('register failed:', err.message)
    res.status(500).json({ error: 'Could not create the account' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_FIELDS}, password_hash FROM users WHERE email = $1`,
    [String(email ?? '').toLowerCase()],
  )
  const user = rows[0]
  if (!user?.password_hash || !(await bcrypt.compare(password ?? '', user.password_hash))) {
    return res.status(401).json({ error: 'Incorrect email or password' })
  }
  await pool.query('UPDATE users SET last_login = now() WHERE id = $1', [user.id])
  delete user.password_hash
  setSession(res, user)
  res.json({ user })
})

app.get('/api/me', async (req, res) => {
  const session = getSession(req)
  if (!session) return res.status(401).json({ user: null })
  const { rows } = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [session.id])
  if (!rows[0]) return res.status(401).json({ user: null })
  res.json({ user: rows[0] })
})

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('session')
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Ve API listening on http://localhost:${PORT}`)
})
