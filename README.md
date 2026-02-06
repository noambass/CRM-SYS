# CRM (React + Vite + Supabase)

This project uses Supabase for Auth, Database, and Storage.

## Local development
1) Install dependencies: `npm install`
2) Create `.env.local` with:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3) Run dev server: `npm run dev`

## Migrations (manual)
Run the SQL files in `supabase/` via Supabase SQL Editor. See `docs/` for post‑migration checks.
