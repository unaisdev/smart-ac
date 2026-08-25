import type { FastifyInstance } from 'fastify';
import type { AirConditionerService } from '../domain/air-conditioner-service.ts';
import { ValidationError } from './errors.ts';

export async function registerAirConditionerRoutes(
  app: FastifyInstance,
  service: AirConditionerService,
): Promise<void> {
  app.get('/api/air-conditioners', async () => service.list());

  app.get<{ Params: { id: string } }>('/api/air-conditioners/:id', async (request) =>
    service.get(request.params.id),
  );

  app.post<{ Params: { id: string } }>('/api/air-conditioners/:id/power', async (request) => {
    const power = readPower(request.body);
    return service.setPower(request.params.id, power);
  });
}

function readPower(body: unknown): boolean {
  if (body === null || typeof body !== 'object') {
    throw new ValidationError('Body must include power as a boolean');
  }
  const value = (body as Record<string, unknown>).power;
  if (typeof value !== 'boolean') {
    throw new ValidationError('Body must include power as a boolean');
  }
  return value;
}
