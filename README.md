# Dot

A small, private family cycle-tracking app. No public registration, no analytics, no ads, no third-party tracking.

## Who it's for

Three accounts: one child, two parents. The child owns their data. Parents see only what the child shares.

---

## Project structure

```
dot-family-app/
├── backend/    Laravel API (Sanctum token auth) — complete app, no scaffolding needed
└── frontend/   React + Vite (Tailwind CSS)
```

---

## Local setup

### Requirements

- PHP 8.4+
- Composer
- Node 18+
- PostgreSQL 14+ (local) or Railway Postgres plugin

### 1. Clone and enter the repo

```bash
git clone https://github.com/sebastianvidaldesign-bookedkit/dot-family-app.git
cd dot-family-app
```

### 2. Backend

`backend/` is a complete Laravel app. No scaffolding required.

```bash
cd backend

# Install dependencies
composer install

# Configure environment
cp .env.example .env
# Edit .env: set DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD
# DB_CONNECTION is already set to pgsql

# Generate app key
php artisan key:generate

# Run migrations + seed
php artisan migrate
php artisan db:seed

# Start dev server
php artisan serve
```

API runs at http://localhost:8000

**Seed credentials (change before deploying)**

| Role  | Email              | Password |
|-------|--------------------|----------|
| Child | child@dot.family   | password |
| Dad   | dad@dot.family     | password |
| Mom   | mom@dot.family     | password |

### 3. Frontend

```bash
cd frontend
npm install

# Configure API URL
cp .env.example .env.local
# Edit .env.local: VITE_API_URL=http://localhost:8000/api

npm run dev
```

Frontend runs at http://localhost:5173

---

## Environment variables

### Backend (`backend/.env`)

| Variable                   | Description                                    |
|----------------------------|------------------------------------------------|
| `APP_KEY`                  | Laravel app key — run `php artisan key:generate --show` |
| `APP_ENV`                  | `production`                                   |
| `APP_URL`                  | Full URL of the backend Railway service        |
| `DB_CONNECTION`            | `pgsql`                                        |
| `DB_HOST`                  | Postgres host                                  |
| `DB_PORT`                  | `5432`                                         |
| `DB_DATABASE`              | Postgres database name                         |
| `DB_USERNAME`              | Postgres user                                  |
| `DB_PASSWORD`              | Postgres password                              |
| `DB_SSLMODE`               | `require` (Railway Postgres requires SSL)      |
| `FRONTEND_URL`             | Frontend service URL (used for CORS)           |
| `SANCTUM_STATEFUL_DOMAINS` | Frontend domain(s), comma-separated            |

### Frontend (`frontend/.env`)

| Variable        | Description                  |
|-----------------|------------------------------|
| `VITE_API_URL`  | Full URL of the backend API  |

---

## Railway deployment

Railway runs two separate services (backend and frontend) plus a Postgres plugin.

### Step 1 — Create project and add Postgres

1. Go to [railway.app](https://railway.app) and create a new project.
2. Click **+ New** → **Database** → **Add PostgreSQL**.
3. Railway will provision a Postgres instance and expose its credentials as variables.

### Step 2 — Deploy backend

1. Click **+ New** → **GitHub Repo**, select this repo, set **Root Directory** to `backend`.
2. Railway detects PHP via Nixpacks and runs `composer install --no-dev`.
3. In the backend service **Variables** tab, add:

```
APP_KEY=          ← run locally: php artisan key:generate --show
APP_ENV=production
APP_DEBUG=false
APP_URL=https://<your-backend-domain>.railway.app

DB_CONNECTION=pgsql
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_DATABASE=${{Postgres.PGDATABASE}}
DB_USERNAME=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_SSLMODE=require

FRONTEND_URL=https://<your-frontend-domain>.railway.app
SANCTUM_STATEFUL_DOMAINS=<your-frontend-domain>.railway.app
```

> The `${{Postgres.PGHOST}}` syntax is Railway's variable reference — it pulls values
> directly from the Postgres plugin. No credentials are hardcoded in the repo.

4. Deploy. The start command in `railway.json` runs `php artisan migrate --force` automatically.
5. After first deploy, create the three family accounts using the production setup command:

```bash
railway run --service=backend php artisan dot:create-family-users \
  --child-email="child@yourdomain.com" \
  --child-password="choose-a-strong-password" \
  --dad-email="dad@yourdomain.com" \
  --dad-password="choose-a-strong-password" \
  --mom-email="mom@yourdomain.com" \
  --mom-password="choose-a-strong-password"
```

The command is **idempotent** — safe to run again if you need to change passwords or recover from a mistake. It will update existing accounts without duplicating data.

> **Never commit real email addresses or passwords to the repo.** Pass them only via
> the Railway CLI or Railway's environment variable UI.

6. Confirm the backend is healthy:

```
GET https://<your-backend-domain>.railway.app/api/health
```

Expected response:
```json
{ "ok": true, "app": "Dot", "database": "connected" }
```

### Step 3 — Deploy frontend

1. Add another **New Service → GitHub Repo** in the same project.
2. Set **Root Directory** to `frontend`.
3. Set this environment variable:

```
VITE_API_URL=https://<your-backend-domain>.railway.app/api
```

4. Deploy. Railway builds with `npm run build` and serves with `npx serve dist`.

### Step 4 — Custom domains (optional)

In each service's Settings → Domains, add a custom domain or use the generated `.railway.app` URLs.

---

## Security and privacy

### Threat model

Dot is a private family app with three known users. The security goal is to protect one child's sensitive health data from anyone outside the family, and from parents who have not been explicitly granted access by the child.

### Privacy guarantees

- No Google Analytics, Meta Pixel, PostHog, Sentry, or any third-party tracking.
- Health data is never logged to stdout, server logs, or error messages.
- Period details are never included in any email or notification.
- Private notes are never returned to parent accounts, at any sharing level.
- The Nunito font is self-hosted in the build — no external font requests.
- HTTPS enforced by Railway.

### Authentication

- Passwords are hashed with bcrypt (`Hash::make`). Never stored or logged in plaintext.
- Login returns a Sanctum bearer token (30-day expiry by default).
- Bearer tokens are stored in `localStorage` on the client.
- Login is rate-limited to 5 attempts per minute per IP.
- Logout revokes the current token immediately.

### Authorization

- Every API endpoint except `GET /api/health` and `POST /api/auth/login` requires a valid bearer token.
- Child-only routes are guarded by `role:child` middleware.
- Parent-only routes are guarded by `role:parent` middleware.
- All child data operations (period logs, notes, cycle profile) are scoped to `$request->user()->cycleProfile` — the child's own profile. No ID is accepted from the frontend for these lookups.
- Parent dashboard is scoped to the family the parent belongs to. A parent cannot query another family's data.
- Note ownership is verified before update or delete: `$note->cycle_profile_id !== $profile->id`.

### Sharing privacy

- Sharing defaults to **off** for both parents.
- Dad and mom sharing are independent boolean toggles.
- The parent dashboard returns `{"shared": false}` if sharing is off — no health data is returned.
- `share_level` controls what is visible when sharing is on: `basic` (dates only), `flow`, `symptoms`, `everything`.
- `everything` still excludes private notes — notes are never sent to parents.

### Data at rest

- Note body text is encrypted with Laravel's built-in AES-256 encryption (requires `APP_KEY`). Stored as ciphertext in the database.

### No public registration

There is no registration endpoint or registration screen. Accounts can only be created via:

```bash
php artisan dot:create-family-users
```

### Rotating passwords

```bash
railway run --service=backend php artisan dot:create-family-users \
  --child-email="child@yourdomain.com" \
  --child-password="new-strong-password" \
  --dad-email="dad@yourdomain.com" \
  --dad-password="new-strong-password" \
  --mom-email="mom@yourdomain.com" \
  --mom-password="new-strong-password"
```

The command is idempotent — existing accounts are updated, not duplicated.

### Revoking tokens

To revoke all sessions for a user (e.g. lost device):

```bash
railway run --service=backend php artisan tinker
# In tinker:
\App\Models\User::where('email', 'child@yourdomain.com')->first()->tokens()->delete();
```

### Delete all data

To permanently erase all health data and user accounts (run on Railway):

```bash
railway run --service=backend php artisan dot:delete-all-data
```

Deletes: users, families, family members, cycle profiles, period logs, symptom logs, notes, and all auth tokens.

### Required environment variables

| Variable               | Notes                                         |
|------------------------|-----------------------------------------------|
| `APP_KEY`              | Laravel encryption key — never commit this    |
| `APP_ENV`              | Must be `production` on Railway               |
| `APP_DEBUG`            | Must be `false` on Railway                    |
| `DB_HOST` etc.         | Use Railway variable references `${{Postgres.PGHOST}}` |
| `DB_SSLMODE`           | `require`                                     |
| `FRONTEND_URL`         | Exact frontend URL — used for CORS allowlist  |
| `SANCTUM_TOKEN_EXPIRY` | Token lifetime in minutes (default: 43200 = 30 days) |

### What not to log

- Passwords (in any form)
- Bearer tokens
- Period dates, flow values, symptoms, note content
- User email addresses in health-related log lines

---

## Roles

| Role   | What they can do                                              |
|--------|---------------------------------------------------------------|
| child  | Log period days, flow, symptoms. Manage sharing settings.     |
| parent | Read-only dashboard. Sees only what child has shared.         |

Parents cannot edit or add any data. All sharing defaults to **off** — the child must explicitly enable it.

## Sharing levels

| Level       | What parents see                              |
|-------------|-----------------------------------------------|
| basic       | Period start and end dates only               |
| flow        | Dates + how heavy the flow was                |
| symptoms    | Dates + symptoms (cramps, tired, etc.)        |
| everything  | Dates, flow, symptoms (no private notes)      |

## Prediction logic

- Fewer than 2 cycle starts → "still learning" message, no estimate shown.
- 2+ starts → average the gaps between start dates.
- Gaps under 15 days or over 60 days are excluded (likely data errors).
- Result shown as a ±3-day range, not a single date.
- Copy is calm and non-medical.
