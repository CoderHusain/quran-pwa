# Quran Read Tracker (PWA) — React + Vite + Supabase

Tracks:
- Which **Juz/Surah** was read
- **Who** read it (Full Name + ITS + email)
- **Where** it was read (optional geolocation)
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

## 3) Auth flow

### Sign up page
Fields:
- Full Name
- ITS
- Email
- Password

After signup, user is moved to Sign in and shown:
- "A confirmation email has been sent to you. Please confirm your email..."

### Sign in page
Fields:
- ITS (`Ex: 40239713`)
- Password

Invalid credential errors are shown in **red** below the form.

### Forgot password
On Sign in page, click **Forgot password?**
- Enter email
- User receives reset link to your app
- On opening link, reset page appears
- Enter new password + confirm password

### Password visibility toggle
All password fields include eye toggle (show/hide).

## 4) Run locally

```bash
npm run dev
```

## 5) Build for production

```bash
npm run build
npm run preview
```

## Superadmin / Admin dashboard

Admin users can view all users' logs in-app.

To make your account superadmin:

```sql
update public.profiles
set is_admin = true
where its = 'YOUR_ITS_HERE';
```

Sign out and sign in again.

## PWA install

- Chrome/Edge/Android: app shows **Install App** button when install is available.
- If not shown, check browser address bar for install icon.
- iPhone (Safari): Share → **Add to Home Screen**.

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
