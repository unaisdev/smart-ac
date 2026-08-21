import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

export async function registerApiAuth(app: FastifyInstance, apiSecret: string): Promise<void> {
  app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api')) {
      return;
    }

    const header = request.headers.authorization;
    if (!isValidBearer(header, apiSecret)) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });
}

export function isValidBearer(header: string | undefined, secret: string): boolean {
  if (!header?.startsWith('Bearer ')) {
    return false;
  }

  const token = header.slice('Bearer '.length);
  const tokenBuffer = Buffer.from(token);
  const secretBuffer = Buffer.from(secret);
  if (tokenBuffer.length !== secretBuffer.length) {
    return false;
  }
  return timingSafeEqual(tokenBuffer, secretBuffer);
}
