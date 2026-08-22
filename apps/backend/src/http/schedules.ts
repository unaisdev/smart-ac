import type { FastifyInstance } from 'fastify';
import {
  isAirState,
  isScheduleRepeat,
  type CreateScheduleInput,
} from '@smart-ac/shared';
import type { ScheduleService } from '../domain/schedule-service.ts';
import { NotFoundError, ValidationError } from './errors.ts';

export async function registerScheduleRoutes(
  app: FastifyInstance,
  service: ScheduleService,
): Promise<void> {
  app.get('/api/schedules', async () => service.list());

  app.post('/api/schedules', async (request) => {
    const input = parseCreateScheduleInput(request.body);
    try {
      return service.create(input);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ValidationError(error.message);
      }
      throw error;
    }
  });

  app.put<{ Params: { id: string } }>('/api/schedules/:id', async (request) => {
    const input = parseCreateScheduleInput(request.body);
    try {
      return service.update(request.params.id, input);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ValidationError(error.message);
      }
      throw error;
    }
  });

  app.delete<{ Params: { id: string } }>('/api/schedules/:id', async (request, reply) => {
    const removed = service.remove(request.params.id);
    if (!removed) {
      throw new NotFoundError(`Schedule not found: ${request.params.id}`);
    }
    return reply.code(204).send();
  });
}

function parseCreateScheduleInput(body: unknown): CreateScheduleInput {
  if (body === null || typeof body !== 'object') {
    throw new ValidationError('Body must be a CreateScheduleInput object');
  }

  const record = body as Record<string, unknown>;
  const { airConditionerId, repeat, targetHour, targetMinute, leadMinutes, state } = record;

  if (typeof airConditionerId !== 'string' || airConditionerId.length === 0) {
    throw new ValidationError('Body must include airConditionerId as a non-empty string');
  }
  if (typeof repeat !== 'string' || !isScheduleRepeat(repeat)) {
    throw new ValidationError('Body must include repeat: once | daily');
  }
  if (!Number.isInteger(targetHour) || (targetHour as number) < 0 || (targetHour as number) > 23) {
    throw new ValidationError('Body must include targetHour as an integer 0–23');
  }
  if (!Number.isInteger(targetMinute) || (targetMinute as number) < 0 || (targetMinute as number) > 59) {
    throw new ValidationError('Body must include targetMinute as an integer 0–59');
  }
  if (!Number.isInteger(leadMinutes) || (leadMinutes as number) < 0 || (leadMinutes as number) > 12 * 60) {
    throw new ValidationError('Body must include leadMinutes as an integer 0–720');
  }
  if (!isAirState(state)) {
    throw new ValidationError('Body must include a full AirState in state');
  }

  return {
    airConditionerId,
    repeat,
    targetHour: targetHour as number,
    targetMinute: targetMinute as number,
    leadMinutes: leadMinutes as number,
    state,
  };
}
