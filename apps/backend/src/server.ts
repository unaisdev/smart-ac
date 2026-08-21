import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';

const config = loadConfig();
const { app, transport } = await buildApp(config);

await transport.connect();
await app.listen({ port: config.port, host: '0.0.0.0' });

const shutdown = async () => {
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
