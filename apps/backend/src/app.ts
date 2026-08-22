import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from './config.ts';
import { AirConditionerService } from './domain/air-conditioner-service.ts';
import { ScheduleService } from './domain/schedule-service.ts';
import { openDatabase, type SqliteDatabase } from './db/client.ts';
import { registerAirConditionerRoutes } from './http/air-conditioners.ts';
import { registerApiAuth } from './http/auth.ts';
import { HttpError } from './http/errors.ts';
import { registerHealthRoutes } from './http/health.ts';
import { registerScheduleRoutes } from './http/schedules.ts';
import type { AirConditionerTransport } from './transport/air-conditioner-transport.ts';
import { IrTransport, TransportError } from './transport/ir-transport.ts';
import { MockAirConditionerTransport } from './transport/mock-air-conditioner-transport.ts';

export interface AppInstance {
  app: FastifyInstance;
  db: SqliteDatabase;
  transport: AirConditionerTransport;
  service: AirConditionerService;
  schedules: ScheduleService;
}

export async function buildApp(
  config: Config,
  overrides?: {
    transport?: AirConditionerTransport;
    databaseUrl?: string;
  },
): Promise<AppInstance> {
  const db = openDatabase(overrides?.databaseUrl ?? config.databaseUrl);
  const transport = overrides?.transport ?? createTransport(config);
  const service = new AirConditionerService(db, transport);
  const schedules = new ScheduleService(db, config.timeZone);

  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError || error instanceof TransportError) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    app.log.error(error);
    return reply.code(500).send({ error: 'Internal Server Error' });
  });

  await registerApiAuth(app, config.apiSecret);
  await registerHealthRoutes(app, db, config.transport);
  await registerAirConditionerRoutes(app, service);
  await registerScheduleRoutes(app, schedules);

  return { app, db, transport, service, schedules };
}

export function createTransport(config: Config): AirConditionerTransport {
  if (config.transport === 'mqtt') {
    return new IrTransport(config);
  }
  return new MockAirConditionerTransport();
}
