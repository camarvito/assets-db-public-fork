// Normaliza strings monetárias digitadas pelo usuário (pt-BR ou US) para a
// forma canônica com `.` como separador decimal e sem separador de milhar.
// Quando o input não casa com nenhum formato suportado, devolve a string
// (trim) sem alteração — o Zod marca como inválido downstream.
//
// Regras (na ordem):
//   1. Tem `.` e `,`        → o último separador é o decimal; os outros, milhar.
//   2. Só `,`               → vírgula é decimal.
//   3. Só `.`, 2+ pontos    → todos são milhar.
//   4. Só `.`, 1 ponto, 3   → milhar  (ex: "1.234" → "1234")
//      dígitos depois
//   5. Só `.`, 1 ponto,     → decimal  (ex: "1.5" → "1.5", "1.50" → "1.50")
//      qualquer outra
//      quantidade depois
//   6. Sem separador        → inteiro como está.
//
// Casos rejeitados (devolvem o input limpo sem mudança):
//   - Múltiplas vírgulas sem ponto ("1,234,567"): ambíguo no contexto pt-BR.
//   - Qualquer caractere não-dígito além de `.`, `,`, espaço ou prefixo `R$`.

const ONLY_DIGITS_AND_SEPS = /^[\d.,]+$/;

export function parseMoneyInput(raw: string): string {
  const cleaned = raw.replace(/\s+/g, '').replace(/^R\$/i, '');
  if (cleaned === '') return '';

  if (!ONLY_DIGITS_AND_SEPS.test(cleaned)) return cleaned;

  const dotCount = (cleaned.match(/\./g) ?? []).length;
  const commaCount = (cleaned.match(/,/g) ?? []).length;

  if (dotCount > 0 && commaCount > 0) {
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    if (lastComma > lastDot) {
      return cleaned.replace(/\./g, '').replace(',', '.');
    }
    return cleaned.replace(/,/g, '');
  }

  if (commaCount > 0) {
    if (commaCount > 1) return cleaned;
    return cleaned.replace(',', '.');
  }

  if (dotCount > 1) {
    return cleaned.replace(/\./g, '');
  }

  if (dotCount === 1) {
    const lastDot = cleaned.lastIndexOf('.');
    const digitsAfter = cleaned.length - lastDot - 1;
    if (digitsAfter === 3) return cleaned.replace('.', '');
    return cleaned;
  }

  return cleaned;
}
