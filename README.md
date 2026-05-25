# EPG CMS Platform

Production-oriented OTT Electronic Program Guide CMS for live TV channel management,
media assets, scheduling workflows, public EPG APIs, Redis-backed caching, and future
worker/importer services.

The schedule module is the core domain. CRUD screens are only the admin surface around
timeline validation, overlap prevention, gap warnings, auto-snap logic, publish workflow,
audit logging, and public cached EPG delivery.

## Repository Structure

```text
apps/
  admin-web/      React + Vite admin CMS
  api/            NestJS admin/API service
  worker/         Future BullMQ background workers
  public-api/     Future standalone public EPG API
  epg-importer/   Future schedule/import pipelines
packages/
  shared/         Shared enums, DTOs, interfaces, permissions
  config/         Shared lint, prettier, and TypeScript config
infra/            Docker, Nginx, PostgreSQL, Redis, K8s, Terraform, monitoring
docs/             Product and engineering documentation
scripts/          Local development helper scripts
```

## Required Tools

- Node.js 22
- pnpm 10+
- Docker and Docker Compose

Use the pinned Node version:

```sh
nvm use
corepack enable
pnpm install
```

## Environment

Copy `.env.example` when creating local overrides. Development defaults are already in
`.env.development`.

Important variables:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: JWT signing secret
- `API_PORT`: NestJS API port, default `3001`
- `VITE_API_BASE_URL`: Admin web API base URL

## Development Commands

```sh
pnpm dev          # run workspace dev tasks through Turborepo
pnpm build        # build all packages/apps
pnpm lint         # lint all packages/apps
pnpm typecheck    # TypeScript checks
pnpm format       # format source/config/docs
```

## Docker

```sh
pnpm docker:up
pnpm docker:down
```

Docker Compose starts:

- PostgreSQL 16 on `localhost:5432`
- Redis 7 on `localhost:6379`
- API on `localhost:3001`
- Admin web on `localhost:3000`

## Database

```sh
pnpm db:generate
pnpm db:migrate
pnpm db:seed
scripts/reset-db.sh
```

The initial Prisma schema includes users, channels, assets, schedules, and schedule
audit logs. Database columns are mapped to `snake_case`; TypeScript/API fields remain
camelCase.

## Current App Skeletons

The API is a NestJS skeleton with modules for:

- Auth
- Users
- Channels
- Assets
- Schedules
- Public API
- Audit Logs

The schedule module includes placeholders for timeline, validation, overlap detection,
gap detection, auto-snap, publishing, snapshots, conflict engine, and cache boundaries.

The admin web app is a React + Vite + TypeScript skeleton with Ant Design layout and
routes for login, dashboard, channels, assets, schedules, users, and audit logs.

## Next Development Roadmap

1. Implement Auth with JWT, password hashing, guards, and RBAC permissions.
2. Build Channels and Assets modules with DTO validation and Prisma repositories.
3. Implement Schedule write operations inside Prisma transactions.
4. Add schedule validation for start/stop/duration, overlap prevention, and gap warnings.
5. Add auto-snap behavior against previous schedule stop time.
6. Add draft-to-published workflow with versioning and audit logs.
7. Add Redis cache invalidation and public EPG read APIs.
8. Introduce worker/importer services for external EPG ingestion and background jobs.
