import type { Config } from './config.ts';

export function testConfig(overrides?: Partial<Config>): Config {
  return {
    port: 3000,
    publicBaseUrl: undefined,
    databaseUrl: ':memory:',
    apiSecret: 'test-secret',
    transport: 'mock',
    mqttHost: '127.0.0.1',
    mqttPort: 1883,
    mqttUrl: undefined,
    mqttUsername: undefined,
    mqttPassword: undefined,
    mqttControllerId: 'ac-controller',
    mqttAckTimeoutMs: 500,
    telegramBotToken: undefined,
    telegramAllowedUserIds: [],
    timeZone: 'Europe/Madrid',
    ...overrides,
  };
}
