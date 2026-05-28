# assets-db

Personal tracker for Brazilian fixed-income assets (CRI, LCI, LCA, CRA, and — eventually — FII, stocks, etc.) with a focus on visualizing the **events** of each asset: interest payments, amortizations, bonuses, and so on.

> Domain terms (asset types, fields, routes) are kept in Portuguese because they map to specific Brazilian financial instruments with no clean English equivalent (e.g. CRI = *Certificado de Recebíveis Imobiliários*). Code identifiers and UI strings follow the same convention.

## Stack

- pnpm monorepo: `apps/web`, `apps/api`, `packages/shared`
- **API:** Node.js + Fastify + Prisma + Zod
- **Web:** Next.js (App Router) + Tailwind + shadcn/ui
- **Database:** PostgreSQL 16 via `docker-compose`
- **Language:** TypeScript, strict mode everywhere

## Prerequisites

- Node.js >= 22 (see `.nvmrc`)
- pnpm >= 9 (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker + Docker Compose

## Getting started

```bash
# Install dependencies
pnpm install

# Bring up local Postgres
pnpm db:up

# Tail Postgres logs
pnpm db:logs

# Open psql inside the container
pnpm db:psql

# Stop Postgres
pnpm db:down
```

The default connection string is `postgresql://assets:assets@localhost:5432/assets_db`. Copy `.env.example` to `.env` at the repo root (or inside `apps/api/`).

## Project layout

```
.
├── apps/
│   ├── api/         # Fastify + Prisma
│   └── web/         # Next.js
├── packages/
│   └── shared/      # Zod schemas and shared domain types
├── docker-compose.yml
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Conventions

- TypeScript `strict: true` and `noUncheckedIndexedAccess: true` everywhere.
- Validate inputs at every boundary (HTTP, env, files) with Zod.
- Domain schemas and types live in `packages/shared` and are consumed by both web and api.
- Tests are not mandatory, but any non-trivial calculation or business rule should be covered with Vitest.

## Contributing

Issues and pull requests are welcome. There is no enforced commit message convention — keep messages clear and in English for new contributions.

## License

MIT
