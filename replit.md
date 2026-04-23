# Network Navigator

## Overview

A full-stack web app for early-career professionals to log networking connections, set follow-up reminders, and track their follow-through rate.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (`artifacts/network-navigator`, port 18099, preview path `/`)
- **API**: Express 5 (`artifacts/api-server`, port 8080, preview path `/api`)
- **Database**: PostgreSQL (external Supabase) + Drizzle ORM
- **Auth**: Clerk (`@clerk/express` server, `@clerk/react` frontend)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from `lib/api-spec/openapi.yaml`)
- **Build**: esbuild (api-server bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate hooks + Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes to Supabase
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/network-navigator run dev` — run frontend locally

## Architecture

```
lib/
  api-spec/openapi.yaml        — OpenAPI contract (source of truth)
  api-client-react/            — Generated React Query hooks (@workspace/api-client-react)
  api-zod/                     — Generated Zod schemas for API validation
  db/                          — Drizzle schema + db connection
    src/schema/connections.ts
    src/schema/followUps.ts

artifacts/
  api-server/                  — Express REST API
    src/app.ts                 — Clerk middleware, CORS, routing
    src/routes/connections.ts  — CRUD for connections
    src/routes/followUps.ts    — CRUD + complete for follow-ups
    src/routes/dashboard.ts    — Dashboard summary + progress stats

  network-navigator/           — React + Vite frontend
    src/App.tsx                — ClerkProvider, Wouter routing, auth guards
    src/pages/
      Landing.tsx              — Public landing page
      Dashboard.tsx            — Follow-up overview + stats
      Connections.tsx          — Connection list + add/delete
      ConnectionDetail.tsx     — Connection detail + follow-up history
      FollowUps.tsx            — All follow-ups with status filter
      Progress.tsx             — Follow-through rate + history
    src/components/
      AppLayout.tsx            — Sidebar navigation layout
```

## Data Model

- `connections`: id, userId, name, notes, createdAt, updatedAt
- `follow_ups`: id, connectionId, userId, scheduledDate, originalDueDate, completedAt, createdAt, updatedAt

## Environment Variables

- `CONNECTION_STRING` — Supabase PostgreSQL connection string
- `CLERK_SECRET_KEY` — Auto-provisioned by Clerk integration
- `VITE_CLERK_PUBLISHABLE_KEY` — Auto-provisioned by Clerk integration

## Auth Pattern

- Web: Clerk session cookies (no token getter needed)
- API: `requireAuth()` middleware from `@clerk/express`, `getAuth(req).userId!` to get user ID
- Frontend: `<Show when="signed-in">` / `<Show when="signed-out">` from `@clerk/react`
