# Changelog

All notable changes to the Ve app are documented here.

## 2026-07-22

### Added
- Google sign-in ("Continue with Google") on the login page, verified server-side
  with the Google OAuth client ID and stored in the database.
- `CHANGELOG.md` (this file).
- Google client ID passed to the GitHub Pages build so the button renders on the
  live site.

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
