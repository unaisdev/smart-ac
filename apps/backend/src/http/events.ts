import type { FastifyInstance } from 'fastify';
import {
  AIR_CONDITIONER_CHANGED_EVENT,
  type AirConditionerChangedEvent,
} from '@smart-ac/shared';
import type { AirConditionerService } from '../domain/air-conditioner-service.ts';

const HEARTBEAT_MS = 15_000;

export async function registerEventRoutes(
  app: FastifyInstance,
  service: AirConditionerService,
): Promise<void> {
  app.get('/api/events', async (request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    reply.raw.write(':ok\n\n');

    const writeEvent = (payload: AirConditionerChangedEvent) => {
      reply.raw.write(
        `event: ${AIR_CONDITIONER_CHANGED_EVENT}\ndata: ${JSON.stringify(payload)}\n\n`,
      );
    };

    const unsubscribe = service.onChanged((id) => {
      try {
        writeEvent({
          type: AIR_CONDITIONER_CHANGED_EVENT,
          airConditioner: service.get(id),
        });
      } catch (error) {
        request.log.error(error, 'Failed to push air conditioner change over SSE');
      }
    });

    const heartbeat = setInterval(() => {
      reply.raw.write(':ping\n\n');
    }, HEARTBEAT_MS);

    const cleanup = () => {
      clearInterval(heartbeat);
      unsubscribe();
    };

    request.raw.on('close', cleanup);
    request.raw.on('error', cleanup);
  });
}
