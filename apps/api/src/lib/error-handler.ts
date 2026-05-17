import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ZodError) {
      reply.status(400).send({ error: 'validation', issues: error.issues });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002 = unique constraint violation
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        const field = Array.isArray(target) ? target[0] : undefined;
        reply.status(409).send({ error: 'conflict', field });
        return;
      }
      // P2025 = record not found (update/delete em id inexistente)
      if (error.code === 'P2025') {
        reply.status(404).send({ error: 'not_found' });
        return;
      }
    }

    req.log.error({ err: error }, 'unhandled error');
    reply.status(500).send({ error: 'internal' });
  });
}
