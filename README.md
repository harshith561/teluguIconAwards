# 🏆 Telugu Icon Digital & Influencer Awards

Premium cinematic web platform for the Telugu Icon Awards — celebrating Telugu digital excellence.

---

## 🚨 Read this first — deployment checklist

If you are deploying this yourself, **do these five things before the site goes
live.** Each one is a real failure mode found by testing this codebase, not
general advice.

### 1. Create your environment file

`.env` is intentionally **not** committed (it holds secrets). Without it the API
will not start.

```bash
cd backend
cp .env.example .env
```

Then edit `.env`:

| Variable | What to set |
|---|---|
| `DB_PORT` | **Match your server.** This machine used 3307; standard MySQL is 3306. |
| `DB_USER` / `DB_PASSWORD` | Your MySQL credentials. XAMPP defaults to `root` / *(empty)*. |
| `DB_NAME` | Defaults to `telugu_icon_awards`. |
| `JWT_SECRET` | **Change it.** A long random string. Rotating it logs out all admins. |
| `FRONTEND_URL` | Set to your real domain instead of `*` to lock CORS down. |

### 2. Change the default admin password

`database/schema.sql` seeds:

```
admin@teluguiconawards.com  /  admin123
```

**This is public knowledge. Change it the moment the site is reachable.**

### 3. Set `TRUST_PROXY=true` — only if anything sits in front of the API

Set this in `backend/.env` when you deploy behind nginx, Cloudflare, Railway,
or any load balancer.

**Why it matters:** without it the server sees the *proxy's* IP address instead
of the visitor's, so every user on the site looks like the same person. The
per-IP vote limit (20/hour) would then be exhausted by the first 20 requests
from anyone, and the duplicate-vote guard would let the **first person to vote
lock out the entire audience** with "already voted in this category".

Leave it unset if the API is exposed directly to the internet — trusting a
client-supplied header when nothing rewrites it lets anyone forge their IP.

### 4. Raise the MySQL buffer pool

XAMPP and most default installs ship with a **16 MB** InnoDB buffer pool. That
is fine for development and will fall over under real traffic.

```ini
# C:\xampp\mysql\bin\my.ini   (restart MySQL afterwards)
[mysqld]
innodb_buffer_pool_size        = 1G
max_connections               = 500
innodb_flush_log_at_trx_commit = 2
slow_query_log                 = 1
```

`max_connections` must exceed `instances × DB_POOL_SIZE`, or you will get
*"Too many connections"* and a dead site.

### 5. Decide how OTP verification works

Until `MSG91_TEMPLATE_ID` is set, `/api/otp/send` returns the code in its
response as `dev_otp`. That is how local testing works with no SMS cost — but it
means **anyone can vote without owning the phone number.**

For production either configure MSG91, or make the server reject unverified
votes. Do not ship with `dev_otp` reachable.

---

### 📄 Full documentation

| Document | What it covers |
|---|---|
| [**`docs/TELUGU-ICON-OPS-RUNBOOK.pdf`**](docs/TELUGU-ICON-OPS-RUNBOOK.pdf) | 14 pages: every environment variable, full API reference, nginx config, systemd unit, step-by-step deployment, pre-launch checklist |
| [Quick Start](#-quick-start) below | Getting it running locally |
| [Scaling](#-scaling-10k--100k--300k-concurrent-users) below | Handling 10k / 100k / 300k concurrent users |

Regenerate the runbook after changing it:
```bash
cd frontend && npm run docs
```

### ✅ Current status

| | |
|---|---|
| Database | MySQL / MariaDB via `mysql2`. All 23 tables in one idempotent `schema.sql`. |
| Tests | 85 end-to-end checks, 34 endpoint checks — all passing. |
| Security | No secrets committed. Duplicate votes enforced by database unique keys. |
| Known limits | Voting caps around 1,000 concurrent voters per instance — see [the lock section](#-the-vote-count-lock-problem-fixed--and-how-to-go-further). |

---

## Project Structure

```
aibuild/
├── frontend/          # React (Vite) + Tailwind CSS + Framer Motion
│   └── src/
│       ├── pages/     # Home, Awards, Nominate, Vote, Nominees, Sponsors, About, Contact
│       └── pages/admin/  # Admin Login + Dashboard (7 management tabs)
├── backend/           # Node.js + Express + MySQL
│   ├── routes/        # REST API routes
│   ├── config/        # MySQL connection pool (port 3307)
│   ├── database/      # schema.sql — all 23 tables + seed data (MySQL/MariaDB)
│   ├── scripts/       # setup-database.js, seed + audit tools
│   └── uploads/       # Nomination photo uploads
├── start-backend.bat  # Start API server
└── start-frontend.bat # Start React dev server
```

## Tech Stack
- **Frontend:** React 18, Vite, Tailwind CSS, React Router, Framer Motion
- **Backend:** Node.js, Express, JWT auth, bcrypt, multer (uploads)
- **Database:** MySQL via XAMPP (port **3307**)

---

## 🚀 Quick Start

### 1. XAMPP (MySQL on port 3307)
Make sure XAMPP Apache + MySQL are running. XAMPP MySQL must listen on **port 3307**:
- Edit `C:\xampp\mysql\bin\my.ini` → `port = 3307`
- Start MySQL in XAMPP Control Panel. Verify: `mysql -h localhost -P 3307 -u root`

### 2. Database (auto-setup)
The backend **auto-creates the database and all tables** on first start. To create manually:
```bash
"C:\xampp\mysql\bin\mysql.exe" -h localhost -P 3307 -u root < backend/database/schema.sql
```

### 3. Start Backend API (port 3001)
```bash
cd backend
npm install
npm start
```
✔ Verifies: MySQL Connected on 3307 → API on http://localhost:3001

### 4. Start Frontend (port 5173)
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173**

Or double-click `start-backend.bat` and `start-frontend.bat`.

---

## 🔑 Admin Login
| | |
|---|---|
| URL | http://localhost:5173/admin/login |
| Email | `admin@teluguiconawards.com` |
| Password | `admin123` |

---

## 📄 Pages
| Route | Page |
|---|---|
| `/` | Cinematic home, stats, countdown, featured nominees |
| `/awards` | 10 Curated + 40 People's Choice categories |
| `/nominate` | Multi-step nomination form (with photo upload) |
| `/vote` | Public voting portal |
| `/nominees` | Nominees showcase gallery |
| `/nominee/:id` | Shareable nominee profile with vote button (slug is canonical) |
| `/vote/:slug` | Direct voting URL — opens the nominee page with voting pre-selected |
| `/nominee-kit` | Campaign kit: poster, story, QR and social captions |
| `/sponsors` | Sponsor tier showcase |
| `/about` | Story, values, timeline |
| `/contact` | Contact form (saves to DB) |
| `/admin/login` | Secure admin sign-in |
| `/admin` | Dashboard, Nominations, Nominees, Categories/Voting, Votes & Audit, Sponsors, Settings |

---

## 🔌 API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Admin login → JWT |
| GET | `/api/categories` | All categories |
| GET | `/api/categories/curated` | 10 curated icon awards |
| GET | `/api/categories/peoples-choice` | 40 people's choice categories |
| GET | `/api/nominees` | Approved nominees (filter by `?category=`/`?status=`) |
| GET | `/api/nominees/featured` | Featured nominees |
| GET | `/api/nominees/:id` | Nominee profile |
| POST | `/api/nominations` | Submit public nomination (multipart) |
| POST | `/api/votes` | Cast a vote (duplicate guarded per email) |
| GET | `/api/sponsors` | Active sponsors |
| GET | `/api/settings` | Site settings |
| POST | `/api/contact` | Contact form |
| GET | `/api/admin/stats` | Dashboard stats (auth) |
| GET/PUT | `/api/admin/nominations` | Review/approve/reject nominations (auth) |
| GET/PUT/DELETE | `/api/admin/nominees` | Manage nominees (auth) |
| PUT | `/api/categories/:id` | Open/close voting (auth) |
| GET/PUT | `/api/admin/votes` | Vote audit & flagging (auth) |
| GET/POST/PUT/DELETE | `/api/admin/sponsors` | Sponsor CRUD (auth) |
| GET/PUT | `/api/admin/settings` | Update site content (auth) |

---

## 🌟 Individual Nominee Pages & Direct Voting (add-on)

Every approved nominee gets a permanent public page, a unique QR code, a share
kit and a campaign dashboard. Voting rules are unchanged: **one verified mobile
= one vote per category**, OTP enforced, anti-fraud and duplicate protection all
still enforced server-side.

> **Looking for capacity or deployment guidance?** See
> [📈 Scaling](#-scaling-10k--100k--300k-concurrent-users) for handling
> 10k / 100k / 300k concurrent users, and
> [`docs/TELUGU-ICON-OPS-RUNBOOK.pdf`](docs/TELUGU-ICON-OPS-RUNBOOK.pdf) for
> the full API reference, environment variables and step-by-step deployment.

### 1. Run the database schema (required once)

Everything is in a **single idempotent file** — `backend/database/schema.sql` —
covering all 23 tables plus the seed data (admin, 50 categories, settings,
tickets, past events, sponsor slots, `TIC26-#####` code counter).

| How | Command |
|---|---|
| Automatic | Just start the backend — it creates the database and applies the schema on boot |
| Manual | `cd backend && npm run db:setup` |
| phpMyAdmin / import | Import `backend/database/schema.sql` |

There is nothing else to run. The API degrades gracefully if the schema has not
been applied yet: nominee pages, voting and the admin directory still work, you
just don't get `TIC26-` codes, achievements/social link fields, or analytics.

Nominee `TIC26-#####` codes come from the `code_counters` table (MySQL has no
sequences), incremented atomically so concurrent inserts can never collide.

#### Migrations

`schema.sql` is the full picture for a **fresh** database. For a database that
already exists, incremental changes live in
`backend/database/migrations/` — one file per change, named
`YYYY-MM-DD-short-description.sql`, each idempotent so it is safe to re-run:

```bash
mysql -h localhost -P 3307 -u root telugu_icon_awards \
  < backend/database/migrations/2026-10-14-open-all-jury-categories.sql
```

> ⚠️ Re-running `schema.sql` does **not** overwrite existing rows. Its seed
> blocks use `ON DUPLICATE KEY UPDATE name = name`, which is a no-op by design so
> a re-apply can never reset live data. That also means a `schema.sql` seed
> change only reaches existing databases through a migration file.

> ⚠️ If you ever need to rewrite existing nominee slugs (`ananya-nagalla-k3f9a2` →
> `ananya-nagalla`), do it **before** any nominee link, poster, QR code or video
> has been distributed. After that, printed material breaks.

### 2. Environment variables

**None are required.** Everything has a working default:

| What | Default |
|---|---|
| Backend API | `https://awards-production-13eb.up.railway.app/api` |
| Public origin (canonical, OG, QR, sitemap) | **derived from the incoming request** |

The public origin is read from the request itself, so production, preview
deploys and second Vercel projects all emit correct links automatically — there
is no hostname to keep in sync. Share links and QR codes can never point at a
host that does not exist.

| Variable | When to set it |
|---|---|
| `VITE_SITE_URL` | Only to force canonical/OG URLs to a different origin than the one being served — e.g. set it to the real custom domain. |
| `API_BASE_URL` | Only if the backend moves off Railway. |
| `FRONTEND_URL` (Railway) | Optional. CORS is currently `*`. |

### 3. How link previews work

`frontend/middleware.ts` intercepts `/nominee/<slug>` and `/vote/<slug>` on
Vercel and serves the built `index.html` with per-nominee `<title>`, meta
description, canonical URL, Open Graph and Twitter/X card tags fetched from the
API. This is required because **WhatsApp, Facebook, Telegram and X do not run
JavaScript** — a client-only implementation would preview every nominee link as
the generic site title.

The file lives in `frontend/` because Vercel only picks up Routing Middleware
from the root of the configured **Root Directory** (yours is `frontend`). If you
ever change Root Directory, move this file to match. The middleware also serves
`/robots.txt` and a `/sitemap.xml` generated live from the approved nominee
list.

If the API is unreachable the middleware falls through to the normal SPA shell,
so a database hiccup can never take the site down.

### 4. New URLs

| URL | Purpose |
|---|---|
| `/nominee/<slug>` | Official nominee page (canonical) |
| `/nominee/<slug>?vote=true` | Opens the page with the voting form pre-selected |
| `/nominee/<slug>?vote=true&src=qr` | Encoded in the QR code — scans are counted separately from taps |
| `/vote/<slug>` | Human-friendly alias for the direct vote URL |
| `/nominee-kit?nominee=<slug>` | Campaign kit: poster, story, QR, all captions |
| `/nominee-status` | OTP-verified nomination tracker — unlocks the nominee's kit on approval |
| `/sitemap.xml`, `/robots.txt` | Generated live by the middleware |

The numeric-id form (`/nominee/42`) redirects to the slug, so a nominee always
has exactly **one** canonical URL.

### 5. New API endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/analytics/track` | Records page views / voting clicks / share clicks / QR scans (de-duplicated, no voter identity stored) |
| POST | `/api/nomination-status/send` | Sends an OTP to the nominating mobile (add-on req. 19) |
| POST | `/api/nomination-status/verify` | Verifies it, returns a 30-minute `nomination_status` token |
| POST | `/api/nomination-status/lookup` | Returns that mobile's nominations + campaign kit. Rejects vote-purpose tokens and any other mobile's data |
| GET | `/api/admin/nominees/:id/campaign` | Full MY CAMPAIGN payload + 14-day reach series (auth) |

### 5b. Kit delivery on approval (add-on req. 19)

There is no email/SMS provider connected, so `/nominee-status` is the delivery
channel. The nominee verifies the mobile number they nominated with, and the
moment an admin shortlists that nomination their official URL, nominee ID, QR
code, poster and share copy all appear — no email needed.

If a nomination is approved but its nominee page has not been created yet, the
page says **"Approved — Page Being Set Up"** rather than promising a kit that
does not exist. Re-shortlisting the nomination in admin creates the page and the
kit unlocks automatically.

**Launch control:** voting is gated by the per-category `voting_open` flag in
Admin → Categories. There is deliberately no hard-coded date gate, because
requirement 15 states voting rules must remain unchanged.

**`voting_open` is the only vote gate.** It used to be one of three:

| Gate | Status |
|---|---|
| `voting_open = 1` — `voteRoutes.js:184` | the only gate |
| `type = 'self_nomination'` — `voteRoutes.js:187` | **removed** |
| `type = 'self_nomination'` — `VotePage.jsx:30` | **removed** |

The `type = 'jury'` gates meant a category could read as open on screen and still
reject every vote with "Voting is currently closed for this category" — and it
made the "closed" message unreachable for jury categories, so they failed with a
jury-only message instead. `type` is now presentation only: `AwardsPage` and
`CategoryDetail` label a category from `voting_open`, not from `type`. All 51
categories are public-vote categories; see
`backend/database/migrations/2026-10-14-open-all-jury-categories.sql`.

`GET /api/nominees` now also accepts a **category id** as well as a category
slug, and returns achievements plus individual social URLs.

### 6. Admin

In **Admin → Nominees**, each row has a **🎯 MY CAMPAIGN** button giving the
nominee name, nominee ID, category, official URL, voting URL, QR code, campaign
assets and reach — with `COPY NOMINEE LINK`, `COPY VOTING LINK`, `DOWNLOAD QR`,
`SHARE` and `DOWNLOAD CAMPAIGN MATERIAL`. The edit modal now exposes the slug
(plus achievements and individual social URLs) so a broken link can be fixed.

**Slug policy:** renaming a nominee never changes their URL automatically. The
slug only changes when an admin explicitly edits that field, because it is
printed on posters, QR codes and videos.

### 7. Before the 10 October launch checklist

- [x] Apply `backend/database/schema.sql` (auto on boot, or `npm run db:setup`)
- [ ] Confirm a shared WhatsApp link previews with the nominee's **name, category and photo** (not the generic site title)
- [ ] Download one poster per nominee — verify the QR scans into the **correct** nominee page
- [ ] Flip `voting_open` on categories deliberately; there is no automatic date gate
- [ ] When the domain goes live: set `VITE_SITE_URL` to it, redeploy, and add it in Vercel → Settings → Domains

---

## 🗄️ Database Tables
`users`, `categories`, `nominations`, `nominees`, `otp_sessions`, `votes`,
`sponsors`, `settings`, `contact_messages`, `sms_senders`, `sms_templates`,
`tickets`, `ticket_orders`, `past_events`, `awardees`, `gallery_items`,
`media_items`, `video_items`, `sponsor_leads`, `audit_logs`,
`nominee_campaign_events`, `sponsor_slots`, `code_counters`

Seeded: 1 admin, 50 categories (10 curated + 40 people's choice), 4 ticket tiers,
2 past events, 3 sponsor slots, 16 site settings, 1 sponsor, 1 SMS sender ID.

To fill the admin panel with realistic preview data (nominees, votes, audit
logs, media releases):

```bash
cd backend && node scripts/seed-initial-admin-data.js
```

### Verifying the migration
```bash
cd backend
node scripts/test-live-apis.js        # direct DB round-trips
node scripts/audit_endpoints.js       # 34 endpoint checks against a running API
node scripts/smoke-test-mysql.js      # 86 end-to-end checks (API must be on :3001)
node scripts/load-test.js read        # capacity: throughput + p50/p95/p99
```

---

## 📈 Scaling: 10k / 100k / 300k Concurrent Users

Everything below is **measured on this codebase**, not estimated. Reproduce it
yourself with `node scripts/load-test.js`.

> The full operations runbook — API reference, every environment variable,
> nginx config, deployment steps — is in
> [`docs/TELUGU-ICON-OPS-RUNBOOK.pdf`](docs/TELUGU-ICON-OPS-RUNBOOK.pdf).
> Regenerate with `npm run docs`.

### Measured capacity (per instance, single Node process)

| Concurrent | Read (`GET`) | p99 | Vote (`POST /votes`) | p99 | Errors |
|---|---|---|---|---|---|
| 200 | 4052 req/s | 86 ms | 1193 votes/s | 271 ms | 0.01% |
| 500 | 3994 req/s | 229 ms | — | — | 0% |
| 1000 | 3805 req/s | 533 ms | 822 votes/s | 1534 ms | 0.07% |
| 2000 | 3520 req/s | 1264 ms | — | — | 0% |

Tested on 6-core / 15 GB / MariaDB 10.4. **Reads hold to 2000 concurrent with
zero errors. Voting knee is ~1000 concurrent — past that latency passes 1.5 s.**

> Those vote figures are **before** the `vote_count` optimisation described
> next. The optimisation removed the lock stalls and drove failures to zero, but
> the throughput figure above has not been re-measured across enough runs to
> claim an improvement. Treat ~600–1200 votes/s as the realistic range.

### 🔧 The vote-count lock problem (fixed — and how to go further)

This is the single most important performance detail in the voting path. It was
found by load testing, not by reading the code, and it is worth understanding
before you change anything here.

#### The bug

The original vote transaction was:

```sql
BEGIN;
INSERT INTO votes (...);                              -- FK -> nominees(id)
UPDATE nominees SET vote_count = vote_count + 1 ...;  -- same row!
COMMIT;
```

`votes.nominee_id` is a **foreign key** to `nominees.id`. So every `INSERT`
makes InnoDB take a **shared lock** on that nominee row and hold it until the
transaction commits. The `UPDATE` then needs an **exclusive lock** on the very
row it already holds a shared lock on.

Two votes for the same nominee both hold S, both want X, neither can be
granted — **deadlock**. Measured at 1000 concurrent voters:

```
Innodb_row_lock_waits        10,653      <-- 0.66 lock waits per vote
Innodb_row_lock_time_max       218 ms
Max_used_connections            11      <-- pool limit is 10: NOT connection-bound
```

That is also why adding cluster workers did nothing (1193 → 1164 votes/s): the
wait was **in the database**, not in Node. More servers cannot fix a row lock.

#### The fix

`vote_count` is now a **batched cache**, not part of the transaction:

1. The vote transaction contains only the `INSERT`. It touches no row anyone
   else writes, so it scales horizontally with no shared-row contention.
2. `backend/utils/voteCounter.js` counts votes **in memory** and flushes once a
   second as **one `UPDATE` per nominee** — roughly 50 writes a minute instead
   of one per vote.
3. `backend/scripts/recount-votes.js` rebuilds any counter that drifted.

```bash
node scripts/recount-votes.js           # dry run: report differences
node scripts/recount-votes.js --apply   # write the corrected counts
```

Result:

| | Before | After |
|---|---|---|
| Lock waits per vote | 0.66 | **0.0015** (440x fewer) |
| Failed votes | 0.07% | **0%** |
| Writes to the hot row | 1 per vote | ~1 per nominee per second |

**`votes` remains the source of truth.** The counter is only a cache, so a
process killed between a commit and a flush loses a *count*, never a *vote* —
and the recount script repairs it. Run it after any bulk edit or data import.

#### Going further — the next two bottlenecks

After the lock fix, voting is limited by these instead. Both are small changes:

**1. Drop the redundant duplicate pre-check.** Every vote currently runs this
before the insert:

```sql
SELECT voter_phone, voter_email, device_fingerprint
  FROM votes
 WHERE category_id = ?
   AND (voter_phone = ? OR voter_email = ? OR device_fingerprint = ?
        OR (ip_address = ? AND user_agent = ?))
 LIMIT 1
```

A 4-way `OR` across four different columns, which gets slower as `votes`
grows and **cannot use a single index**. It is also **not needed for
correctness** — the unique keys already reject duplicates atomically inside the
insert. Keep it only for the friendlier error message; a single indexed lookup
on the primary identifier (phone or email) gives the same UX for a fraction of
the cost.

**2. Raise the connection pool.** Each vote does ~3 pool acquisitions (two
reads plus the transaction). At 600 votes/s that is ~1800 acquisitions/s
through `DB_POOL_SIZE=10` connections — the pool is likely the limit before the
database is.

```env
DB_POOL_SIZE=20        # useful range is 10-25
```

Then raise `max_connections` to cover `instances × DB_POOL_SIZE`. Going much
beyond 25 makes the database thrash and throughput *drops*.

**3. Beyond that** — cache `settings`/`categories`/`sponsors` in Redis (read on
nearly every page view, change rarely), and if you need true write
scalability, accept votes into Redis and drain to MySQL asynchronously.

### First, separate two numbers people conflate

- **Registered members** = database rows. 10k, 100k or 500k cost nothing.
  MySQL handled 16,000 votes in 20 seconds without strain.
- **Simultaneous users** = what actually needs servers.

Only simultaneous users require scaling decisions.

### Work out your real peak

Voting rate is the only figure that matters: `votes/s = users ÷ window`

| Scenario | Rate needed | Instances |
|---|---|---|
| 20,000 members over 24 h | 0.2 votes/s | 1 |
| 20,000 members over 1 h | 6 votes/s | 1 |
| 20,000 members in 5 min | 67 votes/s | 1 |
| 100,000 members in 60 s | 1667 votes/s | 3 |
| 100,000 members in 30 s | 3333 votes/s | 5 |

**Voting is almost never your bottleneck. Page loads are.**

### Instance sizing by simultaneous visitors

Each visitor fires ~4–6 API calls on first load. At ~4000 req/s per instance:

| Concurrent | API calls | Drain time | Browsing instances | Voting instances |
|---|---|---|---|---|
| **10,000** | 50,000 | 13 s | 5–10 | 1 |
| **100,000** | 500,000 | 125 s | 50–100 | 10–15 |
| **300,000** | 1,500,000 | 375 s | 150+ | 30+ |

"Drain time" is how long one burst takes to clear at full throughput.

### Reality check at 300k concurrent

**300k needs architectural change, not just more servers.** Honest assessment:

| Layer | 10k | 100k | 300k |
|---|---|---|---|
| CDN (Cloudflare/Vercel) | optional | **required** | **required** |
| App instances | 5–10 | 50–100 | 150+, multi-region |
| Database | 1 managed box | managed + read replica | sharded or partitioned |
| Caching | in-process (built in) | Redis for settings/categories | Redis + edge caching |
| Architecture | unchanged | unchanged | **writes must be decoupled** |

The write blocker used to be that every vote wrote
`UPDATE nominees SET vote_count` inside its transaction, serialising on one row
(measured: **10,653 row-lock waits per 16,000 votes**). **That is now fixed** —
see [The vote-count lock problem](#-the-vote-count-lock-problem-fixed--and-how-to-go-further).

To reach 300k you still need:

1. **Remove the redundant duplicate pre-check** — one 4-way `OR` query per vote
   that grows with the table and cannot use a single index
2. **Raise `DB_POOL_SIZE`** to 20–25 and `max_connections` to match
3. **Cache hot reads in Redis** — `settings`, `categories` and `sponsors` are
   read on nearly every page view and change rarely.
4. **Shard `votes` by `category_id`** — 50 categories partition naturally, and
   each shard can live on a separate node.
5. **Queue writes** — accept the vote into Redis/Kafka, return 201 immediately,
   drain to MySQL asynchronously. Vote totals become eventually consistent.

Steps 1, 2 and 5 are the ones that matter. The runbook lists the full sequence.

### The database matters more than the servers

Two defaults will bite long before the app tier does:

```ini
# C:\xampp\mysql\bin\my.ini  (restart MySQL from XAMPP after editing)
[mysqld]
innodb_buffer_pool_size       = 1G      # default is 16MB - THE most common mistake
max_connections              = 500     # must exceed instances x DB_POOL_SIZE
innodb_flush_log_at_trx_commit = 2      # group commit; up to 1s vote loss on power cut
slow_query_log               = 1
long_query_time              = 1
```

**Total connections = instances × DB_POOL_SIZE.** 20 instances at pool 15 = 300
connections, so `max_connections` must be ≥ ~360. Exceeding it produces
*"Too many connections"* and a dead site.

Do **not** raise `DB_POOL_SIZE` to 100 hoping it goes faster — the database
thrash and throughput drops. The useful range is 10–25.

### Use the process cluster correctly

```env
CLUSTER=1
WORKERS=6      # match your CPU count
```

Note: clustering **helps reads, not writes.** Measured — 6 workers gave 4052 →
3994 req/s reads and 1193 → 1164 votes/s. The write bottleneck is MySQL row
locking, not Node.

### Load balancer

Required the moment you run more than one instance, and it is also what makes
`TRUST_PROXY` work.

```nginx
upstream telugu_api {
    least_conn;                    # better than round-robin for uneven request cost
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
    keepalive 64;
}

location /api/ {
    proxy_pass         http://telugu_api;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    # REQUIRED - without these every visitor shares one IP:
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_set_header   Connection        "";
}
```

Then set `TRUST_PROXY=true`. **Without it the per-IP vote limit is exhausted by
20 requests total and the first person to vote locks out the entire audience.**

Health check: `GET /api/health` → `200 {"status":"ok"}`.

### Scaling stages — what to do at each level

| Stage | Setup | Cost | Handles |
|---|---|---|---|
| **Launch (≤10k)** | 1 instance, XAMPP or managed MySQL | ~$20/mo | Everything comfortably |
| **Growth (10k–100k)** | 5–50 instances behind nginx/Cloudflare, managed MySQL, `innodb_buffer_pool_size` ≥ 1G | ~$200–800/mo | Comfortable |
| **Large (100k–300k)** | 50–150 autoscale instances, Redis cache, read replicas, CDN front | ~$2k–10k/mo | Needs the code changes above |
| **Beyond 300k** | Multi-region, sharded `votes`, queued writes | Enterprise | Architectural project |

### Measure before you scale

Never size from a guess. Re-run the load test after **any** change to the vote
write path, the MySQL settings, or the instance count:

```bash
cd backend
node scripts/load-test.js read --concurrency=500 --duration=20
node scripts/load-test.js vote --concurrency=1000 --duration=20
```

Watch for these in production:

| Symptom | Likely cause |
|---|---|
| p99 > 1000 ms | Pool saturated, or lock contention — check the slow log |
| `503` from `/api/votes` | `isBusyError` fired — pool or queue pressure |
| `Too many connections` | `max_connections` < instances × `DB_POOL_SIZE` |
| 0.07% HTTP 500 on votes | Deadlock retries exhausted — remove the counter lock |
| Visitors told "already voted" en masse | `TRUST_PROXY` not set — all users share one IP |

---

## Troubleshooting
- **Unknown database 'telugu_icon_awards'** → Restart the backend; it auto-creates it, or run `npm run db:setup`.
- **Port 3307 refused** → Ensure XAMPP MySQL is running and configured for 3307. Check `C:\xampp\mysql\bin\my.ini`.
- **API on different port** → Edit `backend/.env` (`PORT`, `DB_PORT`).

---

Powered by **Pracharam Media** · © 2026 Telugu Icon Digital & Influencer Awards