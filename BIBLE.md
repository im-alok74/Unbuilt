# Unbuilt — Sales Team Dashboard Bible

> Single source of truth for the Unbuilt sales dashboard rebuild.
> Every decision, schema, API, screen, and constraint lives here.

---

## 1. What This Is

A web-dev agency sales tool. The admin (you) and manager scrape/import leads — businesses that need websites. Sales reps pitch those businesses. When a client onboards, the rep earns **10–20% commission** on the delivered project. The rep reports to the manager, the manager reports to the admin.

**Not a SaaS product.** Internal tool for one agency, 15–20 reps, distributed as a PWA wrapped in a TWA APK for Android.

---

## 2. Roles & Hierarchy

```
Admin (you)
  └── Manager (1, possibly 2 later)
        └── Sales Reps (15–20, all Android)
```

| Role | Can do |
|------|--------|
| **Admin** | Everything the manager can + create/deactivate managers + set commission rates + view all financials + configure API keys + system settings |
| **Manager** | Scrape leads (Google Places) + add leads manually + import Excel + assign leads to reps + write/generate pitches + approve rep requests + manage reps + view team dashboard + set daily targets |
| **Rep** | View assigned leads only + update status + log call outcomes + add notes + request leads + see own commission + one-tap Call/WhatsApp |

---

## 3. Free-Tier Budget

### 3.1 Google Places API (New)

- **1,000 free calls/month** (Enterprise SKU for fields like `website`, `phone`, `rating`)
- Set a **daily quota cap of 35** in Google Cloud Console — physically prevents overspend even if code has a bug
- Only the manager can trigger scans; reps cannot spend API calls
- Budget counter shown to manager: warns at 700, blocks at 900, reserves 100 for manual lookups
- Each Nearby Search call returns up to 20 businesses → 1,000 calls ≈ 8,000–12,000 unique leads after overlap
- Existing tiling system (`lib/places/tiles.ts`) deduplicates — areas scanned in the last 60 days are skipped

### 3.2 Other Free Services

| Service | Free tier | Used for |
|---------|-----------|----------|
| **Neon Postgres** | 0.5 GB storage, 5 GB network transfer/month, 190 compute-hours | All data (see 3.4) |
| **Vercel** (Hobby) | 100 GB bandwidth, serverless functions | Hosting (see ToS note below) |
| **Mapbox** | 50,000 map loads/month | Map view (manager only) |
| **Gemini** (`gemini-flash-lite-latest`) | 1,500 requests/day | Pitch generation, site copy |
| **Google PageSpeed API** | Unlimited | Website audit scores |
| **Overpass (OpenStreetMap)** | Unlimited | Supplement Places data for free |
| **Web Push (VAPID)** | Free forever | Notifications to reps |

### 3.4 Neon network cap (learned the hard way)

On 2026-09-26 the `unbuilt` project hit Neon's **5 GB/month network transfer cap** (5.59 GB used) and every query started failing with "exceeded the quota" until the monthly reset on Oct 1. Cause: list queries selected every column, including a huge `raw_json` that nothing reads, for every business, on every map refresh. Fixed in code:

- `raw_json` is no longer selected or written
- list queries omit photos, hours and score breakdown (only the detail view loads them)
- sorting, filtering and paging happen in SQL (`limit`, default 2000, the pool pages by 100)

Rules going forward: never `select *` a business list, and check usage in the Neon console (Project → Usage) now and then.

### 3.3 Vercel ToS Warning

Vercel Hobby plan **forbids commercial/team use**. Options:
1. **Stay on Vercel** for now (low risk for internal tool, no public traffic)
2. **Migrate to Cloudflare Pages + Workers** (free, allows commercial, good perf in India)
3. **Railway** free trial → $5/month if needed

Decision: stay on Vercel until the team outgrows it or gets flagged. Revisit at 20+ active users.

---

## 4. Database Schema

### 4.1 Existing Tables (keep as-is)

- `businesses` — place data from Google, scored 0–100
- `scans` — scan history with tile coordinates, API call counts
- `settings` — encrypted API keys, scoring weights, mapbox token
- `sites` — generated one-page websites for won deals
- `leads` — lead status per business (add columns below)

### 4.2 New Tables (planned design; see section 30 for what was actually built)

```sql
-- ─── Users ─────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'rep');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT NOT NULL UNIQUE,       -- login identifier
  display_name  TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'rep',
  password_hash TEXT NOT NULL,              -- scrypt (reuse lib/crypto.ts)
  phone         TEXT,                       -- manager can WhatsApp them
  commission_pct INTEGER NOT NULL DEFAULT 10, -- 10–20%, set by admin
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Leads: add assignment + pipeline ──────────────────
ALTER TABLE leads
  ADD COLUMN assigned_to      UUID REFERENCES users(id),
  ADD COLUMN pipeline_status  TEXT NOT NULL DEFAULT 'new',
    -- new → contacted → demo_sent → quoted → negotiating → won → lost
  ADD COLUMN next_follow_up   TIMESTAMPTZ,
  ADD COLUMN pitch_text       TEXT,         -- manager writes or Gemini generates
  ADD COLUMN project_value    INTEGER,      -- INR, filled on won
  ADD COLUMN commission_paid  BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── Lead Activity Log ─────────────────────────────────
CREATE TABLE lead_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL,
    -- called, whatsapped, emailed, status_change, note, follow_up_set,
    -- assigned, reassigned, pitch_sent, demo_sent, won, lost
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX lead_activity_lead_idx ON lead_activity(lead_id);

-- ─── Lead Requests (rep → manager) ─────────────────────
CREATE TABLE lead_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by    UUID NOT NULL REFERENCES users(id),
  niche           TEXT NOT NULL,          -- "gyms", "salons near MG Road"
  area            TEXT,                   -- free-text location
  quantity        INTEGER DEFAULT 20,
  status          TEXT NOT NULL DEFAULT 'pending',
    -- pending → approved → scanning → done → rejected
  estimated_calls INTEGER,
  manager_note    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ
);

-- ─── Excel Import Templates ────────────────────────────
CREATE TABLE import_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  column_map  JSONB NOT NULL,  -- { "Business Name": "name", "Phone": "phone", ... }
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── API Budget Tracking ───────────────────────────────
CREATE TABLE api_budget (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month       TEXT NOT NULL UNIQUE,       -- "2026-09"
  calls_used  INTEGER NOT NULL DEFAULT 0,
  limit_val   INTEGER NOT NULL DEFAULT 1000,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Do-Not-Contact List ───────────────────────────────
CREATE TABLE dnc (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT UNIQUE,                -- normalized
  business_id UUID REFERENCES businesses(id),
  reason      TEXT,
  added_by    UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.3 Indexes

- `leads(assigned_to)` — rep's lead list
- `leads(next_follow_up)` — today's follow-ups query
- `leads(pipeline_status)` — pipeline counts
- `businesses(phone)` — Excel dedupe
- `dnc(phone)` — fast DNC lookup

---

## 5. Auth System

### 5.1 Replace PIN with Username + Password

Current: single PIN → JWT with `{ ok: true }`.
New: username/password → JWT with `{ userId, role, username }`.

```typescript
// lib/auth.ts — new token shape
export async function createSessionToken(user: {
  id: string; role: string; username: string;
}): Promise<string> {
  return new SignJWT({ userId: user.id, role: user.role, sub: user.username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function getSession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload as { userId: string; role: string; sub: string };
  } catch { return null; }
}
```

### 5.2 Password Hashing

Reuse `lib/crypto.ts` — `hashPin` / `verifyPin` already use scrypt. Rename to `hashPassword` / `verifyPassword`. Remove the 4–8 digit constraint; allow any string 6+ chars.

### 5.3 Middleware Changes

```typescript
// middleware.ts
const PUBLIC_PREFIXES = ["/login", "/api/login", "/s/", "/api/health", "/api/photo"];
// Everything else requires a valid session
// /api/admin/* routes additionally check role === "admin"
// /api/manager/* routes check role === "admin" || "manager"
```

### 5.4 First-Run Bootstrap

The admin account is seeded from environment variables:
```
ADMIN_USERNAME=alok
ADMIN_PASSWORD=<chosen at deploy>
```
On first request to `/api/login`, if no users exist, create the admin from env vars. After that, the admin creates managers and reps through the UI.

---

## 6. API Routes

### 6.1 Auth
| Method | Path | Role | Purpose |
|--------|------|------|---------|
| POST | `/api/login` | public | Username + password → session cookie |
| POST | `/api/logout` | any | Clear session cookie |

### 6.2 Users (admin + manager)
| Method | Path | Role | Purpose |
|--------|------|------|---------|
| GET | `/api/users` | admin, manager | List team members (manager sees own reps only) |
| POST | `/api/users` | admin, manager | Create a rep (manager) or manager (admin) |
| PATCH | `/api/users/[id]` | admin, manager | Update rep info, commission %, active status |
| DELETE | `/api/users/[id]` | admin | Deactivate user (soft delete) |

### 6.3 Leads
| Method | Path | Role | Purpose |
|--------|------|------|---------|
| GET | `/api/leads` | any | List leads (reps see only assigned; manager/admin see all) |
| PATCH | `/api/leads/[id]` | any | Update status, notes, follow-up (rep can only update own) |
| POST | `/api/leads/[id]/assign` | manager, admin | Assign or reassign a lead |
| POST | `/api/leads/bulk-assign` | manager, admin | Round-robin or manual bulk assign |
| GET | `/api/leads/today` | rep | Today's follow-ups + new leads |
| GET | `/api/leads/pipeline` | manager, admin | Pipeline view with counts per stage |

### 6.4 Lead Activity
| Method | Path | Role | Purpose |
|--------|------|------|---------|
| GET | `/api/leads/[id]/activity` | any | Activity log for a lead |
| POST | `/api/leads/[id]/activity` | any | Log a call, note, or outcome |

### 6.5 Lead Requests
| Method | Path | Role | Purpose |
|--------|------|------|---------|
| GET | `/api/requests` | manager, admin | Pending requests from reps |
| POST | `/api/requests` | rep | Request leads by niche/area |
| PATCH | `/api/requests/[id]` | manager, admin | Approve/reject/mark done |

### 6.6 Scanning (manager only)
| Method | Path | Role | Purpose |
|--------|------|------|---------|
| POST | `/api/scan` | manager, admin | Run a Places scan (budget-checked) |
| GET | `/api/scan` | manager, admin | Estimate cost |
| GET | `/api/budget` | manager, admin | Current month's API call usage |

### 6.7 Excel Import
| Method | Path | Role | Purpose |
|--------|------|------|---------|
| POST | `/api/import` | manager, admin | Receive parsed rows from browser, dedupe, insert |
| GET | `/api/import/templates` | manager, admin | Saved column mappings |
| POST | `/api/import/templates` | manager, admin | Save a column mapping |
| GET | `/api/export` | manager, admin | Export leads to Excel/CSV |

### 6.8 Pitch Generation
| Method | Path | Role | Purpose |
|--------|------|------|---------|
| POST | `/api/leads/[id]/pitch` | manager, admin | Generate pitch with Gemini (cached per lead) |

### 6.9 Existing (keep)
- `/api/businesses`, `/api/businesses/[id]`
- `/api/sites`, `/api/sites/[id]`, `/api/sites/[id]/generate`, `/api/sites/[id]/publish`
- `/api/settings`, `/api/config`, `/api/quota`
- `/api/photo` (photo proxy, public)

---

## 7. Screens

### 7.1 Login (`/login`)
Replace `/unlock`. Username + password form. No PIN.

### 7.2 Admin Screens

**Dashboard** (`/dashboard`)
- Total leads, pipeline funnel, conversion rate
- Revenue: total project value, commission owed/paid
- Budget meter: API calls used this month
- Per-rep leaderboard: leads assigned, contacted, won, revenue

**Team Management** (`/team`)
- List of managers and reps
- Add/edit user: name, username, password, phone, role, commission %
- Activate/deactivate
- Daily target setting

**System Settings** (`/settings`)
- API keys (Places, Gemini, Mapbox)
- Scoring weights, priority categories
- Default commission rate
- Default quote range

### 7.3 Manager Screens

**Scan Studio** (`/scan`)
- Map with area selection
- Niche picker (from priority categories)
- Radius slider
- Budget estimate before running
- Results appear on map, auto-scored

**Import** (`/import`)
- Drag-drop Excel file
- Column mapper (save as template)
- Preview table with dedupe warnings
- Bulk assign after import

**Lead Pool** (`/leads`)
- All leads, filterable by status/score/category/assignment
- Bulk select → assign to rep
- Click lead → detail view with pitch, activity log, demo site link

**Assign** (`/assign`)
- Pick rep → pick leads (or round-robin)
- Territory map view (optional, later)

**Requests Queue** (`/requests`)
- Pending lead requests from reps
- Approve (shows estimated API cost) → triggers scan → auto-assigns results to requester

**Team Dashboard** (`/team-dashboard`)
- Per-rep: leads assigned, contacted today, demos sent, quotes, wins
- Stale lead alerts (untouched > 3 days)
- Weekly/monthly trend charts

### 7.4 Rep Screens (the APK experience)

**Today** (`/today`) — home screen
- Target ring: X of Y contacts today
- Follow-ups due today (sorted by time)
- New leads just assigned
- Quick stats: this week's contacts, quotes, wins

**Lead Card** (`/leads/[id]`)
- Business info: name, category, address, rating, photo
- Score badge with breakdown
- **Pitch card** from manager: opening line, angle, objections, price range
- One-tap buttons: Call, WhatsApp (prefilled message)
- Quick outcome: No answer / Call back / Interested / Not interested / Wrong number
- Notes field (auto-saves)
- Follow-up date picker
- Pipeline status selector: New → Contacted → Demo Sent → Quoted → Negotiating → Won → Lost
- Activity timeline
- Demo site link (if generated)

**My Leads** (`/my-leads`)
- All assigned leads in a clean list
- Filter by pipeline status
- Sort by follow-up date, score, or recency
- Search by business name

**Request Leads** (`/request`)
- Form: niche, area, how many
- Status of past requests

**My Stats** (`/stats`)
- Leads assigned / contacted / won
- Commission earned (project_value × commission_pct)
- Leaderboard position

---

## 8. Lead Pipeline

```
New → Contacted → Demo Sent → Quoted → Negotiating → Won → Lost
```

| Stage | Meaning | Who updates |
|-------|---------|-------------|
| New | Just assigned, not touched | System |
| Contacted | Rep called or WhatsApped | Rep |
| Demo Sent | One-page site link shared | Rep |
| Quoted | Price sent to the business | Rep |
| Negotiating | Back and forth on terms | Rep |
| Won | Client onboarded, project started | Rep (manager confirms) |
| Lost | Not interested or went elsewhere | Rep |

### Won → Commission Flow

1. Rep marks lead as "Won" and enters `project_value` (INR)
2. Manager confirms the win (status stays "Won" or reverts)
3. Commission = `project_value × (user.commission_pct / 100)`
4. Admin marks `commission_paid = true` after payout

---

## 9. Commission System

- Default: **10%** of delivered project value
- Configurable per-rep: **10–20%** (admin sets, manager can recommend)
- Displayed to the rep in their stats: earned vs paid
- Manager dashboard shows: total commission owed across team
- No payment processing — just tracking. Admin pays manually and marks paid.

Example: Rep wins a 25,000 INR project at 15% commission = 3,750 INR earned.

---

## 10. Excel Import

### 10.1 Flow
1. Manager drags `.xlsx` file onto the import page
2. File is parsed **in the browser** using SheetJS (`xlsx` package, ~200KB)
3. UI shows column headers → manager maps them to fields (name, phone, category, address, notes)
4. Mapping can be saved as a template for reuse
5. Preview table shows rows with:
   - Duplicate warnings (matched by normalized phone number)
   - DNC matches (flagged red, excluded)
6. Manager clicks "Import" → rows sent to `/api/import` as JSON
7. Server deduplicates, inserts into `businesses` + `leads`
8. Manager can immediately bulk-assign the imported batch

### 10.2 No File Storage
The Excel file never hits the server. Parsing is client-side. Only structured JSON is sent to the API. This keeps Vercel happy (no file uploads, no blob storage needed).

### 10.3 Export
Manager can export any filtered lead list as `.csv` (already exists at `/api/export`).

---

## 11. Pitch System

### 11.1 Manual Pitch
Manager writes a pitch card for a lead:
- **Angle:** "4.6★ from 12 reviews, no website — leaving money on the table"
- **Opening line:** "Hi, I noticed your salon has great reviews but no website..."
- **Likely objections:** "Too expensive" → "We start at ₹2,500"
- **Quote range:** ₹2,000–₹5,000
- **Demo link:** auto-populated if a site is generated

### 11.2 AI Pitch (Gemini)
Manager clicks "Generate pitch" on a lead. Gemini receives:
- Business name, category, rating, review count, website status, score breakdown
- Scoring context ("no website" or "social only")
- Manager's brief (optional)

Returns a structured pitch card. Cached in `leads.pitch_text` — never regenerated unless manager clicks again.

**Cost:** 0 API calls (Gemini free tier). Cached per lead.

---

## 12. Notifications (Web Push)

### 12.1 What Gets Pushed
| Event | To | Message |
|-------|-----|---------|
| New lead assigned | Rep | "New lead: Sunrise Bakery (Score 70)" |
| Follow-up due | Rep | "Follow up: Glamour Salon at 10am" |
| Lead request approved | Rep | "Your request for 20 gyms was approved — 18 new leads assigned" |
| Lead won (confirmed) | Rep + Manager | "Sunrise Bakery marked as Won — ₹25,000 project" |
| Stale lead alert | Manager | "3 leads untouched > 3 days" |
| Budget warning | Manager | "API budget at 70% (700/1000)" |

### 12.2 Implementation
- VAPID key pair generated once, stored in `settings`
- Service worker registers on first visit
- Push subscription saved per user in a `push_subscriptions` table
- Server sends via `web-push` npm package (add to deps)
- TWA (APK) supports Web Push natively in Chrome

---

## 13. PWA + APK

### 13.1 PWA Setup
Create `public/manifest.webmanifest`:
```json
{
  "name": "Unbuilt Sales",
  "short_name": "Unbuilt",
  "start_url": "/today",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#12B76A",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Service worker: Next.js `next-pwa` or a minimal hand-rolled SW for:
- Offline caching of app shell
- Background sync for lead updates on bad connections
- Push notification handling

### 13.2 TWA APK Build

Wrap the PWA as a Trusted Web Activity (TWA) APK. Two options:

**Option A — PWABuilder (recommended, zero CLI):**
1. Go to [pwabuilder.com](https://pwabuilder.com)
2. Enter `https://unbuilt-azure.vercel.app`
3. Click "Package for stores" → Android
4. Set package name: `com.unbuilt.sales`
5. Download the signed APK
6. Share with reps via WhatsApp or Google Drive

**Option B — Bubblewrap CLI:**
```bash
npx bubblewrap init --manifest https://unbuilt-azure.vercel.app/manifest.webmanifest
npx bubblewrap build
```
Generates `app-release-signed.apk`. Sign with keytool (already on your PC).

Both options produce a TWA that opens the site fullscreen with no URL bar. The app auto-updates because it loads the live URL — no version management needed.

**Digital Asset Links:** Add `/.well-known/assetlinks.json` to verify the APK's signing key against the domain. This makes the TWA run in full-screen (no URL bar).

Java and keytool are already on your system.

### 13.3 APK Distribution
- **No Play Store.** Share APK file directly via WhatsApp group or Google Drive link
- Reps install by enabling "Install from unknown sources"
- Updates: just deploy to Vercel — the TWA loads the latest from the URL automatically
- No version management needed; it's always the live site

---

## 14. Feature: Website Audit Score

Free add-on to the existing 0–100 score. Uses **Google PageSpeed Insights API** (free, no key needed for basic usage):

For leads with `websiteStatus === "real"`:
- Run PageSpeed audit → get performance, accessibility, SEO scores
- Add to the pitch: "Your current site scores 32/100 on Google's speed test"
- Store result in `businesses.rawJson` under an `audit` key
- Cache for 30 days

This is a powerful selling point and costs zero API calls.

---

## 15. Feature: Smart Lead Prioritization

Beyond the existing score, add signals that help the manager assign the best leads:

1. **Recency decay:** leads from a scan 60+ days ago get deprioritized
2. **Category performance:** if salons convert at 25% but gyms at 5%, surface salons first
3. **Territory clustering:** suggest leads near a rep's recent wins (warm area)
4. **Review freshness:** businesses with recent reviews (from `rawJson`) are more active

All computed from existing data, no API calls.

---

## 16. Feature: DNC (Do-Not-Contact)

- Manager or rep can flag a phone number as DNC
- Reason: "asked not to be called", "wrong number", "competitor"
- All future scans and imports check against DNC list
- DNC'd leads are hidden from rep views but kept in DB for audit

---

## 17. Feature: Duplicate Guard

Before assigning a lead to a rep:
1. Check if any other rep has an active lead with the same phone number
2. Check if the business was already contacted in the last 90 days
3. If duplicate found, show warning to manager — don't silently assign

This prevents two reps calling the same shop.

---

## 18. Feature: Daily Targets & Leaderboard

- Manager sets a daily contact target per rep (default: 15 calls/day)
- Rep sees a progress ring on the Today screen
- Leaderboard: ranked by contacts this week, visible to all reps
- Manager gets an alert if any rep is below 50% of target by 2pm

---

## 19. Offline Tolerance

Reps are on the field with spotty connections. The app must:

1. **Optimistic UI:** update lead status locally, sync when online
2. **SWR + localStorage fallback:** cache lead list in the browser
3. **Service worker:** queue failed POST/PATCH requests, replay on reconnect
4. **No map for reps:** they don't need Mapbox (saves load + bandwidth). Lead list is text-based.

---

## 20. Security

- **Passwords** hashed with scrypt (existing `lib/crypto.ts`)
- **JWT** in httpOnly, secure, sameSite=lax cookie (existing pattern)
- **RBAC** enforced at API level — middleware checks role before handler runs
- **API keys** encrypted with AES-256-GCM (existing `lib/crypto.ts`)
- **No secrets in the APK** — it's just a URL wrapper, all auth is server-side
- **Rate limiting:** 5 login attempts per minute per IP (use in-memory counter, good enough for 20 users)
- **Input validation:** zod on every API endpoint (existing pattern)

---

## 21. Dependencies to Add

```json
{
  "read-excel-file": "^9",  // Excel parsing in the browser (used instead of SheetJS)
  "web-push": "^3"          // Push notifications (+ @types/web-push in devDependencies)
}
```

That's it. Two packages. Everything else is already installed or uses browser APIs.

---

## 22. Data Flow Diagrams

### 22.1 Lead Lifecycle

```
[Google Places] ──scan──▶ [businesses] ──assign──▶ [leads + assigned_to]
[Excel Import]  ─import─▶ [businesses] ──assign──▶ [leads + assigned_to]
[Manual Add]    ─create─▶ [businesses] ──assign──▶ [leads + assigned_to]

Rep works the lead:
  leads.pipeline_status: new → contacted → demo_sent → quoted → won
  lead_activity: log every touch
  
Won lead:
  Rep enters project_value → commission calculated
  Manager confirms → admin pays → commission_paid = true
```

### 22.2 API Call Budget Flow

```
Manager wants to scan
  → Check api_budget for current month
  → If calls_used + estimated_calls > limit → BLOCK
  → If calls_used > 700 → WARN
  → Run scan → increment calls_used
  → Log in scans table
```

### 22.3 Rep Request Flow

```
Rep submits request: "30 cafes in Koramangala"
  → lead_requests row created (status: pending)
  → Manager sees in queue with estimated cost
  → Manager approves → scan runs → results auto-assigned to requesting rep
  → Push notification: "18 new leads assigned"
```

---

## 23. Build Order (status as of 2026-09-26)

Legend: [x] built and tested locally, [~] built with a known limit, [ ] not built.

### Phase 1: Auth + Roles + Assignment
- [x] `users` table + Drizzle schema
- [x] Username/password auth replaces the PIN (scrypt, 30-day JWT, 5 tries/min/IP+username)
- [x] JWT carries userId + role; API routes re-check the user is still active (deactivation is instant)
- [x] Middleware RBAC (reps are confined to `/rep` and `/api/my|me|requests|push|lock`)
- [x] `/login` replaces `/unlock`
- [x] Admin/manager create and manage users (Team → Reps)
- [x] `assigned_to` on leads; reps only ever see their own
- [x] First-run admin bootstrap (env `ADMIN_USERNAME` + `ADMIN_PASSWORD`, falls back to `APP_PIN`)

### Phase 2: Excel Import + Pipeline
- [x] Excel/CSV import in the browser (`read-excel-file`, not SheetJS; no CVE history) with column auto-detect + preview
- [~] Saved column templates: skipped, columns are auto-matched by header name each time
- [x] Phone dedupe (last 10 digits), DNC skip
- [x] 7-stage pipeline; legacy `status` is derived from it so map pins keep working
- [x] Activity log per lead
- [x] Bulk assign, round-robin ("Split across all reps"), unassign, duplicate guard
- [x] Commission fields (`project_value`, `commission_paid`)

### Phase 3: Rep Experience (`/rep`)
- [x] Today: target ring, follow-ups due, new leads
- [x] Lead card: pitch, Call, WhatsApp (prefilled), outcomes, stage chips, won → project value, follow-up, notes, activity
- [x] My Leads: search, stage chips, sort
- [x] Request Leads + status
- [x] My Stats: contacts, commission earned/paid, weekly leaderboard, change password, sign out

### Phase 4: Manager Dashboard (`/team`, `/pool`)
- [x] Overview: revenue, commission owed/paid, pipeline funnel, per-rep table, stale leads, won deals (admin marks paid)
- [x] Google budget meter (warn at 70%, block scans when only 100 calls remain)
- [x] Requests queue (approve / decline / done, rep is notified)
- [x] Lead pool: filters, multi-select, assign, import, add manually, export CSV
- [x] Pitch generation (Gemini, cached per lead, rule-based fallback, or write your own)
- [~] Request approval does not auto-run a scan (needs geocoding); manager approves, scans from Drop, assigns from Pool

### Phase 5: PWA + APK
- [x] `manifest.webmanifest`, icons (192, 512, maskable), `sw.js` (offline shell + push), `/offline`
- [x] Web Push (VAPID): new leads, request updates, deal won, lead request; daily digest by Vercel Cron
- [~] Offline: updates made with no signal are queued in localStorage and replayed on reconnect (no Background Sync API)
- [ ] Build the TWA APK (your step, see section 31)
- [~] `public/.well-known/assetlinks.json` is a placeholder until the APK is signed

### Phase 6: Polish
- [x] Website audit: PageSpeed score is pulled into the pitch for leads that have a real site
- [x] DNC list (managers edit; reps add via "Wrong number")
- [x] Duplicate guard on assignment
- [x] Daily targets + weekly leaderboard
- [x] Export CSV includes stage, assignee, follow-up, project value
- [ ] Overpass (OpenStreetMap) lead source: not built, coverage in India is patchy

---

## 24. Migration Strategy

The app is live at `unbuilt-azure.vercel.app` with existing data. Migration:

1. **Schema changes via Drizzle `push`** — additive only (new tables, new columns). Never drop existing columns.
2. **Auth transition:** keep the old `/unlock` route working for 1 week alongside `/login`. After all users are created, remove it.
3. **Existing leads:** `assigned_to` starts as NULL (unassigned pool). Manager assigns them after reps are created.
4. **Existing scans:** kept as-is. Budget tracking starts from 0 for the current month.

---

## 25. Neon Storage Budget

With 0.5 GB free:
- 20,000 businesses × ~2KB each = ~40MB
- 20,000 leads × ~500B each = ~10MB  
- 100,000 activity log entries × ~200B = ~20MB
- Everything else: ~5MB
- **Total: ~75MB** — well within 0.5GB

At 50,000 businesses (heavy scanning over months), still under 200MB. Safe.

---

## 26. Performance Targets

| Metric | Target |
|--------|--------|
| Login → Today screen | < 2 seconds on 4G |
| Lead card load | < 1 second |
| Lead status update | Instant (optimistic) |
| Excel import (500 rows) | < 5 seconds |
| Scan (1000m radius) | < 15 seconds |
| Push notification delivery | < 30 seconds |

---

## 27. What's NOT Included (Deliberate Cuts)

- **No CRM integration** (Salesforce, HubSpot) — overkill for this team size
- **No email sending** — reps use phone/WhatsApp, not email
- **No payment processing** — commissions are tracked, paid manually
- **No Play Store listing** — APK shared directly
- **No multi-tenancy** — one agency, one database
- **No real-time chat** — reps message the manager on WhatsApp
- **No GPS tracking** — privacy concern, not needed
- **No complex territories** — manager assigns manually; automated territories are premature
- **No A/B testing of pitches** — too early, do it when there's data to learn from

---

## 28. Environment Variables

```env
# Existing
DATABASE_URL=postgresql://...
ENCRYPTION_KEY=<32 bytes, base64>
AUTH_SECRET=<random string for JWT>

# New
ADMIN_USERNAME=alok
ADMIN_PASSWORD=<chosen at deploy, hashed on first boot>

# Existing (unchanged)
APP_PIN=246810          # deprecated, remove after auth migration

# Push notifications (generate once with web-push generateVAPIDKeys)
VAPID_PUBLIC_KEY=<generated>
VAPID_PRIVATE_KEY=<generated>
VAPID_SUBJECT=mailto:aloksharmaofficial8@gmail.com

# Daily digest (Vercel Cron sends this as a Bearer token)
CRON_SECRET=<random string>

# Optional
PLACES_MONTHLY_LIMIT=1000   # the budget guard reserves the last 100 calls
```

---

## 29. Key Decisions Log

| Decision | Chosen | Reason |
|----------|--------|--------|
| Auth | Username + password (scrypt) | Simplest for internal team, no OAuth complexity |
| Excel parsing | Client-side (xlsx lib) | No file upload needed, no blob storage |
| Push | Web Push (VAPID) | Free, works in TWA, no Firebase needed |
| APK | Bubblewrap TWA | Simplest wrapper, auto-updates from URL |
| Map | Manager-only (Mapbox) | Reps don't need it; saves bandwidth on field |
| Commission | Tracking only | No payment integration — admin pays manually |
| Hosting | Vercel (for now) | Already deployed, migrate only if needed |
| Database | Neon Postgres (keep) | Already provisioned, 0.5GB is enough |
| LLM | Gemini free tier (keep) | Pitch generation, already integrated |
| Offline | Service worker + SWR cache | Good enough for spotty 4G |

---

---

## 30. As Built: Differences From the Plan

| Plan | Built | Why |
|------|-------|-----|
| `leads.pipeline_status` | `leads.stage` (text) and the old `status` enum is derived from it | Map pin colours and the old lead list keep working unchanged |
| `api_budget` table | Derived from `scans` (`monthlyUsage()` sums live `api_calls` this month) | One source of truth, nothing to keep in sync |
| `import_templates` table | Not built; columns are auto-matched by header name | Manager re-maps in two clicks; add a table only if it becomes annoying |
| `dnc.business_id` | `dnc(phone unique, reason, added_by)` only | Phone is the join key everywhere |
| `push_subscriptions` | `push_subs(endpoint pk, user_id, p256dh, auth)` | Same thing, one row per device |
| `users.updated_at` | `users.daily_target` (per-rep target) | Needed for the target ring |
| `lead_requests.estimated_calls`, status `scanning` | Dropped | Approving does not auto-scan (needs geocoding) |
| SheetJS `xlsx` | `read-excel-file` + a small CSV parser | SheetJS on npm is old and has known CVEs when parsing crafted files |
| Pitch fields as columns | `leads.pitch_text` holds JSON (`angle`, `opening`, `objections[]`, `price`) or plain text if typed by hand | One column, both cases |
| Background Sync | localStorage queue replayed on `online` | Simple, works in every Android WebView |

Other additions: DB-checked sessions (deactivating a user logs them out on their next request), a 60-day "already scanned" cache that returns stored businesses without spending Places calls, a hard budget stop (scans refuse when only 100 calls remain), a daily push digest (`/api/cron/digest`).

---

## 31. Go-Live Checklist

1. **Neon quota.** The production DB (`unbuilt`) is locked until **2026-10-01** (network cap, see 3.4) unless you upgrade. Until then all development ran against a scratch project, `unbuilt-dev`, which can be deleted after go-live.
2. **Vercel env vars** (Project → Settings → Environment Variables). Values for the ones below are in the gitignored `.env.local`:
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD` (if unset, the admin is `admin` with the old `APP_PIN` as password; change it in You → Account straight away)
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
   - `CRON_SECRET`
   - existing: `DATABASE_URL`, `ENCRYPTION_KEY`, `AUTH_SECRET`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `GOOGLE_PLACES_API_KEY`, `GEMINI_API_KEY`
3. **Schema.** With the quota available run `npm run db:push` against the production `DATABASE_URL`. It is additive only (new tables and columns), nothing is dropped.
4. **Deploy** (push the branch, merge to `main`; Vercel auto-deploys).
5. **First login** at `/login` as the admin. Add the manager (Team → Reps → role Manager), then the manager adds reps and shares username + password with each.
6. **Google Cloud.** In the Places API quotas page set a per-day cap of about 35 requests. That makes overspend physically impossible even if the app has a bug.
7. **Build the APK** (needs the site live over HTTPS):
   1. Open pwabuilder.com, enter the site URL, Package for stores, Android.
   2. Package ID `com.unbuilt.sales`, let it generate a signing key (keep the `.keystore` and passwords safe, you need them for every update).
   3. Copy the **SHA-256 fingerprint** it shows and put it into `public/.well-known/assetlinks.json` (replace `REPLACE_WITH_SHA256_FROM_YOUR_SIGNING_KEY`), redeploy. Without this the app shows a browser URL bar.
   4. Send the `.apk` to reps on WhatsApp or Drive. They allow "install unknown apps" once. Updates ship by deploying the site, the APK does not need reissuing.
8. **Reps' first run:** open the app, sign in, tap Turn on on the notifications card.

## 32. Day-to-Day Operating Guide

- **Get leads:** Drop tab (scan an area, watch the budget meter) or Pool → Import (Excel/CSV) or Pool → Add.
- **Hand them out:** Pool → tick leads → pick a rep → Assign, or "Split across all reps". Skipped for do-not-contact numbers; skipped with a warning if another rep already has that phone (Assign anyway overrides).
- **Prepare the pitch:** open a lead → Generate (or write your own). Reps see it as a card above the call buttons.
- **Rep requests:** Team → Requests. Approve, do the scan/import, assign, mark Done. The rep gets a push notification at each step.
- **Money:** a rep marks a lead Won and enters the project value. Commission = value × their %. The admin marks it paid in Team → Overview → Won deals.
- **Watch:** Team → Overview shows who is under target today (amber), leads nobody has touched for 3+ days, and Google calls used.

*Last updated: 2026-09-26*

