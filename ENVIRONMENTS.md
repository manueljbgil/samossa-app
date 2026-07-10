# Environment Setup (Development/QA + Production)

This project now supports two runtime environments end-to-end for both backend and frontend:

- development (can be used as QA)
- production

## 1) Local environment files

Create your local files from the templates:

```bash
cp .env.development.example .env.development
cp .env.production.example .env.production
```

Variables used by both apps:

- `APP_ENV` - controls backend environment behavior (`development` or `production`)
- `PORT` - backend server port
- `DATABASE_FILE` - SQLite database location per environment
- `GOOGLE_CLIENT_ID` - backend Google OAuth verification client id
- `VITE_GOOGLE_CLIENT_ID` - frontend Google sign-in client id
- `VITE_API_BASE_URL` - frontend API base URL

Notes:

- For same-origin deployments, set `VITE_API_BASE_URL` to empty.
- Use different `DATABASE_FILE` values per environment so dev/qa and production data are isolated.

## 2) Local commands

Development/QA:

```bash
npm run dev
```

Build and run production locally:

```bash
npm run build:production
npm run start:production
```

Build and run development artifact (useful for QA-like staging checks):

```bash
npm run build:development
npm run start:development
```

## 3) GitHub environments and branch mapping

The deploy workflow maps branches to environments:

- `develop` -> `development` environment
- `main` -> `production` environment

Create two GitHub Environments in repository settings:

- `development`
- `production`

In each environment, configure:

Required secrets:

- `GOOGLE_CLIENT_ID`
- `DEV_DEPLOY_WEBHOOK_URL` (development)
- `PROD_DEPLOY_WEBHOOK_URL` (production)

Optional variables:

- `PORT`
- `DATABASE_FILE`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_API_BASE_URL`

The workflow builds the app with environment-specific values and then calls the environment webhook to trigger deployment in your hosting platform.
