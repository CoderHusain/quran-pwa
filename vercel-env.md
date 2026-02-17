# Vercel environment variables required

Add these in **Vercel → Project → Settings → Environment Variables**:

- `VITE_SUPABASE_URL` = your Supabase project URL (e.g. `https://xyzcompany.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon public key

Then **Redeploy** the latest deployment.

If app still shows blank due old PWA cache:
1. Open browser dev tools → Application → Service Workers → Unregister
2. Hard refresh (Ctrl/Cmd + Shift + R)
3. Reload app
