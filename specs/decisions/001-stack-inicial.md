# ADR 001 — Stack inicial e modelo de projeto

**Status:** Accepted
**Data:** 2026-05-17

## Contexto

Início do projeto `assets-db`: sistema pessoal para controle de ativos financeiros (CRIs primeiro, depois LCIs, LCAs, CRAs, FIIs, ações, etc.) com foco em visualizar eventos (pagamentos, amortizações, bônus).

Restrições e requisitos relevantes:

- Uso pessoal (single-user), sem necessidade de auth no MVP.
- Stack moderna em JS/TS (Next.js + Node.js) por preferência do autor.
- Evolução incremental — começar pelo cadastro de **um** tipo de ativo (CRI) e crescer.
- Workflow spec-driven (regras descritas em `CLAUDE.md`).

## Decisão

Adotar a seguinte stack e modelo de projeto:

| Camada | Escolha |
|---|---|
| Repo | Monorepo pnpm (`apps/web`, `apps/api`, `packages/shared`) |
| Backend | Node.js + Fastify + Prisma + Zod |
| Frontend | Next.js (App Router) + Tailwind + shadcn/ui |
| Banco | PostgreSQL 16 via `docker-compose` |
| Linguagem | TypeScript, modo `strict` em todo o repo |
| Auth | Nenhuma no MVP (single-user) |
| Testes | Sem testes obrigatórios no MVP; Vitest quando aparecer cálculo/regra de negócio |

## Alternativas consideradas

### Estrutura do repositório
- **Next.js fullstack (API routes / Server Actions):** mais simples para começar, mas acopla front e back desde o dia 1 e dificulta substituir um deles.
- **Dois repos separados:** muita fricção operacional para um projeto pessoal.
- **Monorepo pnpm (escolhido):** separação clara web/api, compartilhamento de tipos via `packages/shared`, baixo custo de setup.

### Modelo de usuário
- **Multi-usuário desde o início (NextAuth/Clerk + `user_id` em tudo):** trabalho real adicional para um benefício que pode nunca se materializar (uso pessoal).
- **Single-user (escolhido):** modelo de dados muito mais simples, sem auth. Migração futura é desconfortável mas factível (uma migration adicionando `user_id` + middleware de tenancy).

### Banco + ORM
- **PostgreSQL + Drizzle:** SQL-first, leve, sem mágica. Trade-off: ferramental ainda menos maduro que Prisma.
- **SQLite + Prisma:** zero infra. Trade-off: tipos numéricos e diferenças de SQL frente ao alvo de produção (Postgres) eventualmente mordem.
- **PostgreSQL + Prisma (escolhido):** ecossistema/migrations/types maduros, melhor DX, Docker resolve a infra local.

### Framework HTTP do backend
- **Express:** padrão de fato, mas DX TypeScript fraca; validação manual.
- **Hono:** edge-friendly, ultraleve. Trade-off: ecossistema menor; vantagem não justifica para uma API rodando em Node tradicional.
- **NestJS:** estrutura opinionada (DI, decorators, módulos). Trade-off: boilerplate grande para um projeto pessoal.
- **Fastify (escolhido):** rápido, validação nativa via JSON Schema, ótima tipagem com plugins, equilíbrio entre leveza e estrutura.

### UI library
- **Mantine:** muitos componentes prontos. Trade-off: estética menos customizável, dependência forte.
- **MUI:** clássico Material; bundle grande, estética muito reconhecível.
- **Sem lib, só Tailwind:** trabalho inicial alto.
- **shadcn/ui + Tailwind (escolhido):** componentes copiados pro projeto, totalmente customizáveis, padrão atual do ecossistema Next.

## Consequências

### Positivas
- Separação web/api permite trocar uma camada sem reescrever a outra.
- Tipos compartilhados via `packages/shared` reduzem duplicação de schemas Zod.
- Postgres + Prisma minimiza divergência entre dev local e um futuro deploy.
- Fastify + Zod dá validação forte na fronteira HTTP com pouco código.
- shadcn/ui evita lock-in: cada componente é código do projeto.

### Negativas / custos
- Monorepo adiciona conceitos (workspaces, paths) que custariam zero em fullstack Next.
- Sem auth significa que o banco tem que ser tratado como dado sensível local — não expor a porta `5432` para fora do localhost.
- Stack com várias peças (Fastify, Prisma, Next, shadcn) tem mais superfície para atualizar.

### Neutras / a observar
- Se virar produto multi-usuário, custo de adicionar auth é real mas isolado a backend + uma migration. Aceitar esse custo futuro.
- Se um dia fizer sentido SSR pesado dependendo de dados do backend, eventualmente avaliar consolidar em Next fullstack. Não é decisão pra agora.

## Referências

- [CLAUDE.md](../../CLAUDE.md) — regras de processo
- [README.md](../../README.md) — onboarding
