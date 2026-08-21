import type { FastifyInstance } from 'fastify';
import type { TransportName } from '../config.ts';
import type { SqliteDatabase } from '../db/client.ts';

export async function registerHealthRoutes(
  app: FastifyInstance,
  db: SqliteDatabase,
  transport: TransportName,
): Promise<void> {
  app.get('/health', async (_request, reply) => {
    try {
      db.prepare('SELECT 1').get();
    } catch {
      return reply.code(503).send({ ok: false, transport });
    }

    return { ok: true, transport };
  });
}
