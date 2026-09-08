# Unbuilt — build status

Built overnight while you were asleep. **Everything is done except the final
Vercel deploy, which needs you to log in once** (Vercel CLI has no non-interactive
login and the Vercel connector can't set env vars). ~3 minutes in the morning.

---

## ✅ Done

| | |
|---|---|
| Next.js 15 + TS + Tailwind app | all 5 tabs built |
| Neon Postgres | provisioned + schema pushed + verified |
| Scoring engine | pure function, **9/9 unit tests pass** (`npm test`) |
| Places API (New) integration | Nearby Search, field-masked, tiling + quota estimate |
| Demo mode | works with **zero keys** — synthetic businesses, templated copy |
| PIN gate | middleware + `/unlock`; `APP_PIN=246810` bootstraps it |
| Build tab | 6 templates, AI/mock copy autofill, inline editor, photo manager, quote price, publish |
| Published sites | path-based at `/s/<slug>`, public (bypasses PIN) |
| CSV export | filtered list → `/api/export` |
| Production build | passes with **and without** env vars |
| Local end-to-end smoke test | scan → score → lead → site → publish → public page → export → settings ✓ |
| Git | committed locally (no remote yet) |

Test data was cleaned out — the database is empty and ready.

---

## ⏳ One step left: deploy

Code is pushed to **https://github.com/im-alok74/Unbuilt** (`main`).

**Fastest path — import on Vercel (no CLI):**

1. https://vercel.com/new → import **im-alok74/Unbuilt**
2. Expand **Environment Variables** and add these four (values are in `.env.local`):
   - `DATABASE_URL`
   - `ENCRYPTION_KEY`
   - `AUTH_SECRET`
   - `APP_PIN` = `246810`
3. Framework auto-detects as Next.js. Click **Deploy**.

Every future `git push` to `main` then auto-deploys.

**Alternative — CLI:** `npx vercel login` then `.\scripts\deploy.ps1`
(`scripts/deploy.sh` on bash) — reads `.env.local`, pushes the env vars, deploys.

---

## ☀️ Morning checklist (in the app, after deploy)

Open the deployed URL → unlock with **246810** → go to the **You** tab:

1. **Set your own PIN** (App lock → Change PIN). Once set, `246810` stops working.
2. **Priority categories** — I seeded restaurants, cafes, salons, gyms, contractors,
   dentists, doctors, etc. (19 Google Places types). Edit to taste.
3. **Google Places API (New) key** — paste it in. Until then every scan uses demo
   data. (Setup steps are in our earlier chat / `README.md` doesn't repeat them.)
4. **Mapbox public token** (`pk.…`) — paste it in for the real tilted 3D map.
   Without it the map is a working schematic grid.
5. **Gemini API key** (optional) — for AI-written site copy. Without it the Build
   tab uses solid hand-written fallback copy per business type.

Everything is editable later; nothing is required to start clicking around.

---

## Accounts / resources created on your accounts

- **Neon** project `unbuilt` (org "Alok", region `ap-southeast-1` Singapore —
  Neon has no India region). Database `unbuilt`, role `unbuilt_owner`.
  Connection string is in `.env.local`.
- **Vercel**: nothing yet — `scripts/deploy.ps1` creates the project.
- **Google Cloud / Mapbox**: nothing — you're setting those up.

---

## Notes & deliberate limitations

- **Scan cost**: one Nearby Search (Enterprise SKU) call per ≤1.5 km scan;
  larger radii fan out into a grid and the Scan tab warns you before a heavy one.
  The You-tab quota meter counts live calls this month — the free-tier cap in it
  (`1000`) is a **placeholder**; confirm the real number in Google Cloud →
  Places API (New) → Quotas and tell me to update it.
- **Practical max score is 80**, not 100 (no-website +50 and social-only +20 are
  mutually exclusive). Rebalance weights in You if you want the full range.
- **Photo upload** in Build is URL-only for now — direct file upload needs blob
  storage (Vercel Blob), which I left out. You can pull photos straight from the
  Google listing, which covers most cases.
- **Published sites** are served by this app at `/s/<slug>`, not deployed
  separately. To put a client's domain on one: add the domain in Vercel and point
  it at that path yourself. No per-site Vercel projects, no custom-domain
  automation, no billing — as specified.
- **Places-data-on-Mapbox** and **>30-day caching** sit in a gray area of
  Google's ToS. Low risk for personal use; the app re-scans stale rows after 30
  days and shows a "stale" badge.
- `next@15.5.25` (patched; the CVE in the version I first pulled is fixed here).

## Data model

`businesses` (1 row per Google place) → `leads` (1:1, status + notes) →
`sites` (0..1). Plus `scans` (quota history) and single-row `settings`
(keys encrypted with AES-256-GCM via `ENCRYPTION_KEY`).

## Handy commands

```bash
npm run dev          # local dev on :3000
npm test             # scoring unit tests
npm run db:push      # re-sync schema to DATABASE_URL
npm run db:studio    # browse the DB
```
