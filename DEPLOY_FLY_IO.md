# Deploy API + Hosted SQLite on Fly.io (QA + Production)

This setup keeps your current SQLite implementation (`better-sqlite3`) and hosts each environment DB on its own persistent Fly volume.

## Why this works

- Your API stays unchanged.
- SQLite file is no longer on your laptop; it lives on Fly disk at `/data/data.qa.db` (QA) or `/data/data.prod.db` (production).
- Volumes survive restarts/redeploys.
- QA and production are isolated at both app and database level.

## 1) Install and login

```bash
brew install flyctl
fly auth login
```

## 2) Create apps and persistent volumes

Run from project root:

```bash
# QA
fly apps create samossa-api-qa
fly volumes create samossa_data_qa --app samossa-api-qa --region fra --size 3

# Production
fly apps create samossa-api-prod
fly volumes create samossa_data_prod --app samossa-api-prod --region fra --size 3
```

Notes:

- Region `fra` is set in `fly.qa.toml` and `fly.prod.toml`. Change it if needed.
- Keep one machine for SQLite consistency.

## 3) Set QA and production secrets

```bash
# QA
fly secrets set \
  GOOGLE_CLIENT_ID="your_qa_google_client_id" \
  VITE_GOOGLE_CLIENT_ID="your_qa_google_client_id" \
  VITE_API_BASE_URL="https://samossa-api-qa.fly.dev" \
  --app samossa-api-qa

# Production
fly secrets set \
  GOOGLE_CLIENT_ID="your_google_client_id" \
  VITE_GOOGLE_CLIENT_ID="your_google_client_id" \
  VITE_API_BASE_URL="https://samossa-api-prod.fly.dev" \
  --app samossa-api-prod
```

If your app names differ, use matching URLs.

## 4) Deploy each environment

```bash
# QA
fly deploy -c fly.qa.toml

# Production
fly deploy -c fly.prod.toml
```

## 5) Verify

```bash
fly status --app samossa-api-qa
fly logs --app samossa-api-qa
curl https://samossa-api-qa.fly.dev/api/places

fly status --app samossa-api-prod
fly logs --app samossa-api-prod
curl https://samossa-api-prod.fly.dev/api/places
```

## Important production notes

- Current auth sessions are in-memory in `server/routes.ts`. Users will be logged out on restart/redeploy.
- Scale to a single machine for SQLite + in-memory session behavior:

```bash
fly scale count 1 --app samossa-api-qa
fly scale count 1 --app samossa-api-prod
```

- For multi-instance production, move sessions to Redis/Postgres-backed session store.
