# BACKLOG

Pendências pequenas que não justificam uma spec própria ainda. Uma linha por item, com data. Quando algo daqui virar prioridade, sai do backlog e vira spec em `specs/features/`.

Formato: `- [AAAA-MM-DD] descrição curta — contexto opcional`

## Itens

- [2026-05-17] Avaliar edição inline na página de detalhe (`/cris/[id]`) como alternativa à rota separada `/cris/[id]/editar` — revisitar quando o uso revelar fricção das duas páginas.
- [2026-05-17] Tornar `Ativo.instituicao` NOT NULL quando todos os registros existentes estiverem preenchidos. Hoje é nullable para preservar histórico anterior à introdução do campo.
- [2026-05-17] `Cri.valorNominal` hoje é informação contratual sem uso em cálculo. Vira essencial quando a feature de eventos de pagamento for escrita (juros = taxa × VN × quantidade) — confirmar que está sendo preenchido nos cadastros.
