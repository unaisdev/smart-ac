import type { FastifyInstance } from 'fastify';
import {
  isAirMode,
  isAirState,
  isFanSpeed,
  isTemperature,
} from '@smart-ac/shared';
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

  app.post<{ Params: { id: string } }>('/api/air-conditioners/:id/state', async (request) => {
    if (!isAirState(request.body)) {
      throw new ValidationError('Body must be a full AirState');
    }
    return service.setState(request.params.id, request.body);
  });

  app.post<{ Params: { id: string } }>('/api/air-conditioners/:id/power', async (request) => {
    const power = readBooleanField(request.body, 'power');
    return service.patchState(request.params.id, { power });
  });

  app.post<{ Params: { id: string } }>(
    '/api/air-conditioners/:id/temperature',
    async (request) => {
      const temperature = (request.body as { temperature?: unknown } | null)?.temperature;
      if (!isTemperature(temperature)) {
        throw new ValidationError('Body must include temperature as an integer 16–30');
      }
      return service.patchState(request.params.id, { temperature });
    },
  );

  app.post<{ Params: { id: string } }>('/api/air-conditioners/:id/mode', async (request) => {
    const mode = (request.body as { mode?: unknown } | null)?.mode;
    if (!isAirMode(mode)) {
      throw new ValidationError('Body must include mode: auto | cool | dry | heat | fan');
    }
    return service.patchState(request.params.id, { mode });
  });

  app.post<{ Params: { id: string } }>('/api/air-conditioners/:id/fan', async (request) => {
    const fan = (request.body as { fan?: unknown } | null)?.fan;
    if (!isFanSpeed(fan)) {
      throw new ValidationError('Body must include fan: auto | low | medium | high');
    }
    return service.patchState(request.params.id, { fan });
  });

  app.post<{ Params: { id: string } }>('/api/air-conditioners/:id/swing', async (request) => {
    const swing = readBooleanField(request.body, 'swing');
    return service.patchState(request.params.id, { swing });
  });
}

function readBooleanField(body: unknown, field: 'power' | 'swing'): boolean {
  if (body === null || typeof body !== 'object') {
    throw new ValidationError(`Body must include ${field} as a boolean`);
  }
  const value = (body as Record<string, unknown>)[field];
  if (typeof value !== 'boolean') {
    throw new ValidationError(`Body must include ${field} as a boolean`);
  }
  return value;
}
