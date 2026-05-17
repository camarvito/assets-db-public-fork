import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { CriInputSchema } from '@assets-db/shared';
import { prisma } from '../prisma.js';
import { serializeCri, type AtivoComCri } from '../lib/serialize-cri.js';

const paramsSchema = z.object({ id: z.string().min(1) });

// Converte "YYYY-MM-DD" em Date ancorada em UTC 00:00.
// Evita drift de timezone ao persistir como @db.Date.
function isoToDate(iso: string): Date {
  return new Date(iso + 'T00:00:00Z');
}

export const criRoutes: FastifyPluginAsync = async (app) => {
  // GET /cris
  app.get('/', async () => {
    const ativos = await prisma.ativo.findMany({
      where: { tipo: 'CRI' },
      include: { cri: true },
      orderBy: { criadoEm: 'desc' },
    });

    return ativos.map((a) => {
      if (!a.cri) {
        throw new Error(`Invariante violado: Ativo ${a.id} tipo CRI sem linha em cris`);
      }
      return serializeCri(a as AtivoComCri);
    });
  });

  // GET /cris/:id
  app.get('/:id', async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);

    const ativo = await prisma.ativo.findUnique({
      where: { id },
      include: { cri: true },
    });

    if (!ativo || ativo.tipo !== 'CRI' || !ativo.cri) {
      reply.status(404).send({ error: 'not_found' });
      return;
    }

    return serializeCri(ativo as AtivoComCri);
  });

  // POST /cris
  app.post('/', async (request, reply) => {
    const data = CriInputSchema.parse(request.body);

    // Nested create do Prisma é transacional implicitamente.
    const ativo = await prisma.ativo.create({
      data: {
        tipo: 'CRI',
        codigo: data.codigo,
        emissor: data.emissor,
        instituicao: data.instituicao,
        quantidade: data.quantidade ?? null,
        precoAquisicao: data.precoAquisicao,
        dataAquisicao: isoToDate(data.dataAquisicao),
        observacoes: data.observacoes ?? null,
        cri: {
          create: {
            valorNominal: data.valorNominal,
            dataVencimento: isoToDate(data.dataVencimento),
            indexador: data.indexador,
            tipoTaxa: data.tipoTaxa,
            taxa: data.taxa,
          },
        },
      },
      include: { cri: true },
    });

    reply.status(201).send(serializeCri(ativo as AtivoComCri));
  });

  // PUT /cris/:id
  app.put('/:id', async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);
    const data = CriInputSchema.parse(request.body);

    const existente = await prisma.ativo.findUnique({ where: { id } });
    if (!existente || existente.tipo !== 'CRI') {
      reply.status(404).send({ error: 'not_found' });
      return;
    }

    const ativo = await prisma.ativo.update({
      where: { id },
      data: {
        codigo: data.codigo,
        emissor: data.emissor,
        instituicao: data.instituicao,
        quantidade: data.quantidade ?? null,
        precoAquisicao: data.precoAquisicao,
        dataAquisicao: isoToDate(data.dataAquisicao),
        observacoes: data.observacoes ?? null,
        cri: {
          update: {
            valorNominal: data.valorNominal,
            dataVencimento: isoToDate(data.dataVencimento),
            indexador: data.indexador,
            tipoTaxa: data.tipoTaxa,
            taxa: data.taxa,
          },
        },
      },
      include: { cri: true },
    });

    return serializeCri(ativo as AtivoComCri);
  });

  // DELETE /cris/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);

    const existente = await prisma.ativo.findUnique({ where: { id } });
    if (!existente || existente.tipo !== 'CRI') {
      reply.status(404).send({ error: 'not_found' });
      return;
    }

    await prisma.ativo.delete({ where: { id } });
    reply.status(204).send();
  });
};
