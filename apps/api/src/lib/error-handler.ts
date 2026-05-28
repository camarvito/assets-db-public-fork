import type { FastifyError, FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

function isFastifyError(error: unknown): error is FastifyError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode: unknown }).statusCode === 'number'
  );
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ZodError) {
      reply.status(400).send({ error: 'validation', issues: error.issues });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        const field = Array.isArray(target) ? target[0] : undefined;
        reply.status(409).send({ error: 'conflict', field });
        return;
      }
      if (error.code === 'P2025') {
        reply.status(404).send({ error: 'not_found' });
        return;
      }
    }

    // FastifyErrors carry their own statusCode (e.g. 400 for empty body, 404
    // for unknown route). Honour those before defaulting to 500.
    if (isFastifyError(error) && error.statusCode && error.statusCode < 500) {
      reply.status(error.statusCode).send({
        error: error.code ?? 'bad_request',
        message: error.message,
      });
      return;
    }

    req.log.error({ err: error }, 'unhandled error');
    reply.status(500).send({ error: 'internal' });
  });
}
