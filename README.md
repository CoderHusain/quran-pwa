# Quran Read Tracker (PWA) — React + Vite + Supabase

Tracks:
- Which **Juz/Surah** was read
- **Who** read it (authenticated user)
- **Where** it was read (optional geolocation)
- How many times each Juz was logged

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

## 3) Run locally

```bash
npm run dev
```

## 4) Build for production

```bash
npm run build
npm run preview
```

## Notes

- PWA is enabled with `vite-plugin-pwa`.
- Location is only captured after user permission.
- RLS policies ensure each user only reads/writes their own logs.

## Next upgrades (optional)

- Admin dashboard (view logs by all users)
- Reverse geocoding (lat/lng → place name)
- Offline queue/sync for logs
- Multi-language UI
