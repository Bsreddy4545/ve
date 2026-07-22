# Deploying Ve to the cloud

The app deploys as **one Render web service** (Express serves the API and the built
React app) backed by a **Neon** Postgres database. Both have free tiers with no
credit card required.

Result: a public URL like `https://ve.onrender.com` where login, tasks, files,
connectors, and notifications all work for real.

---

## 1. Create the database (Neon)

1. Go to https://neon.tech and sign up (GitHub login is easiest).
2. Create a project — any name, e.g. **ve**. Pick a region near you.
3. On the project dashboard, copy the **connection string**. It looks like:
   `postgresql://user:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`
4. Keep this handy for step 2.

The app auto-creates its tables on first boot, so there's nothing else to set up.

---

## 2. Deploy the app (Render)

1. Go to https://render.com and sign up (GitHub login).
2. **New → Blueprint**, and connect the repo `Bsreddy4545/ve`. Render reads
   `render.yaml` and proposes the `ve` web service. Click **Apply**.
3. When prompted for the env vars marked "sync: false", fill in:
   - `DATABASE_URL` → the Neon connection string from step 1
   - `GOOGLE_CLIENT_ID` → `467171630225-1ap1kl19abkp6unsd9uev80jnn6m73lp.apps.googleusercontent.com`
   - `VITE_GOOGLE_CLIENT_ID` → the same client ID
   - `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `MAIL_FROM` → optional; set them to enable task emails
     (use a Google **App Password**, not your account password)
   - `JWT_SECRET` is generated automatically — leave it.
4. Click **Create** / **Deploy**. First build takes a few minutes. When it's live,
   Render shows your URL (e.g. `https://ve.onrender.com`).

---

## 3. Allow the new URL in Google sign-in

1. Open https://console.cloud.google.com/apis/credentials → your OAuth Web client.
2. Under **Authorized JavaScript origins**, add your Render URL exactly, no trailing
   slash: `https://ve.onrender.com`
3. Save. Sign-in on the live app now works.

---

## Notes & limits (free tier)

- **Cold starts:** the free web service sleeps after ~15 min idle; the first request
  then takes ~30s to wake. The Slack 60s poll also pauses while asleep.
- **Uploaded files are ephemeral:** Render's free filesystem resets on each deploy/
  restart, so uploaded files don't persist. Task/connector/notification data is safe
  in Neon. To make files permanent, add object storage (Cloudflare R2 / S3) — ask and
  I'll wire it in.
- **Auto-deploy:** every push to `main` triggers a new Render build automatically.
- The old GitHub Pages site (`bsreddy4545.github.io/ve`) stays as a static preview;
  the Render URL is the real, working app.
