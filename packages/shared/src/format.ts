import type { Indexador, TipoTaxa } from './ativo-renda-fixa.js';

// "1234.5" -> "R$ 1.234,50"
export function formatCurrencyBRL(decimalString: string): string {
  const n = Number.parseFloat(decimalString);
  if (Number.isNaN(n)) return decimalString;
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// "2024-03-15" -> "15/03/2024"
export function formatDateBR(isoDate: string): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return isoDate;
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
}

// "6.5" + percentageSuffix -> "6,50%"
function formatPercent(decimalString: string): string {
  const n = Number.parseFloat(decimalString);
  if (Number.isNaN(n)) return decimalString;
  return (
    n.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + '%'
  );
}

// PREFIXADO + PRE + "12"       -> "12,00% a.a."
// CDI + POS_PERCENTUAL + "102" -> "102,00% do CDI"
// CDI + POS_SPREAD + "1.45"    -> "CDI + 1,45%"
// IPCA + POS_SPREAD + "6.5"    -> "IPCA + 6,50%"
export function formatRemuneracao(args: {
  indexador: Indexador;
  tipoTaxa: TipoTaxa;
  taxa: string;
}): string {
  const taxa = formatPercent(args.taxa);
  if (args.tipoTaxa === 'PRE') return `${taxa} a.a.`;
  if (args.tipoTaxa === 'POS_PERCENTUAL') return `${taxa} do ${args.indexador}`;
  return `${args.indexador} + ${taxa}`;
}
