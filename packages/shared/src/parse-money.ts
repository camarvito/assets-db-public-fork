// Normalize user-typed money strings (pt-BR or US) to the canonical form with
// `.` as decimal separator and no thousand separators. If the input does not
// match any supported format, return it trimmed and unchanged — Zod will flag
// it as invalid downstream.
//
// Rules (in order):
//   1. Has `.` and `,`   → last separator is decimal; the others are thousands.
//   2. Only `,`          → comma is decimal.
//   3. Only `.`, 2+ dots → all are thousands.
//   4. Only `.`, 1 dot,  → thousands  (e.g. "1.234" → "1234")
//      3 digits after
//   5. Only `.`, 1 dot,  → decimal    (e.g. "1.5" → "1.5", "1.50" → "1.50")
//      any other count
//   6. No separator      → integer as-is.
//
// Rejected cases (returned cleaned, unchanged):
//   - Multiple commas without a dot ("1,234,567"): ambiguous in pt-BR context.
//   - Any non-digit character besides `.`, `,`, whitespace, or an `R$` prefix.

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
