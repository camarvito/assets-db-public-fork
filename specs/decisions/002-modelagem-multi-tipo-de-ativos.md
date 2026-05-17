# ADR 002 — Modelagem multi-tipo de ativos (CTI)

**Status:** Accepted
**Data:** 2026-05-17

## Contexto

O sistema vai gerenciar vários tipos de ativos financeiros (CRI, LCI, LCA, CRA, FII, ações, etc.), começando por CRI. Dois requisitos importantes do usuário tensionam a modelagem:

1. **Tipagem forte por tipo.** Cada tipo tem campos próprios (CRI tem `taxa` e `valorNominal`, ações não têm). Validação e UI devem ser específicas por tipo.
2. **Consultas cross-tipo.** O usuário quer perguntar coisas como "todos os ativos indexados por IPCA" ou "todos os ativos comprados em 2025", sem importar o tipo.

Esses dois requisitos eliminam as soluções simples:
- Tabelas totalmente separadas (uma por tipo) atendem (1) mas obrigam UNION para (2).
- Tabela única com `tipo` enum + Json para específicos atende (2) mas perde tipagem em (1).

## Decisão

Usar **CTI (Class Table Inheritance)**: uma tabela `Ativo` com os campos verdadeiramente comuns a **todo** ativo, mais uma tabela por tipo (`Cri`, `Lci`, `Fii`...) ligada 1-1 à `Ativo` via FK. A tabela específica usa `ativoId` como PK (não tem `id` próprio).

### Esqueleto Prisma

```prisma
enum TipoAtivo {
  CRI
  // futuros: LCI, LCA, CRA, FII, ACAO, DEB, ...
}

model Ativo {
  id              String     @id @default(cuid())
  tipo            TipoAtivo
  codigo          String     @unique
  emissor         String
  quantidade      Int
  precoAquisicao  Decimal    @db.Decimal(18, 4) @map("preco_aquisicao")
  dataAquisicao   DateTime   @db.Date           @map("data_aquisicao")
  observacoes     String?    @db.Text

  criadoEm        DateTime   @default(now()) @map("criado_em")
  atualizadoEm    DateTime   @updatedAt      @map("atualizado_em")

  cri             Cri?
  // futuros: lci Lci?, fii Fii?, ...

  @@map("ativos")
}

model Cri {
  ativoId         String     @id @map("ativo_id")
  ativo           Ativo      @relation(fields: [ativoId], references: [id], onDelete: Cascade)

  // campos específicos de CRI:
  valorNominal    Decimal    @db.Decimal(18, 4) @map("valor_nominal")
  dataVencimento  DateTime   @db.Date            @map("data_vencimento")
  indexador       Indexador
  tipoTaxa        TipoTaxa                       @map("tipo_taxa")
  taxa            Decimal    @db.Decimal(8, 4)

  @@map("cris")
}
```

### Critério: o que vai na `Ativo` vs na tabela específica?

Na `Ativo` mora apenas o que faz sentido para **todo e qualquer tipo** de ativo, incluindo renda variável:

| Campo | Faz sentido pra CRI? | Pra FII? | Pra Ação? | Decisão |
|---|---|---|---|---|
| `codigo` | sim | sim (ticker) | sim (ticker) | `Ativo` |
| `emissor` | sim | sim (gestora) | sim (empresa) | `Ativo` |
| `quantidade` | sim | sim | sim | `Ativo` |
| `precoAquisicao` | sim | sim | sim | `Ativo` |
| `dataAquisicao` | sim | sim | sim | `Ativo` |
| `observacoes` | sim | sim | sim | `Ativo` |
| `dataVencimento` | sim | **não** | **não** | tabela específica |
| `indexador` | sim | **não** | **não** | tabela específica |
| `tipoTaxa` + `taxa` | sim | **não** | **não** | tabela específica |
| `valorNominal` | sim | **não** | **não** | tabela específica |

### Operações atômicas

Toda criação/atualização/remoção atravessa as duas tabelas dentro de uma transação Prisma (`prisma.$transaction([...])`), garantindo que `Ativo` e a tabela específica sempre fiquem coerentes. Delete usa `onDelete: Cascade` na FK para limpar a linha específica quando a `Ativo` é removida.

## Alternativas consideradas

### Opção A — Tabela única `Ativo` + `tipo` enum + Json `metadados`
- **Pros:** schema simples (uma tabela), queries cross-tipo triviais sem JOIN.
- **Cons:** muitos campos nullable conforme cresce a variedade de tipos; tipagem por tipo só existe no app; campos no Json são opacos para SQL.
- **Por que não:** o usuário valorizou expressamente "fine-grained" por tipo. Json em produção tende a virar lixão de campos não documentados.

### Opção B — CTI (escolhida)
- **Pros:** tipagem forte por tipo (cada tabela tem só campos válidos para si); query cross-tipo direta via `ativos`; query específica via JOIN ou via Prisma `include`.
- **Cons:** JOIN para mostrar detalhes completos; toda operação CUD passa por uma transação; mais tabelas conforme tipos crescem.

### Opção C — Tabelas separadas por tipo
- **Pros:** isolamento máximo.
- **Cons:** mata o requisito (2) — query cross-tipo precisa de UNION ou view materializada por fora.

## Consequências

### Positivas
- `SELECT * FROM ativos WHERE ...` resolve qualquer consulta cross-tipo (por indexador, ano, emissor, etc.) sem conhecer cada tabela.
- Cada tabela específica é um schema mínimo e típico do seu tipo.
- Adicionar novo tipo é: adicionar valor no enum `TipoAtivo` + criar tabela específica + criar relação opcional em `Ativo`. Migrations contidas.

### Negativas / custos
- Toda operação CUD em ativo tipado vira transação de duas tabelas. Wrapper em `apps/api` resolve isso uma vez (`createCri`, `updateCri`, `deleteAtivo`) — não pode ser implementado ad-hoc em cada handler.
- Listagem detalhada de um tipo exige `include` ou JOIN explícito.
- O modelo Prisma de `Ativo` ganha uma relação opcional por tipo (`cri Cri?`, `fii Fii?`...). Isso é cosmético, mas acumula com o tempo.

### Neutras / a observar
- Promoção de campos comuns a sub-famílias: se aparecer um segundo tipo de renda fixa (LCI, LCA, CRA, debênture), `dataVencimento` + `indexador` + `tipoTaxa` + `taxa` + `valorNominal` viram **comuns à família de renda fixa**, não a todos os ativos. Quando isso acontecer, há duas saídas:
  - Promover esses campos para a `Ativo` como nullable (simplifica, mas polui pra ações/FII).
  - Introduzir nível intermediário `AtivoRendaFixa` (CTI de 3 níveis, mais complexo).
  - Manter duplicado nas tabelas específicas (`Lci`, `Lca`...) — duplicação real.

  **Não decidir agora.** Adiar até que o segundo tipo de renda fixa entre na fila, abrir ADR próprio nessa hora.
- Endpoints REST adotados: cada tipo tem `/cris`, `/lcis` etc. com CRUD próprio. Um endpoint genérico `/ativos` (read-only, com filtros cross-tipo) vira **feature separada** quando a UI de "visão geral" surgir. Não está no MVP.

## Referências

- [001-stack-inicial](001-stack-inicial.md)
- [`specs/features/001-cadastro-de-cri.md`](../features/001-cadastro-de-cri.md) — primeira aplicação prática
