# CyberLab Portal

## Overview

A cybersecurity lab booking platform where students can register, browse labs, pay via Easebuzz, and provision on-demand isolated security lab environments.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: Clerk (via Replit-managed whitelabel)
- **Payment**: Easebuzz (test mode placeholder — add EASEBUZZ_KEY + EASEBUZZ_SALT to go live)
- **Frontend**: React + Vite + Tailwind v4 + shadcn/ui

## Artifacts

- **CyberLab Portal** (`artifacts/cyberlab`) — React + Vite web app, served at `/`
- **API Server** (`artifacts/api-server`) — Express 5 REST API, served at `/api`

## Key Features

1. Student registration & login (Clerk auth)
2. Browse cybersecurity labs by category/difficulty
3. Select lab + hours → book → payment via Easebuzz
4. After payment: "Provision Lab" button calls provision API
5. Dashboard with booking stats and history

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Environment Variables

- `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` — auto-provisioned by Replit Clerk
- `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — auto-provisioned DB
- `EASEBUZZ_KEY` — Easebuzz merchant key (add when ready for live payments)
- `EASEBUZZ_SALT` — Easebuzz salt (add when ready for live payments)
- `EASEBUZZ_ENV` — set to `production` for live Easebuzz gateway (default: `test`)

## Lab Provision API

The provision endpoint at `POST /api/bookings/:id/provision` currently uses a placeholder implementation.
To connect your real lab provisioning REST API, update `artifacts/api-server/src/routes/bookings.ts`
in the `router.post("/bookings/:id/provision", ...)` handler.

## Easebuzz Integration

Currently in test/placeholder mode. To go live:
1. Set `EASEBUZZ_KEY` and `EASEBUZZ_SALT` environment secrets
2. Set `EASEBUZZ_ENV=production`
3. Update `artifacts/api-server/src/routes/payments.ts` to call the Easebuzz `/payment/initiateLink` API
   and return the real `accessKey` from their response

## DB Schema

- `labs` — cybersecurity lab catalog (6 labs pre-seeded)
- `bookings` — student bookings with status: pending → paid → provisioned

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
