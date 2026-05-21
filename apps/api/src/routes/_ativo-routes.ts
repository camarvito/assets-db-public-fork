import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { TipoAtivo } from '@assets-db/shared';
import { prisma } from '../prisma.js';
import {
  ativoFullInclude,
  serializeAtivo,
  type AtivoFull,
} from '../lib/serialize-ativo.js';

const paramsSchema = z.object({ id: z.string().min(1) });

function isoToDate(iso: string): Date {
  return new Date(iso + 'T00:00:00Z');
}

type LeafRelation = 'cri' | 'cra' | 'lci' | 'lca';

// Forma genérica que cobre os 4 tipos:
// - CRI/CRA têm `emissor`, `quantidade`, `valorNominal` opcionais
// - LCI/LCA não os têm; o helper de leaf descarta esses campos
type AtivoTypeInput = {
  codigo: string;
  nome: string;
  instituicao: import('@assets-db/shared').Instituicao;
  observacoes?: string | null;
  precoAquisicao: string;
  dataAquisicao: string;
  dataVencimento: string;
  indexador: import('@assets-db/shared').Indexador;
  tipoTaxa: import('@assets-db/shared').TipoTaxa;
  taxa: string;
  periodicidadeJuros?: import('@assets-db/shared').PeriodicidadeJuros | null;
  emissor?: string | null;
  quantidade?: number | null;
  valorNominal?: string | null;
};

function buildLeafCreate(leaf: LeafRelation, data: AtivoTypeInput) {
  if (leaf === 'cri' || leaf === 'cra') {
    return {
      [leaf]: {
        create: {
          emissor: data.emissor ?? null,
          quantidade: data.quantidade ?? null,
          valorNominal: data.valorNominal ?? null,
        },
      },
    };
  }
  // LCI/LCA: tabela marcadora, só FK.
  return { [leaf]: { create: {} } };
}

function buildLeafUpdate(leaf: LeafRelation, data: AtivoTypeInput) {
  if (leaf === 'cri' || leaf === 'cra') {
    return {
      [leaf]: {
        update: {
          emissor: data.emissor ?? null,
          quantidade: data.quantidade ?? null,
          valorNominal: data.valorNominal ?? null,
        },
      },
    };
  }
  // LCI/LCA não têm o que atualizar (a tabela só guarda ativo_id).
  return {};
}

interface MakeAtivoRoutesConfig<T extends AtivoTypeInput> {
  tipo: TipoAtivo;
  leafRelation: LeafRelation;
  inputSchema: z.ZodType<T, z.ZodTypeDef, unknown>;
}

export function makeAtivoTypeRoutes<T extends AtivoTypeInput>(
  config: MakeAtivoRoutesConfig<T>,
): FastifyPluginAsync {
  const { tipo, leafRelation, inputSchema } = config;

  return async (app) => {
    // GET /
    app.get('/', async () => {
      const ativos = await prisma.ativo.findMany({
        where: { tipo },
        include: ativoFullInclude,
        orderBy: { criadoEm: 'desc' },
      });
      return ativos.map((a) => serializeAtivo(a as AtivoFull));
    });

    // GET /:id
    app.get('/:id', async (request, reply) => {
      const { id } = paramsSchema.parse(request.params);
      const ativo = await prisma.ativo.findUnique({
        where: { id },
        include: ativoFullInclude,
      });
      if (!ativo || ativo.tipo !== tipo) {
        reply.status(404).send({ error: 'not_found' });
        return;
      }
      return serializeAtivo(ativo as AtivoFull);
    });

    // POST /
    app.post('/', async (request, reply) => {
      const data = inputSchema.parse(request.body);

      const ativo = await prisma.ativo.create({
        data: {
          tipo,
          codigo: data.codigo,
          nome: data.nome,
          instituicao: data.instituicao,
          observacoes: data.observacoes ?? null,
          precoAquisicao: data.precoAquisicao,
          dataAquisicao: isoToDate(data.dataAquisicao),
          rendaFixa: {
            create: {
              dataVencimento: isoToDate(data.dataVencimento),
              indexador: data.indexador,
              tipoTaxa: data.tipoTaxa,
              taxa: data.taxa,
              periodicidadeJuros: data.periodicidadeJuros ?? null,
              ...buildLeafCreate(leafRelation, data),
            },
          },
        },
        include: ativoFullInclude,
      });

      reply.status(201).send(serializeAtivo(ativo as AtivoFull));
    });

    // PUT /:id
    app.put('/:id', async (request, reply) => {
      const { id } = paramsSchema.parse(request.params);
      const data = inputSchema.parse(request.body);

      const existente = await prisma.ativo.findUnique({ where: { id } });
      if (!existente || existente.tipo !== tipo) {
        reply.status(404).send({ error: 'not_found' });
        return;
      }

      const ativo = await prisma.ativo.update({
        where: { id },
        data: {
          codigo: data.codigo,
          nome: data.nome,
          instituicao: data.instituicao,
          observacoes: data.observacoes ?? null,
          precoAquisicao: data.precoAquisicao,
          dataAquisicao: isoToDate(data.dataAquisicao),
          rendaFixa: {
            update: {
              dataVencimento: isoToDate(data.dataVencimento),
              indexador: data.indexador,
              tipoTaxa: data.tipoTaxa,
              taxa: data.taxa,
              periodicidadeJuros: data.periodicidadeJuros ?? null,
              ...buildLeafUpdate(leafRelation, data),
            },
          },
        },
        include: ativoFullInclude,
      });

      return serializeAtivo(ativo as AtivoFull);
    });

    // DELETE /:id
    app.delete('/:id', async (request, reply) => {
      const { id } = paramsSchema.parse(request.params);
      const existente = await prisma.ativo.findUnique({ where: { id } });
      if (!existente || existente.tipo !== tipo) {
        reply.status(404).send({ error: 'not_found' });
        return;
      }
      await prisma.ativo.delete({ where: { id } });
      reply.status(204).send();
    });
  };
}
