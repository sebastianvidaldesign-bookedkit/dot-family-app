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

## Privacy notes

- No Google Analytics, Meta Pixel, PostHog, or any third-party tracking.
- Health data is not logged to stdout or server logs.
- Period details are never included in any email.
- Passwords are bcrypt-hashed.
- HTTPS enforced by Railway.
- All tokens are Sanctum bearer tokens stored in localStorage.

## Delete all data

To permanently erase all health data and user accounts:

```bash
php artisan dot:delete-all-data
```

This command requires interactive confirmation and deletes everything: users, families, cycle profiles, period logs, symptom logs, and notes.

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
