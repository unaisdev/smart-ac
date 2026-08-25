import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { startTelegramBot } from './telegram/bot.ts';

const config = loadConfig();
const { app, transport, service } = await buildApp(config);

await transport.connect();
await app.listen({ port: config.port, host: '0.0.0.0' });

const telegram = await startTelegramBot(config, service, app.log);

const shutdown = async () => {
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
