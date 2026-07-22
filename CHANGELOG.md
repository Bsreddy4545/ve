# Changelog

All notable changes to the Ve app are documented here.

## 2026-07-22

### Added
- **Cloud deploy setup** — Express now serves the built React app in production
  (single origin, secure cookies, `trust proxy`), so the whole stack runs as one
  service. Added `render.yaml` (Render blueprint) and `DEPLOY.md` with step-by-step
  Neon (Postgres) + Render + Google OAuth instructions. New `start` script.
- **Slack (live integration)** — connect with a Slack app bot token; Ve verifies it
  via `auth.test`, then polls channels the bot is in every 60s and turns new messages
  into real notifications. "Sync now" button for on-demand refresh. Connectors UI shows
  a LIVE badge and a token form for Slack; other providers remain UI toggles.
- **Task emails** — creating a task emails the registered address (via nodemailer;
  configure `GMAIL_USER` + `GMAIL_APP_PASSWORD` in `.env`). Skips gracefully and
  never blocks task creation when email is not configured.
- **Home / Overview** section (now the default landing) — greeting, live counts
  (open tasks, files, connected tools, unread alerts), email status, and quick actions.
- `/api/summary` endpoint for the overview counts.

### Added (dashboard)
- **Dashboard** shown after sign-in, with a collapsible sidebar and six sections:
  Tasks, Files, Gmail, Meetings, Notifications, Connectors.
- **Tasks** — add / complete / delete, with priority and due date, stored in Postgres.
- **Files** — upload any file with categories (galleries, documents, links, other),
  add link entries, download, and delete; files stored on disk + metadata in Postgres.
- **Connectors** — connect/disconnect cards for Google, Gmail, Calendar/Meet, Outlook,
  Slack, ClickUp, Jira, WhatsApp, Instagram, Facebook; state saved per user.
- **Notifications** hub — unread badge in the sidebar; connecting a tool posts a
  notification. Backend `notifications` table feeds the panel.
- **Gmail / Meetings** sections render a designed inbox/schedule preview, gated behind
  a "Connect" screen until the provider's OAuth is live.
- Backend: auth middleware and REST endpoints for tasks, files (multer uploads),
  connectors, and notifications.
- Google sign-in ("Continue with Google") on the login page, verified server-side
  with the Google OAuth client ID and stored in the database.
- `CHANGELOG.md` (this file).
- Google client ID passed to the GitHub Pages build so the button renders on the
  live site.

### Docs
- Documented required Google OAuth JavaScript origins (`http://localhost:5173`,
  `http://localhost`, `https://bsreddy4545.github.io`) and the fix for
  `Error 400: origin_mismatch` in the README.
- README: environment setup, `dev:all` workflow, and how to inspect stored users.

## 2026-07-21

### Added
- Sign-in / sign-up page with email + password, show/hide password toggle, and
  inline error messages.
- Express API (`server/index.js`): register, login, Google token verification,
  session via httpOnly JWT cookie, `/api/me`, logout.
- PostgreSQL storage: `users` table (auto-created) in the local `ve` database;
  passwords hashed with bcrypt.
- Vite dev proxy (`/api` → `localhost:3001`) and `npm run dev:all` to start web
  and API together.
- GitHub Pages deployment via GitHub Actions on every push to `main`.
- Rebranded the Vite starter to Ve: new landing page, favicon, title, package
  name, and README; removed template demo assets.

### Removed
- Vite/React starter boilerplate (demo logos, counter demo sections, starter
  links).
