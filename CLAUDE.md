# CLAUDE.md — Convenções do projeto assets-db

Este arquivo descreve **como** trabalhamos neste repositório. Regras estáveis, não conteúdo de features (isso vai em `specs/features/`) nem decisões arquiteturais isoladas (isso vai em `specs/decisions/`).

## Sobre o projeto

`assets-db` é um sistema pessoal para controle de ativos financeiros (CRIs primeiro, depois LCIs, LCAs, CRAs, FIIs, ações etc.) com foco em **visualizar eventos** desses ativos: pagamentos de juros, amortizações, bônus etc.

Stack base (ver [`specs/decisions/001-stack-inicial.md`](specs/decisions/001-stack-inicial.md) para o porquê):

- Monorepo pnpm (`apps/web`, `apps/api`, `packages/shared`)
- **API:** Node.js + Fastify + Prisma + Zod
- **Web:** Next.js (App Router) + Tailwind + shadcn/ui
- **Banco:** PostgreSQL 16 via `docker-compose`
- **Linguagem:** TypeScript em tudo, modo strict
- **Modelo:** single-user, sem autenticação

## Regras de processo (spec-driven)

1. **Spec antes de código.** Implementação sem spec aprovada em `specs/features/` é bug de processo. A spec é o contrato; o código é a entrega desse contrato.
2. **Não inventar forward references.** Se uma spec menciona "isso virá em 002" ou "decidir em ADR X", confirmar com `ls specs/features/` ou `ls specs/decisions/` antes de propor trabalho baseado nisso. Só existe o que está no disco.
3. **Não inventar requisitos.** Se a spec não cobre um caso, perguntar ao usuário, não chutar.
4. **Spec curta > spec exaustiva.** O objetivo é alinhamento, não esgotamento. Decisões discutíveis viram ADR separado.
5. **Numeração contígua, sem reaproveitar.** Spec `001` fica `001` pra sempre, mesmo se for refeita ou superseded.
6. **ADR é imutável.** Mudou de ideia? Cria ADR novo que marca o antigo como `Superseded by`. Não edita o antigo.

## Ciclo por feature

```
1. Spec rascunho      →  Escrever specs/features/NNN-*.md (status: Draft)
2. Review             →  Usuário lê, marca dúvidas, aprova (status: Active)
3. ADRs se necessário →  Decisões estruturais viram specs/decisions/NNN-*.md
4. Implementação      →  Em fases pequenas (cada fase = commit revisável)
5. Spec viva          →  Se algo mudar durante o código, ATUALIZAR a spec junto
6. Encerramento       →  Smoke test manual, marcar critérios de aceite ✓ na
                         spec, mover pendências para BACKLOG.md (status: Closed)
```

## Documentando mudanças após uma feature fechada

Toda spec tem 3 estados: **Draft → Active → Closed**. Depois de `Closed`, a spec é imutável exceto pelo campo `Modificada por:` no header.

| Quando | O que fazer |
|---|---|
| Durante implementação (Active) | Editar a spec em pé + ajustar código no mesmo commit |
| Smoke test final antes de fechar | Registrar finding em `## Validação`, ajustar, atualizar spec, fechar |
| Após fechada — ajuste pequeno | Nova spec `00N-ajustes-*.md` curta, referenciando a original. No header da original adicionar `Modificada por: [[00N]]` |
| Após fechada — mudança grande | Nova spec de feature, mesmo ciclo completo |
| Após fechada — mudança estrutural | Novo ADR + nova spec de feature |

Por que spec fechada é imutável: o valor do documento é ser **um registro pontual** do que foi acordado naquele dia. Editar três meses depois apaga essa propriedade.

## Pendências pequenas que não viram spec

`BACKLOG.md` na raiz, uma linha por item, com data. Quando uma vira prioridade, sai do BACKLOG e vira spec.

## Estrutura de pastas

```
.
├── apps/
│   ├── api/         # Fastify + Prisma
│   └── web/         # Next.js
├── packages/
│   └── shared/      # Schemas Zod + tipos compartilhados
├── specs/
│   ├── features/    # Specs de features (NNN-*.md)
│   │   └── _TEMPLATE.md
│   └── decisions/   # ADRs (NNN-*.md)
│       └── _TEMPLATE.md
├── docker-compose.yml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── CLAUDE.md        # este arquivo
├── README.md        # onboarding humano
└── BACKLOG.md       # pendências sem spec
```

## Convenções de código

- TypeScript `strict: true` + `noUncheckedIndexedAccess: true` em todo lugar.
- Validação de input em qualquer fronteira (HTTP, env, arquivo) com Zod.
- Schemas Zod e tipos do domínio moram em `packages/shared` e são consumidos por web e api.
- Sem testes obrigatórios no MVP, mas se algum cálculo ou regra de negócio aparecer, testar com Vitest.
- Sem comentários decorativos. Comentário só quando o porquê não é óbvio do código.
- Mensagens de commit em português, presente, imperativo. Ex: `feat(api): adiciona rota POST /cris`.

## Como rodar

Ver [README.md](README.md).
