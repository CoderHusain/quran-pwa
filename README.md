# Quran Read Tracker (PWA) — React + Vite + Supabase

Tracks:
- Which **Juz/Surah** was read
- **Who** read it (Full Name + ITS)
- **Where** it was read (optional geolocation)
- How many times each Juz was logged
- Admin dashboard: **which Juz was read by whom** across all users

## 1) Setup

```bash
npm install
cp .env.example .env
```

Add your Supabase values in `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 2) Create DB schema

Run `supabase-schema.sql` in Supabase SQL Editor.

## 3) Auth mode (ITS + password)

Supabase email/password auth is used under the hood.
This app maps ITS to an internal email format:

`ITS@its.local`

So users sign in with:
- ITS
- Password

And during signup they provide:
- Full Name
- ITS
- Password

## 4) Run locally

```bash
npm run dev
```

## 5) Build for production

```bash
npm run build
npm run preview
```

## Admin dashboard

Admin users can view all logs in-app.
To make someone admin, set `profiles.is_admin = true` for that user's row in Supabase.

## Deploy (Vercel)

1. Import repo in Vercel
2. Framework: Vite (auto-detected)
3. Add env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

`vercel.json` is included for SPA rewrites.

## Deploy (Netlify)

1. New site from Git
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

`netlify.toml` is included for SPA redirects.

## Notes

- PWA is enabled with `vite-plugin-pwa`.
- Location is captured only after user permission.
- RLS + admin checks protect data access.
