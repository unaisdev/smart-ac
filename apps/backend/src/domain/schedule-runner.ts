import type { FastifyBaseLogger } from 'fastify';
import type { AirConditionerService } from './air-conditioner-service.ts';
import type { ScheduleService } from './schedule-service.ts';

export interface ScheduleRunner {
  stop(): void;
}

export function startScheduleRunner(
  schedules: ScheduleService,
  service: AirConditionerService,
  logger: FastifyBaseLogger,
  options?: { intervalMs?: number; getNow?: () => Date },
): ScheduleRunner {
  const intervalMs = options?.intervalMs ?? 15_000;
  const getNow = options?.getNow ?? (() => new Date());

  const tick = async (): Promise<void> => {
    const now = getNow();
    for (const schedule of schedules.due(now)) {
      try {
        const result = await service.setState(schedule.airConditionerId, schedule.state);
        if (result.commandSent) {
          schedules.markFired(schedule.id, now);
        } else {
          logger.warn({ scheduleId: schedule.id }, 'Scheduled command was not sent');
        }
      } catch (error) {
        logger.error({ err: error, scheduleId: schedule.id }, 'Failed to run scheduled command');
      }
    }
  };

  const handle = setInterval(() => {
    void tick();
  }, intervalMs);
  void tick();

  return {
    stop() {
      clearInterval(handle);
    },
  };
}
