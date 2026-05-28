import type { Evento } from '@prisma/client';
import type { EventoResponse } from '@assets-db/shared';

// Prisma's `@db.Date` columns come back as Date at 00:00 UTC; a substring of
// the ISO string is enough to extract "YYYY-MM-DD".
function formatDateISO(d: Date): string {
  return d.toISOString().substring(0, 10);
}

export function serializeEvento(evento: Evento): EventoResponse {
  return {
    id: evento.id,
    ativoId: evento.ativoId,
    tipo: evento.tipo,
    data: formatDateISO(evento.data),
    valor: evento.valor.toString(),
    observacoes: evento.observacoes,
    criadoEm: evento.criadoEm.toISOString(),
    atualizadoEm: evento.atualizadoEm.toISOString(),
  };
}
