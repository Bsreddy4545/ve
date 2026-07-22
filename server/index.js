import 'dotenv/config'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname } from 'node:path'
import { mkdirSync, createReadStream, existsSync } from 'node:fs'
import { unlink } from 'node:fs/promises'
import express from 'express'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import pg from 'pg'
import multer from 'multer'
import { OAuth2Client } from 'google-auth-library'
import { sendTaskEmail, mailEnabled } from './mailer.js'

const { DATABASE_URL, GOOGLE_CLIENT_ID, JWT_SECRET, PORT = 3001 } = process.env

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL in .env — add your Postgres connection string.')
  process.exit(1)
}
if (!JWT_SECRET) {
  console.error('Missing JWT_SECRET in .env — set it to any long random string.')
  process.exit(1)
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = join(__dirname, 'uploads')
mkdirSync(UPLOAD_DIR, { recursive: true })

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: /localhost|127\.0\.0\.1/.test(DATABASE_URL) ? false : { rejectUnauthorized: false },
})

const isProd = process.env.NODE_ENV === 'production'
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID)
const app = express()
if (isProd) app.set('trust proxy', 1) // behind the host's TLS proxy (Render, etc.)
app.use(express.json())
app.use(cookieParser())

// The providers we can (eventually) connect to. Rendered dynamically by the UI.
const PROVIDERS = [
  { id: 'google', name: 'Google', kind: 'account' },
  { id: 'gmail', name: 'Gmail', kind: 'mail' },
  { id: 'gcal', name: 'Google Calendar / Meet', kind: 'meetings' },
  { id: 'outlook', name: 'Outlook', kind: 'mail' },
  { id: 'slack', name: 'Slack', kind: 'work' },
  { id: 'clickup', name: 'ClickUp', kind: 'work' },
  { id: 'jira', name: 'Jira', kind: 'work' },
  { id: 'whatsapp', name: 'WhatsApp', kind: 'social' },
  { id: 'instagram', name: 'Instagram', kind: 'social' },
  { id: 'facebook', name: 'Facebook', kind: 'social' },
]

async function migrate() {
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
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT false,
      priority TEXT NOT NULL DEFAULT 'normal',
      due_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS files (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL DEFAULT 'other',
      original_name TEXT NOT NULL,
      stored_name TEXT,
      link_url TEXT,
      mime TEXT,
      size BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS connectors (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      connected BOOLEAN NOT NULL DEFAULT false,
      connected_at TIMESTAMPTZ,
      UNIQUE (user_id, provider)
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source TEXT NOT NULL DEFAULT 'system',
      title TEXT NOT NULL,
      body TEXT,
      read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    -- Live-connector fields: OAuth/app token + per-channel sync cursors.
    ALTER TABLE connectors ADD COLUMN IF NOT EXISTS access_token TEXT;
    ALTER TABLE connectors ADD COLUMN IF NOT EXISTS state JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE connectors ADD COLUMN IF NOT EXISTS account_label TEXT;
  `)
}
await migrate()

const PUBLIC_FIELDS = 'id, email, name, picture'

function setSession(res, user) {
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
  res.cookie('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd, // https-only in production
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

// Auth middleware — attaches req.userId or 401s.
function requireAuth(req, res, next) {
  try {
    const { id } = jwt.verify(req.cookies.session, JWT_SECRET)
    req.userId = id
    next()
  } catch {
    res.status(401).json({ error: 'Not signed in' })
  }
}

async function notify(userId, source, title, body) {
  await pool.query(
    'INSERT INTO notifications (user_id, source, title, body) VALUES ($1, $2, $3, $4)',
    [userId, source, title, body ?? null],
  )
}

/* ---------------------------------- auth ---------------------------------- */

app.post('/api/auth/google', async (req, res) => {
  if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'GOOGLE_CLIENT_ID is not configured' })
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: req.body.credential, audience: GOOGLE_CLIENT_ID })
    const p = ticket.getPayload()
    const { rows } = await pool.query(
      `INSERT INTO users (email, name, picture, google_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name, picture = EXCLUDED.picture,
             google_id = EXCLUDED.google_id, last_login = now()
       RETURNING ${PUBLIC_FIELDS}, (xmax = 0) AS is_new`,
      [p.email, p.name ?? null, p.picture ?? null, p.sub],
    )
    const user = rows[0]
    if (user.is_new) await notify(user.id, 'system', 'Welcome to Ve', 'Your account is ready. Connect your tools to get started.')
    delete user.is_new
    setSession(res, user)
    res.json({ user })
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
      `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING ${PUBLIC_FIELDS}`,
      [email.toLowerCase(), name || null, hash],
    )
    await notify(rows[0].id, 'system', 'Welcome to Ve', 'Your account is ready. Connect your tools to get started.')
    setSession(res, rows[0])
    res.json({ user: rows[0] })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'An account with this email already exists — sign in instead' })
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

app.get('/api/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [req.userId])
  if (!rows[0]) return res.status(401).json({ user: null })
  res.json({ user: rows[0] })
})

app.get('/api/summary', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND NOT done) AS open_tasks,
       (SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND done) AS done_tasks,
       (SELECT COUNT(*) FROM files WHERE user_id = $1) AS files,
       (SELECT COUNT(*) FROM connectors WHERE user_id = $1 AND connected) AS connected,
       (SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND NOT read) AS unread`,
    [req.userId],
  )
  res.json({ summary: rows[0], mailEnabled })
})

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('session')
  res.json({ ok: true })
})

/* ---------------------------------- tasks --------------------------------- */

app.get('/api/tasks', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, title, done, priority, due_date, created_at FROM tasks WHERE user_id = $1 ORDER BY done, created_at DESC',
    [req.userId],
  )
  res.json({ tasks: rows })
})

app.post('/api/tasks', requireAuth, async (req, res) => {
  const { title, priority = 'normal', due_date = null } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Task title is required' })
  const { rows } = await pool.query(
    'INSERT INTO tasks (user_id, title, priority, due_date) VALUES ($1, $2, $3, $4) RETURNING id, title, done, priority, due_date, created_at',
    [req.userId, title.trim(), priority, due_date || null],
  )
  const task = rows[0]
  res.json({ task, emailed: mailEnabled })

  // Fire-and-forget: email the registered address + drop an in-app notification.
  const { rows: userRows } = await pool.query('SELECT email, name FROM users WHERE id = $1', [req.userId])
  const user = userRows[0]
  if (user) {
    notify(req.userId, 'system', 'Task created', `“${task.title}” was added to your tasks.`).catch(() => {})
    sendTaskEmail(user.email, user.name, task)
      .then((r) => !r?.skipped && console.log(`[mail] task email sent to ${user.email}`))
      .catch((err) => console.error('[mail] send failed:', err.message))
  }
})

app.patch('/api/tasks/:id', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE tasks SET
       done = COALESCE($1, done),
       title = COALESCE($2, title),
       priority = COALESCE($3, priority),
       due_date = COALESCE($4, due_date)
     WHERE id = $5 AND user_id = $6
     RETURNING id, title, done, priority, due_date, created_at`,
    [req.body.done ?? null, req.body.title ?? null, req.body.priority ?? null, req.body.due_date ?? null, req.params.id, req.userId],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Task not found' })
  res.json({ task: rows[0] })
})

app.delete('/api/tasks/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [req.params.id, req.userId])
  res.json({ ok: true })
})

/* ---------------------------------- files --------------------------------- */

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`),
})
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } })

app.get('/api/files', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, category, original_name, link_url, mime, size, created_at FROM files WHERE user_id = $1 ORDER BY created_at DESC',
    [req.userId],
  )
  res.json({ files: rows })
})

app.post('/api/files', requireAuth, upload.single('file'), async (req, res) => {
  const category = req.body.category || 'other'
  // A "link" entry stores a URL instead of an uploaded file.
  if (category === 'link' || (!req.file && req.body.link_url)) {
    if (!req.body.link_url) return res.status(400).json({ error: 'A URL is required for links' })
    const { rows } = await pool.query(
      'INSERT INTO files (user_id, category, original_name, link_url) VALUES ($1, $2, $3, $4) RETURNING id, category, original_name, link_url, mime, size, created_at',
      [req.userId, 'link', req.body.original_name || req.body.link_url, req.body.link_url],
    )
    return res.json({ file: rows[0] })
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  const { rows } = await pool.query(
    'INSERT INTO files (user_id, category, original_name, stored_name, mime, size) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, category, original_name, link_url, mime, size, created_at',
    [req.userId, category, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size],
  )
  res.json({ file: rows[0] })
})

app.get('/api/files/:id/download', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM files WHERE id = $1 AND user_id = $2', [req.params.id, req.userId])
  const file = rows[0]
  if (!file || !file.stored_name) return res.status(404).json({ error: 'File not found' })
  res.setHeader('Content-Type', file.mime || 'application/octet-stream')
  res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`)
  createReadStream(join(UPLOAD_DIR, file.stored_name)).pipe(res)
})

app.delete('/api/files/:id', requireAuth, async (req, res) => {
  const { rows } = await pool.query('DELETE FROM files WHERE id = $1 AND user_id = $2 RETURNING stored_name', [req.params.id, req.userId])
  if (rows[0]?.stored_name) await unlink(join(UPLOAD_DIR, rows[0].stored_name)).catch(() => {})
  res.json({ ok: true })
})

/* ------------------------------- connectors ------------------------------- */

// Providers with a real, working integration (vs. UI-only toggles for now).
const LIVE_PROVIDERS = new Set(['slack'])

app.get('/api/connectors', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT provider, connected, connected_at, account_label FROM connectors WHERE user_id = $1', [req.userId])
  const status = Object.fromEntries(rows.map((r) => [r.provider, r]))
  res.json({
    connectors: PROVIDERS.map((p) => ({
      ...p,
      live: LIVE_PROVIDERS.has(p.id),
      connected: status[p.id]?.connected ?? false,
      connected_at: status[p.id]?.connected_at ?? null,
      account_label: status[p.id]?.account_label ?? null,
    })),
  })
})

/* ------------------------------ slack (live) ------------------------------ */

async function slackApi(token, method, params = {}) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  })
  return res.json()
}

// Poll channels the token can see and turn new messages into notifications.
async function syncSlack(userId) {
  const { rows } = await pool.query(
    `SELECT access_token, state FROM connectors WHERE user_id = $1 AND provider = 'slack' AND connected`,
    [userId],
  )
  const conn = rows[0]
  if (!conn?.access_token) return 0
  const token = conn.access_token
  const state = conn.state || {}

  const list = await slackApi(token, 'conversations.list', {
    types: 'public_channel,private_channel',
    exclude_archived: 'true',
    limit: '200',
  })
  if (!list.ok) return 0
  const channels = (list.channels || []).filter((c) => c.is_member)

  let created = 0
  for (const ch of channels) {
    const cursor = state[ch.id]
    const hist = await slackApi(token, 'conversations.history', {
      channel: ch.id,
      limit: '10',
      ...(cursor ? { oldest: cursor } : {}),
    })
    if (!hist.ok || !hist.messages?.length) continue
    const newest = hist.messages[0].ts
    // First time we see a channel: record the cursor, don't backfill old messages.
    if (cursor) {
      const fresh = hist.messages.filter((m) => m.type === 'message' && !m.subtype && Number(m.ts) > Number(cursor))
      for (const m of fresh.reverse()) {
        await notify(userId, 'slack', `New message in #${ch.name}`, (m.text || '').slice(0, 160))
        created++
      }
    }
    state[ch.id] = newest
  }
  await pool.query(`UPDATE connectors SET state = $2 WHERE user_id = $1 AND provider = 'slack'`, [userId, state])
  return created
}

app.post('/api/connectors/slack/token', requireAuth, async (req, res) => {
  const token = String(req.body.token || '').trim()
  if (!token) return res.status(400).json({ error: 'Paste your Slack token' })
  const auth = await slackApi(token, 'auth.test')
  if (!auth.ok) return res.status(400).json({ error: `Slack rejected the token: ${auth.error || 'invalid'}` })
  const label = `${auth.team} · ${auth.user}`
  await pool.query(
    `INSERT INTO connectors (user_id, provider, connected, connected_at, access_token, account_label, state)
     VALUES ($1, 'slack', true, now(), $2, $3, '{}'::jsonb)
     ON CONFLICT (user_id, provider) DO UPDATE
       SET connected = true, connected_at = now(), access_token = $2, account_label = $3`,
    [req.userId, token, label],
  )
  await notify(req.userId, 'slack', 'Slack connected', `Workspace: ${label}`)
  syncSlack(req.userId).catch((e) => console.error('[slack] initial sync failed:', e.message))
  res.json({ ok: true, account_label: label })
})

app.post('/api/connectors/slack/sync', requireAuth, async (req, res) => {
  try {
    const created = await syncSlack(req.userId)
    res.json({ ok: true, created })
  } catch (err) {
    console.error('[slack] sync failed:', err.message)
    res.status(500).json({ error: 'Slack sync failed' })
  }
})

// Generic connect/disconnect toggle for UI-only providers. Registered after the
// specific slack routes so /slack/token and /slack/sync match their own handlers.
app.post('/api/connectors/:provider/:action', requireAuth, async (req, res) => {
  const { provider, action } = req.params
  if (!PROVIDERS.some((p) => p.id === provider)) return res.status(404).json({ error: 'Unknown provider' })
  if (action !== 'connect' && action !== 'disconnect') return res.status(400).json({ error: 'Invalid action' })
  if (action === 'connect' && LIVE_PROVIDERS.has(provider)) {
    return res.status(400).json({ error: `${provider} connects with a token — use its Connect form` })
  }
  const connected = action === 'connect'
  await pool.query(
    `INSERT INTO connectors (user_id, provider, connected, connected_at, access_token, account_label)
     VALUES ($1, $2, $3, $4, NULL, NULL)
     ON CONFLICT (user_id, provider) DO UPDATE
       SET connected = $3, connected_at = $4,
           access_token = CASE WHEN $3 THEN connectors.access_token ELSE NULL END,
           account_label = CASE WHEN $3 THEN connectors.account_label ELSE NULL END`,
    [req.userId, provider, connected, connected ? new Date() : null],
  )
  const name = PROVIDERS.find((p) => p.id === provider).name
  if (connected) await notify(req.userId, provider, `${name} connected`, `You'll start seeing ${name} notifications here.`)
  res.json({ ok: true, provider, connected })
})

// Background poll for every connected Slack user.
setInterval(async () => {
  try {
    const { rows } = await pool.query(`SELECT user_id FROM connectors WHERE provider = 'slack' AND connected`)
    for (const r of rows) await syncSlack(r.user_id).catch(() => {})
  } catch (err) {
    console.error('[slack] poll loop error:', err.message)
  }
}, 60_000)

/* ------------------------------ notifications ----------------------------- */

app.get('/api/notifications', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, source, title, body, read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
    [req.userId],
  )
  const unread = rows.filter((n) => !n.read).length
  res.json({ notifications: rows, unread })
})

app.post('/api/notifications/read', requireAuth, async (req, res) => {
  await pool.query('UPDATE notifications SET read = true WHERE user_id = $1', [req.userId])
  res.json({ ok: true })
})

/* --------------------- serve the built frontend (prod) -------------------- */

// In production the Express app also serves the compiled React app from dist/,
// so the whole thing runs on one origin (no CORS, cookies just work).
const DIST = join(__dirname, '..', 'dist')
if (existsSync(DIST)) {
  app.use(express.static(DIST))
  // SPA fallback: any non-API GET returns index.html.
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(join(DIST, 'index.html'))
    }
    next()
  })
}

app.listen(PORT, () => console.log(`Ve running on http://localhost:${PORT}`))
