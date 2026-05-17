# assets-db

Controle pessoal de ativos financeiros (CRIs, LCIs, LCAs, CRAs, FIIs, ações, etc.) com foco em visualizar os eventos de cada ativo: pagamentos de juros, amortizações, bônus, etc.

Estado atual: **bootstrap** — só infraestrutura. Nenhuma feature implementada ainda. Próxima feature: cadastro de CRI (`specs/features/001-cadastro-de-cri.md`, ainda a escrever).

## Stack

- Monorepo pnpm: `apps/web`, `apps/api`, `packages/shared`
- **API:** Node.js + Fastify + Prisma + Zod
- **Web:** Next.js (App Router) + Tailwind + shadcn/ui
- **Banco:** PostgreSQL 16 via `docker-compose`
- **Linguagem:** TypeScript em modo strict

Decisões e contexto em [`specs/decisions/001-stack-inicial.md`](specs/decisions/001-stack-inicial.md).

## Pré-requisitos

- Node.js >= 22 (ver `.nvmrc`)
- pnpm >= 9 (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker + Docker Compose

## Como rodar (estado atual)

```bash
# Subir o Postgres local
pnpm db:up

# Logs do Postgres
pnpm db:logs

# Abrir psql no container
pnpm db:psql

# Derrubar o Postgres
pnpm db:down
```

A connection string padrão é `postgresql://assets:assets@localhost:5432/assets_db`. Copie `.env.example` para `.env` na raiz (ou em `apps/api/` quando ele existir).

> Ainda não há `apps/api` ou `apps/web` instaláveis — serão criados nas próximas etapas do roadmap.

## Documentação

- [CLAUDE.md](CLAUDE.md) — convenções do projeto e processo spec-driven
- [BACKLOG.md](BACKLOG.md) — pendências pequenas sem spec
- [specs/features/](specs/features/) — specs de features (uma por feature)
- [specs/decisions/](specs/decisions/) — ADRs (decisões arquiteturais)

## Roadmap próximo

1. **Etapa 1:** Escrever `specs/features/001-cadastro-de-cri.md`
2. **Etapa 2:** Implementar API de CRI (`apps/api`)
3. **Etapa 3:** Schemas compartilhados (`packages/shared`)
4. **Etapa 4:** Web do CRI (`apps/web`)
5. **Etapa 5:** Smoke test manual + ajustes
