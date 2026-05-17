import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './env.js';
import { registerErrorHandler } from './lib/error-handler.js';
import { criRoutes } from './routes/cris.js';
import { eventoRoutes } from './routes/eventos.js';

export async function buildServer() {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? { level: env.LOG_LEVEL, transport: { target: 'pino-pretty' } }
        : { level: env.LOG_LEVEL },
  });

  await app.register(cors, {
    origin: env.NODE_ENV === 'development' ? 'http://localhost:3000' : false,
  });

  registerErrorHandler(app);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(criRoutes, { prefix: '/cris' });
  await app.register(eventoRoutes);

  return app;
}

async function start() {
  const app = await buildServer();
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
