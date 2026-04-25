# Ravah Dashboard

Production-ready MVP DevOps control plane UI built with Next.js 14, Prisma, and Tailwind.

## Environment variables

```bash
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="replace-with-random-secret"
GITHUB_ID="github-oauth-client-id"
GITHUB_SECRET="github-oauth-client-secret"
# Backward-compatible aliases also supported:
# GITHUB_CLIENT_ID=...
# GITHUB_CLIENT_SECRET=...
GITHUB_WEBHOOK_SECRET="webhook-secret"
DEMO_MODE="true"
```

## Install

```bash
npm install
```

## Database setup

Create a local SQLite database (default) and run migrations:

```bash
export DATABASE_URL="file:./dev.db"
npx prisma migrate dev
```

## Seed data

```bash
npx prisma db seed
```

## Run the app

```bash
npm run dev
```

## Switch SQLite → Postgres

1. Update `DATABASE_URL` to a Postgres connection string.
2. Change the `provider` in `prisma/schema.prisma` to `postgresql`.
3. Run migrations again:

```bash
npx prisma migrate dev
```

## GitHub OAuth setup

1. Create a GitHub OAuth App and set the callback URL to `http://localhost:3000/api/auth/callback/github`.
2. Add `GITHUB_ID`, `GITHUB_SECRET`, and `NEXTAUTH_SECRET` to your env (or use `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` aliases).

## GitHub webhook setup (GitHub App)

1. Configure your GitHub App webhook to `http://localhost:3000/api/webhooks/github`.
2. Set the webhook secret and add `GITHUB_WEBHOOK_SECRET` to your env.
3. Install the app on a repository; map the installation ID to an org/project via `IntegrationGithub`.

## Test ingestion

1. Run the dev server.
2. Trigger a failed GitHub Action in the connected repo.
3. Visit `/pipelines` and verify the run appears and the System Insight drawer opens.

## Tests

```bash
npm run test:e2e
```
