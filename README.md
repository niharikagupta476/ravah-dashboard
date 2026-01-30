# Ravah Dashboard

Production-ready MVP DevOps control plane UI built with Next.js 14, Prisma, and Tailwind.

## Install

```bash
npm install
```

## Database setup

Create a local SQLite database (default) and run migrations:

```bash
export DATABASE_URL="file:./dev.db"
npm run prisma:migrate
```

## Seed data

```bash
npm run prisma:seed
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
npm run prisma:migrate
```

## Tests

```bash
npm run test:e2e
```
