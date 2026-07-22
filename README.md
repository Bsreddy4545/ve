# Ve

Ve's app, built with React, TypeScript and Vite, with an Express + PostgreSQL
backend for email/password and Google sign-in.

## Getting started

```bash
npm install
npm run dev:all   # starts the web app (5173) and the API (3001) together
```

The app runs at http://localhost:5173/ and the API at http://localhost:3001.

## Scripts

- `npm run dev` — start the Vite dev server only
- `npm run server` — start the API only
- `npm run dev:all` — start both web + API together
- `npm run build` — type-check and build for production
- `npm run lint` — run Oxlint
- `npm run preview` — preview the production build

## Environment

Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL` — PostgreSQL connection string (local default:
  `postgresql://<user>@localhost:5432/ve`)
- `JWT_SECRET` — any long random string for signing session cookies
- `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` — the OAuth client ID (same value
  for both; server verifies tokens, client renders the button)

## Google sign-in setup

The OAuth client is configured in the
[Google Cloud Console](https://console.cloud.google.com/apis/credentials). Under
the Web application client, **Authorized JavaScript origins** must list each
origin the app is served from, with no path and no trailing slash:

- `http://localhost:5173` — local dev
- `http://localhost`
- `https://bsreddy4545.github.io` — live site

A missing or mistyped origin (trailing slash, `https` instead of `http` for
localhost) causes `Error 400: origin_mismatch`. Changes can take a few minutes
to propagate.

> Note: the GitHub Pages deployment serves the static frontend only. Full login
> requires the API and database, which currently run locally — sign-in works
> end-to-end on localhost, not yet on the live site.

## Where user data is stored

Users are stored in the local PostgreSQL `ve` database, table `users`. Inspect
it with:

```bash
psql -d ve -c "SELECT id, email, name, created_at, last_login FROM users ORDER BY id;"
```

Passwords are stored bcrypt-hashed, never in plain text.
