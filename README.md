# Unbuilt

Personal lead-finding tool for a freelance web designer. Drop a pin on a map,
scan the area with the Google Places API, and score each nearby business on how
badly it needs a website. Track leads, then generate and publish a one-page site
for the ones you close.

**Not** a website-builder product — it's a private prospecting tool for one user.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Postgres on Neon (`drizzle-orm`, `drizzle-kit`)
- Mapbox GL JS for the map (falls back to a schematic map with no token)
- Google Places API (New) — Nearby Search, field-masked to the Enterprise SKU
- Gemini (free tier) for site copy, behind a provider interface
- Deployed on Vercel

## Local development

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, ENCRYPTION_KEY, AUTH_SECRET
npm run db:push              # create tables on the database in DATABASE_URL
npm run dev
```

Open http://localhost:3000 — you'll hit the PIN gate. With no `APP_PIN` set and
no PIN in the DB, the unlock screen lets you set one.

### Environment variables

| Var | Required | Notes |
|-----|----------|-------|
| `DATABASE_URL` | yes | Neon pooled connection string |
| `ENCRYPTION_KEY` | yes | 32-byte base64 — encrypts API keys stored in the DB |
| `AUTH_SECRET` | yes | 32-byte base64 — signs the session cookie |
| `APP_PIN` | no | first-run PIN; ignored once a PIN is set in the You tab |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | no | `pk.*` token; can also be set in the You tab |
| `GOOGLE_PLACES_API_KEY` | no | overrides the key set in the You tab |
| `GEMINI_API_KEY` | no | overrides the key set in the You tab |

Generate the two secrets:

```bash
node -e "console.log('ENCRYPTION_KEY='+require('crypto').randomBytes(32).toString('base64'));console.log('AUTH_SECRET='+require('crypto').randomBytes(32).toString('base64'))"
```

## Without keys

The app runs fully in **demo mode** until you add keys in the **You** tab:

- No Places key → scans return synthetic businesses (deterministic per location)
- No Gemini key → Build fills templates with hand-written fallback copy
- No Mapbox token → the map is a schematic grid (still supports drop/scan/pins)

## How scoring works

`lib/scoring/score.ts` — pure function, unit-tested (`npm test`).

| Signal | Default points |
|--------|---------------:|
| No website listed | +50 |
| "Website" is a social/placeholder link | +20 |
| Fewer than 5 photos | +10 |
| Rating ≥ 4.0 with < 20 reviews | +10 |
| Category in your priority list | +10 |

Capped at 100. Weights and the priority category list are editable in the You tab.

## Published sites

"Live" sites are served by this same app at `/s/<slug>` (no per-site Vercel
deploy). That route is public — it bypasses the PIN gate. To point a client's
domain at one, add the domain in Vercel and route it to `/s/<slug>` yourself.

## Data model

`businesses` (one row per Google place) → `leads` (1:1, status + notes) →
`sites` (0..1, template + content JSON + quote price + status). Plus `scans`
(quota history) and a single-row `settings` table.
