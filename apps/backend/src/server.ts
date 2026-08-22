import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { startScheduleRunner } from './domain/schedule-runner.ts';
import { startTelegramBot } from './telegram/bot.ts';

const config = loadConfig();
const { app, transport, service, schedules } = await buildApp(config);
const runner = startScheduleRunner(schedules, service, app.log);

await transport.connect();
await app.listen({ port: config.port, host: '0.0.0.0' });

const telegram = await startTelegramBot(config, service, schedules, app.log);

const shutdown = async () => {
  runner.stop();
  await telegram?.stop();
  await app.close();
  await transport.disconnect();
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown();
});
process.on('SIGTERM', () => {
  void shutdown();
});
