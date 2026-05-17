import type { Evento } from '@prisma/client';
import type { EventoResponse } from '@assets-db/shared';

// O campo \`@db.Date\` no Prisma retorna Date com hora 00:00 UTC;
// substring do ISO basta para extrair "YYYY-MM-DD".
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
