import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AtivoListQuerySchema } from '@assets-db/shared';
import { prisma } from '../prisma.js';
import {
  ativoFullInclude,
  serializeAtivo,
  serializeAtivoListItem,
  type AtivoFull,
} from '../lib/serialize-ativo.js';

const paramsSchema = z.object({ id: z.string().min(1) });

function isoToDate(iso: string): Date {
  return new Date(iso + 'T00:00:00Z');
}

export const ativoRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request) => {
    const query = AtivoListQuerySchema.parse(request.query);

    const ativos = await prisma.ativo.findMany({
      where: {
        ...(query.tipo && { tipo: query.tipo }),
        ...(query.instituicao && { instituicao: query.instituicao }),
        ...(query.indexador && {
          rendaFixa: { indexador: query.indexador },
        }),
        ...(query.vencimentoAte && {
          rendaFixa: {
            ...(query.indexador && { indexador: query.indexador }),
            dataVencimento: { lte: isoToDate(query.vencimentoAte) },
          },
        }),
      },
      include: ativoFullInclude,
      orderBy: { criadoEm: 'desc' },
    });

    return ativos.map((a) => serializeAtivoListItem(a as AtivoFull));
  });

  app.get('/:id', async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);

    const ativo = await prisma.ativo.findUnique({
      where: { id },
      include: ativoFullInclude,
    });
    if (!ativo) {
      reply.status(404).send({ error: 'not_found' });
      return;
    }
    return serializeAtivo(ativo as AtivoFull);
  });

  // Deletes without needing to know the asset type — cascading FKs clean up
  // renda_fixa, the type-specific leaf, and eventos.
  app.delete('/:id', async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);

    const ativo = await prisma.ativo.findUnique({ where: { id } });
    if (!ativo) {
      reply.status(404).send({ error: 'not_found' });
      return;
    }
    await prisma.ativo.delete({ where: { id } });
    reply.status(204).send();
  });
};
