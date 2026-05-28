import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { z } from 'zod';
import { EventoInputSchema } from '@assets-db/shared';
import { prisma } from '../prisma.js';
import { serializeEvento } from '../lib/serialize-evento.js';

const ativoParamsSchema = z.object({ id: z.string().min(1) });
const eventoParamsSchema = z.object({
  id: z.string().min(1),
  eventoId: z.string().min(1),
});

function isoToDate(iso: string): Date {
  return new Date(iso + 'T00:00:00Z');
}

async function loadAtivoDataAquisicao(id: string): Promise<Date | null> {
  const ativo = await prisma.ativo.findUnique({
    where: { id },
    select: { dataAquisicao: true },
  });
  return ativo?.dataAquisicao ?? null;
}

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
  // GET /ativos/:id/eventos
  app.get('/ativos/:id/eventos', async (request, reply) => {
    const { id } = ativoParamsSchema.parse(request.params);

    const dataAquisicao = await loadAtivoDataAquisicao(id);
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

  // POST /ativos/:id/eventos
  app.post('/ativos/:id/eventos', async (request, reply) => {
    const { id } = ativoParamsSchema.parse(request.params);
    const data = EventoInputSchema.parse(request.body);

    const dataAquisicao = await loadAtivoDataAquisicao(id);
    if (!dataAquisicao) {
      reply.status(404).send({ error: 'not_found' });
      return;
    }

    const eventoData = isoToDate(data.data);
    if (eventoData < dataAquisicao) {
      sendValidationIssue(
        reply,
        ['data'],
        'Data do evento deve ser posterior ou igual à data de aquisição do ativo',
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

  // PUT /ativos/:id/eventos/:eventoId
  app.put('/ativos/:id/eventos/:eventoId', async (request, reply) => {
    const { id, eventoId } = eventoParamsSchema.parse(request.params);
    const data = EventoInputSchema.parse(request.body);

    const dataAquisicao = await loadAtivoDataAquisicao(id);
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
        'Data do evento deve ser posterior ou igual à data de aquisição do ativo',
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

  // DELETE /ativos/:id/eventos/:eventoId
  app.delete('/ativos/:id/eventos/:eventoId', async (request, reply) => {
    const { id, eventoId } = eventoParamsSchema.parse(request.params);

    const dataAquisicao = await loadAtivoDataAquisicao(id);
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
