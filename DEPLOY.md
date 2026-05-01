# Deploying to Vercel

The web app is deployed to Vercel; the worker stays local (or moves to Railway/Fly later).

## Quickest path (CLI)

```bash
cd web
npx vercel --prod
```

You'll be prompted to log in (browser opens), name the project, confirm framework (Next.js auto-detected). After the first deploy, future deploys are one command.

Or just double-click `deploy-vercel.bat` from the project root.

## Environment variables to set in Vercel

After first deploy, go to **Project → Settings → Environment Variables** and add:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cnxzztgckhnbypkeaxzk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (from `web/.env.local`) |
| `SUPABASE_SERVICE_ROLE_KEY` | (from `web/.env.local`) |
| `ALERT_EMAIL_TO` | `aps@evit-org.com` |
| `ALERT_EMAIL_FROM` | `alerts@employtheagent.com` |
| `CRON_SECRET` | (long random string — same as `web/.env.local`) |
| `RESEND_API_KEY` | (optional — for system-down email) |
| `HEARTBEAT_THRESHOLD_MINUTES` | `5` |

⚠️ The `/api/dev-login` route is gated by `NODE_ENV !== "development"` — it'll be disabled in production automatically.

## After deploy: update Supabase Auth URL

Once you have a Vercel URL like `https://employ-the-agent-platform.vercel.app`:

1. Go to https://supabase.com/dashboard/project/cnxzztgckhnbypkeaxzk/auth/url-configuration
2. Update **Site URL** to your Vercel URL
3. Add `https://your-vercel-url.vercel.app/auth/callback` to **Redirect URLs**

## Worker (separate deploy)

The worker doesn't run on Vercel (no continuous processes). For demo purposes it can stay running locally on your machine. For production, deploy it to Railway:

```bash
cd worker
railway init
railway up
```

Set the worker's env vars in the Railway dashboard (same as `worker/.env`).
