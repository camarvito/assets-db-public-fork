# ADR 003 — CTI de 3 níveis para a família renda fixa

**Status:** Accepted
**Data:** 2026-05-19

## Contexto

[ADR 002](002-modelagem-multi-tipo-de-ativos.md) adotou CTI de 2 níveis (`Ativo` + tabela por tipo) e antecipou no item "Neutras / a observar" que, quando aparecesse um segundo tipo de renda fixa, seria preciso decidir onde acomodar os campos comuns à família (`dataVencimento`, `indexador`, `tipoTaxa`, `taxa`, `periodicidadeJuros`, e — no contexto deste sistema — `valorNominal`).

Esse momento chegou: este projeto vai adicionar **CRA**, **LCI** e **LCA** ([spec 005](../features/005-expandir-ativos-rf.md)). Os 4 tipos compartilham toda a estrutura de remuneração (indexador + tipo de taxa + taxa, periodicidade, vencimento). Renda variável (FII, ação, etc.) — que pode entrar no futuro — **não** compartilha esses campos.

Requisitos do usuário relevantes:

1. Consultar ativos por critérios cross-tipo dentro da renda fixa (ex: "quais ativos pagam ≥ IPCA + 8%?").
2. Manter modelagem tipada por tipo (CRI tem `emissor` + `valorNominal`, LCI/LCA não).
3. Não pagar custo cosmético hoje em troca de um modelo que envelhece bem (preferência explícita pela opção mais limpa, mesmo com mais código).

## Decisão

Adotar **CTI de 3 níveis** para a família renda fixa:

```
Ativo  ─┐
        ├─ AtivoRendaFixa  ─┬─ Cri
        │                   ├─ Cra
        │                   ├─ Lci
        │                   └─ Lca
        └─ (futuras famílias: AtivoRendaVariavel → Fii, Acao, ...)
```

- `Ativo` armazena apenas o **universal** a todo ativo (qualquer família): identificador, nome, instituição custodiante, preço/data de aquisição, observações.
- `AtivoRendaFixa` armazena o **comum à família renda fixa**: `dataVencimento`, `indexador`, `tipoTaxa`, `taxa`, `periodicidadeJuros`.
- `Cri`/`Cra`/`Lci`/`Lca` armazenam o **específico de cada tipo**: campos como `emissor`, `quantidade`, `valorNominal` ficam em `Cri`/`Cra`; `Lci`/`Lca` ficam como marcadoras (só `ativoId`) — funcionam como anchors quando aparecer um campo específico (data de carência, etc.).

Cada nível tem `ativoId` como PK e FK em cascata para o nível acima. O mesmo UUID atravessa as 3 tabelas.

Esta decisão **estende** o ADR 002 sem revogá-lo: o CTI de 2 níveis continua válido para qualquer família ainda sem campos comuns (renda variável futura), até que ela própria precise de um nível intermediário.

## Alternativas consideradas

### Opção A — Promover campos comuns para `Ativo` como nullable

`indexador`, `tipoTaxa`, `taxa`, `periodicidadeJuros`, `dataVencimento` vão pra `Ativo` direto, todos nullable. As tabelas específicas (`Cri`, `Cra`, etc.) ficam só com o que é particular.

- **Pros:** schema mais raso (2 tabelas em vez de 3); cross-asset query é um `SELECT` direto, sem JOIN; menos código no CRUD.
- **Cons:** quando renda variável entrar (FII/ação), esses 5 campos ficam permanentemente null nesses registros — poluição cosmética que cresce com o tempo; semanticamente menos preciso ("indexador" não faz sentido em ação).

### Opção B — CTI de 3 níveis (escolhida)

- **Pros:** cada nível só carrega campos que fazem sentido pra ele; renda variável entra sem poluir `Ativo`; modela explicitamente que "campos de remuneração" são uma característica de família, não universal; query cross-tipo dentro da família é um único JOIN previsível (`SELECT a.*, arf.* FROM ativos a JOIN ativos_renda_fixa arf ON arf.ativo_id = a.id WHERE arf.indexador = 'IPCA' AND arf.taxa >= 8`).
- **Cons:** toda operação CUD em renda fixa atravessa 3 tabelas (mais código no wrapper); listagem detalhada precisa de JOINs encadeados; migration mais elaborada (mexer em dados existentes do CRI).

### Opção C — Duplicar nas 4 tabelas específicas

Cada tipo replica todos os 5 campos. Não recomendada — mata o requisito (1), exigindo UNION manual para qualquer query cross-tipo.

## Consequências

### Positivas

- **Esfera de cada tabela é clara.** Olhando para `AtivoRendaFixa`, está óbvio o que define a família. Olhando para `Lci`, está claro que ela é estruturalmente igual a um título genérico de renda fixa.
- **Renda variável entra limpa.** Quando FII/ação chegar, basta criar `AtivoRendaVariavel` (ou simplesmente conectar `Fii` direto em `Ativo` se não tiver campos comuns ainda). `Ativo` não muda.
- **Queries de família continuam triviais.** `SELECT * FROM ativos JOIN ativos_renda_fixa USING (ativo_id) WHERE ...` cobre 100% dos casos que a [BACKLOG] cita ("ativos que pagam ≥ IPCA + 8").
- **`Lci`/`Lca` viram âncoras prontas.** Quando aparecer um campo (data de carência, prazo de resgate antecipado), entra direto sem migration de criação de tabela.

### Negativas / custos

- **Toda operação CUD em renda fixa é uma transação de 3 inserts/updates.** Wrapper em `apps/api` precisa ser feito uma única vez por tipo e usado em todos os handlers — não pode ser implementado ad-hoc.
- **Listagem cross-tipo (`GET /ativos`) faz JOIN com `AtivoRendaFixa`** para mostrar taxa/vencimento. Se eventualmente entrarem famílias sem RF, a UI precisará lidar com colunas nullable.
- **Prisma fica mais verboso.** Modelos `Cri`, `Cra` etc. ligam a `AtivoRendaFixa` (via `ativoId`); para acessar `Ativo` a partir do `Cri`, há um nível de indireção a mais.
- **Migration inicial é maior** que na Opção A. Dados existentes do CRI precisam ser repartidos entre 3 tabelas.

### Neutras / a observar

- **`emissor` e `quantidade` saem do `Ativo`**: hoje estão em `Ativo` (nullable), mas só fazem sentido para títulos estruturados (CRI/CRA). Vão pra `Cri`/`Cra`. Em `Lci`/`Lca`, a "instituição custodiante" (campo `Ativo.instituicao`) é também a emissora — então não há perda de informação.
- **`valorNominal`** continua nullable. Já estava em `Cri` (spec 003). Apenas duplica em `Cra`. Não entra em `Lci`/`Lca`.
- **`PeriodicidadeJuros`** sobe para `AtivoRendaFixa` (nullable) — todos os 4 tipos podem ter periodicidade definida.
- **CTI de 3 níveis** é um padrão consagrado em ORM (TPC/TPH/JTI no SQL clássico). Não é uma invenção local; documentação básica é fácil de achar.
- Se aparecer uma terceira família (commodity, criptoativo) com campos próprios mas sem família comum, ela conecta direto em `Ativo` — não precisa de nível intermediário. CTI de 3 níveis é **por família**, não global.

## Referências

- [ADR 001 — Stack inicial](001-stack-inicial.md)
- [ADR 002 — Modelagem multi-tipo de ativos (CTI)](002-modelagem-multi-tipo-de-ativos.md) — esta decisão estende a parte "Promoção de campos comuns a sub-famílias" deixada em aberto.
- [Spec 005 — Expansão para CRA/LCI/LCA](../features/005-expandir-ativos-rf.md) — primeira aplicação prática.
