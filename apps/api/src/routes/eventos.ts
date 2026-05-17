import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { z } from 'zod';
import { EventoInputSchema } from '@assets-db/shared';
import { prisma } from '../prisma.js';
import { serializeEvento } from '../lib/serialize-evento.js';

const criParamsSchema = z.object({ id: z.string().min(1) });
const eventoParamsSchema = z.object({
  id: z.string().min(1),
  eventoId: z.string().min(1),
});

function isoToDate(iso: string): Date {
  return new Date(iso + 'T00:00:00Z');
}

// Carrega data de aquisição do CRI; retorna null se não existir ou não for CRI.
async function loadCriDataAquisicao(id: string): Promise<Date | null> {
  const ativo = await prisma.ativo.findUnique({
    where: { id },
    select: { tipo: true, dataAquisicao: true },
  });
  if (!ativo || ativo.tipo !== 'CRI') return null;
  return ativo.dataAquisicao;
}

// Resposta de validação compatível com o formato Zod (mesmo handler no front).
function sendValidationIssue(reply: FastifyReply, path: string[], message: string) {
  reply.status(400).send({
    error: 'validation',
    issues: [{ code: 'custom', path, message }],
  });
}

async function verifyEventoBelongsToAtivo(
  eventoId: string,
  ativoId: string,
): Promise<boolean> {
  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    select: { ativoId: true },
  });
  return Boolean(evento) && evento!.ativoId === ativoId;
}

export const eventoRoutes: FastifyPluginAsync = async (app) => {
  // GET /cris/:id/eventos
  app.get('/cris/:id/eventos', async (request, reply) => {
    const { id } = criParamsSchema.parse(request.params);

    const dataAquisicao = await loadCriDataAquisicao(id);
    if (!dataAquisicao) {
      reply.status(404).send({ error: 'not_found' });
      return;
    }

    const eventos = await prisma.evento.findMany({
      where: { ativoId: id },
      orderBy: { data: 'desc' },
    });

    return eventos.map(serializeEvento);
  });

  // POST /cris/:id/eventos
  app.post('/cris/:id/eventos', async (request, reply) => {
    const { id } = criParamsSchema.parse(request.params);
    const data = EventoInputSchema.parse(request.body);

    const dataAquisicao = await loadCriDataAquisicao(id);
    if (!dataAquisicao) {
      reply.status(404).send({ error: 'not_found' });
      return;
    }

    const eventoData = isoToDate(data.data);
    if (eventoData < dataAquisicao) {
      sendValidationIssue(
        reply,
        ['data'],
        'Data do evento deve ser posterior ou igual à data de aquisição do CRI',
      );
      return;
    }

    const evento = await prisma.evento.create({
      data: {
        ativoId: id,
        tipo: data.tipo,
        data: eventoData,
        valor: data.valor,
        observacoes: data.observacoes ?? null,
      },
    });

    reply.status(201).send(serializeEvento(evento));
  });

  // PUT /cris/:id/eventos/:eventoId
  app.put('/cris/:id/eventos/:eventoId', async (request, reply) => {
    const { id, eventoId } = eventoParamsSchema.parse(request.params);
    const data = EventoInputSchema.parse(request.body);

    const dataAquisicao = await loadCriDataAquisicao(id);
    if (!dataAquisicao) {
      reply.status(404).send({ error: 'not_found' });
      return;
    }

    if (!(await verifyEventoBelongsToAtivo(eventoId, id))) {
      reply.status(404).send({ error: 'not_found' });
      return;
    }

    const eventoData = isoToDate(data.data);
    if (eventoData < dataAquisicao) {
      sendValidationIssue(
        reply,
        ['data'],
        'Data do evento deve ser posterior ou igual à data de aquisição do CRI',
      );
      return;
    }

    const updated = await prisma.evento.update({
      where: { id: eventoId },
      data: {
        tipo: data.tipo,
        data: eventoData,
        valor: data.valor,
        observacoes: data.observacoes ?? null,
      },
    });

    return serializeEvento(updated);
  });

  // DELETE /cris/:id/eventos/:eventoId
  app.delete('/cris/:id/eventos/:eventoId', async (request, reply) => {
    const { id, eventoId } = eventoParamsSchema.parse(request.params);

    const dataAquisicao = await loadCriDataAquisicao(id);
    if (!dataAquisicao) {
      reply.status(404).send({ error: 'not_found' });
      return;
    }

    if (!(await verifyEventoBelongsToAtivo(eventoId, id))) {
      reply.status(404).send({ error: 'not_found' });
      return;
    }

    await prisma.evento.delete({ where: { id: eventoId } });
    reply.status(204).send();
  });
};
