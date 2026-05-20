# Feature 004 — Ajustes de input (datas, valores monetários, periodicidade)

**Status:** Closed
**Aberta em:** 2026-05-19
**Aprovada em:** 2026-05-19
**Fechada em:** 2026-05-19
**Modificada por:** [[006-ajustes-parser-zod]]

## Objetivo

Reduzir fricção no preenchimento de formulários da Web acomodando os formatos que o usuário naturalmente digita, e resolver uma pendência conhecida do Select de Periodicidade de juros:

1. Datas aceitam `dd/MM/yyyy`, `dd-MM-yyyy`, **`dd/MM/yy`** e **`dd-MM-yy`** no input. Ano de 2 dígitos sempre interpretado como `20yy`.
2. Valores **monetários** aceitam `,` ou `.` como separador decimal, e toleram separador de milhar com heurística previsível.
3. Select de Periodicidade de juros ganha opção sentinela "Não definida", permitindo desfazer uma escolha.

Mudança escopada **apenas à Web**: a API e os schemas Zod compartilhados continuam exigindo o formato canônico (ISO `YYYY-MM-DD` para datas, string decimal com `.` para valores). O form normaliza tudo antes de enviar.

## Escopo

### Dentro

- `DatePicker.tsx`: aceitar formatos de 8 caracteres (`dd/MM/yy`, `dd-MM-yy`) além dos atuais de 10 caracteres. Ano de 2 dígitos → `2000 + yy`. Display canônico após o blur continua `dd/MM/yyyy`.
- Novo módulo `apps/web/src/lib/parse-money.ts` com função pura `parseMoneyInput(raw: string): string` aplicando a heurística descrita abaixo. Testada com Vitest.
- `CriForm.tsx` e `EventoForm.tsx`: substituir `normalizeDecimal` local pela chamada a `parseMoneyInput` para **todos** os campos decimais (`precoAquisicao`, `valorNominal`, `taxa`, `valor`). A função fica genérica o suficiente para servir percentuais também — `"6,5"` continua virando `"6.5"`, e casos com separador de milhar (`"6.500"` → `"6500"`) na prática não ocorrem em taxas mas se ocorrerem seguem a mesma regra previsível.
- Select de Periodicidade em `CriForm.tsx`: adicionar opção sentinela `__none__` com label "Não definida" no topo. Ao selecionar, `field.onChange(null)`. Aplica também a qualquer outro Select opcional que apareça neste lote (no escopo atual, só periodicidade).
- Item 4 do `BACKLOG.md` removido após implementação.

### Fora

- Mudar contratos da API ou schemas Zod compartilhados (Web continua sendo o único lugar permissivo).
- Internacionalização (locale dinâmico). O comportamento é sempre pt-BR.
- Aceitar entrada com símbolo `R$` ou texto livre. O parser só lida com dígitos e separadores; outros caracteres causam retorno inalterado (Zod rejeita depois).
- Outros campos de Select opcional (não há outros hoje além de periodicidade).
- Sentinela traduzida em rotas de leitura. Nada serializa `__none__` — é estritamente UI-side.

## Regras de parsing

### Datas (`DatePicker`)

Input aceita estes 4 formatos exatos:

| Formato     | Exemplo      | Interpretação                  |
|-------------|--------------|--------------------------------|
| `dd/MM/yyyy`| `15/03/2026` | 2026-03-15                     |
| `dd-MM-yyyy`| `15-03-2026` | 2026-03-15                     |
| `dd/MM/yy`  | `15/03/26`   | 2026-03-15 (yy → 20yy)         |
| `dd-MM-yy`  | `15-03-26`   | 2026-03-15 (yy → 20yy)         |

- Comprimento exigido: 8 ou 10 caracteres exatos (mesma guarda anti-parse-parcial do código atual).
- Ano final precisa estar entre `MIN_YEAR` (1900) e `MAX_YEAR` (2200). Para entrada `yy`, o ano resolvido é `2000 + yy` (intervalo 2000–2099), portanto sempre dentro da faixa.
- Display canônico (após blur, ou ao receber `value` do form) permanece `dd/MM/yyyy` — entrada `yy` é convertida silenciosamente. Não há feedback visual avisando "interpretado como 20yy"; o blur já reescreve a data completa.

### Valores monetários (`parseMoneyInput`)

Função pura que recebe a string do input e devolve uma string decimal canônica com `.` (ou a string original se não der pra parsear — Zod rejeita downstream). Espaços e prefixo `R$` são removidos antes da análise.

Regras, na ordem:

1. **Tem `.` e `,`** → o último separador (mais à direita) é o decimal; os outros são separadores de milhar e são removidos.
   - `"1.234,56"` → `"1234.56"`
   - `"1,234.56"` → `"1234.56"` (formato US também funciona)
   - `"1.234.567,89"` → `"1234567.89"`

2. **Só `,`** → vírgula é decimal (convenção pt-BR; `,` não é separador de milhar válido neste contexto).
   - `"1234,56"` → `"1234.56"`
   - `"1,5"` → `"1.5"`

3. **Só `.`**, com **2+ pontos** → todos são separadores de milhar.
   - `"1.234.567"` → `"1234567"`

4. **Só `.`**, com **1 ponto** e exatamente **3 dígitos após** → separador de milhar.
   - `"1.234"` → `"1234"`
   - `"12.000"` → `"12000"`

5. **Só `.`**, com **1 ponto** e qualquer outra quantidade de dígitos depois → decimal.
   - `"1.5"` → `"1.5"`
   - `"1.50"` → `"1.50"`
   - `"1.2345"` → `"1.2345"`

6. **Sem separador** → devolve como está (inteiro).
   - `"1234"` → `"1234"`

Casos rejeitados (string devolvida sem normalização; Zod marca como inválido):

- Mais de uma vírgula sem ponto (`"1,234,567"`) — formato ambíguo no contexto pt-BR.
- Qualquer caractere não-dígito, não-separador, não-`R$`/espaço.

### Select de Periodicidade

Opção sentinela renderizada como primeira no `SelectContent`:

```tsx
<SelectItem value="__none__">Limpar seleção</SelectItem>
```

`onValueChange` no form mapeia `"__none__"` para `null` antes de chamar `field.onChange`. Quando `field.value` é `null`/`undefined`, o Select mostra o placeholder "Selecione" normalmente. O sentinela aparece selecionado **somente** logo após o usuário clicar nele e antes do mapeamento para `null` — visualmente o estado final volta ao placeholder.

## Telas / UX

Sem mudanças de layout. O input do `DatePicker` continua com `placeholder="dd/mm/aaaa"`; o sufixo `yy` não é exposto no placeholder (a aceitação é transparente).

Os campos monetários continuam com `placeholder="1000,00"` ou similar. Não há texto de ajuda explicando a heurística — se aparecer demanda no uso, vira BACKLOG.

## Testes

Vitest cobre `parseMoneyInput` (módulo puro, sem React):

- Casos das 6 regras acima.
- Edge: string vazia, `"R$ 1.234,56"`, `"  10,50  "`.
- Casos rejeitados que devolvem inalterado: `"abc"`, `"1,2,3"`.

Para `DatePicker`, smoke manual basta (mesma estratégia atual). Casos a exercitar:
- `15/03/26` → grava ISO `2026-03-15`, blur reescreve para `15/03/2026`.
- `15-03-26` mesmo comportamento.
- `15/03/2026` continua funcionando.
- `15/03/4` (parcial) não dispara onChange (length != 8/10).

## Critérios de aceitação

- [x] `DatePicker` aceita `dd/MM/yy` e `dd-MM-yy`, convertendo `yy` para `20yy`.
- [x] `DatePicker` continua aceitando os formatos atuais de 10 caracteres.
- [x] `parseMoneyInput` implementado em `apps/web/src/lib/parse-money.ts` com testes Vitest passando (21 casos).
- [x] `CriForm` usa `parseMoneyInput` em `precoAquisicao`, `valorNominal` e `taxa`.
- [x] `EventoForm` usa `parseMoneyInput` em `valor`.
- [x] Select de Periodicidade em `CriForm` mostra opção "Limpar seleção" no topo; selecioná-la limpa o campo (passa a `null` no submit) e o Select volta a exibir o placeholder.
- [x] Item 4 removido do `BACKLOG.md`.
- [x] Sem mudanças em `packages/shared` nem em `apps/api`.

## Validação (preencher no smoke test final)

Implementado e exercitado em 2026-05-19:

**Parser monetário (`parseMoneyInput`):**
- 21 testes Vitest passam (`apps/web/src/lib/parse-money.test.ts`), cobrindo as 6 regras + prefixo `R$` + casos rejeitados (`"abc"`, `"1,234,567"`).
- Adicionado `vitest` como devDep em `apps/web` e script `test` no `package.json`.

**DatePicker:**
- Comprimento aceito ampliado de 10 para {8, 10} caracteres.
- Para entrada de 8 chars, ano resolvido como `2000 + yy` (sobrescreve qualquer pivot do date-fns) e display reescrito para `dd/MM/yyyy` no blur.
- Exercitado manualmente: `15/03/26`, `15-03-26`, `15/03/2026`, parcial `15/03/4`.

**Forms:**
- `CriForm` chama `parseMoneyInput` em `precoAquisicao`, `valorNominal` e `taxa`; constante `NONE_SENTINEL = '__none__'` mapeia a opção "Limpar seleção" para `null` antes de `field.onChange`.
- `EventoForm` chama `parseMoneyInput` em `valor`.
- Função local `normalizeDecimal` removida dos dois forms (substituída pelo módulo compartilhado).

**Smoke test no browser (usuário):**
- Datas em ambos formatos (yy e yyyy) gravam ISO corretamente.
- Valores monetários nos três campos do CRI e no campo do evento submetidos como decimal canônico.
- Taxa aceita `6,5` e `6.5`.
- "Limpar seleção" na Periodicidade devolve o Select ao placeholder e o detalhe mostra `—`.

### Ajustes feitos durante Active

- Heurística do `parseMoneyInput` estendida ao campo `taxa` (originalmente excluído). Decisão tomada antes da implementação a partir do feedback do usuário — uniformidade simplifica mental model e o caso adverso (`"6.500"` virar `6500%`) não ocorre na prática.
- Sentinela do Select renomeada de "— Não definida —" para "Limpar seleção" por preferência do usuário.

## Pendências geradas

Nenhuma. O typecheck de `apps/web` continua falhando em `src/components/ui/calendar.tsx` por incompatibilidade pré-existente entre o shadcn calendar e os types do `react-day-picker` — sem relação com este lote e fora de escopo.
