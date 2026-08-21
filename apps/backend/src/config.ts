import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '../../.env') });
loadEnv();

export type TransportName = 'mock' | 'mqtt';

export interface Config {
  port: number;
  publicBaseUrl: string | undefined;
  databaseUrl: string;
  apiSecret: string;
  transport: TransportName;
  mqttHost: string;
  mqttPort: number;
  mqttUrl: string | undefined;
  mqttUsername: string | undefined;
  mqttPassword: string | undefined;
  mqttControllerId: string;
  mqttAckTimeoutMs: number;
  telegramBotToken: string | undefined;
  telegramAllowedUserIds: number[];
}

function readString(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function readOptional(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === '' ? undefined : value;
}

function readPort(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid ${name}: ${raw}`);
  }
  return parsed;
}

function readTransport(raw: string | undefined): TransportName {
  if (raw === undefined || raw === '' || raw === 'mock') {
    return 'mock';
  }
  if (raw === 'mqtt') {
    return 'mqtt';
  }
  throw new Error(`Invalid TRANSPORT: ${raw} (use mock or mqtt)`);
}

export function loadConfig(): Config {
  return {
    port: readPort('PORT', 3000),
    publicBaseUrl: readOptional('PUBLIC_BASE_URL'),
    databaseUrl: readString('DATABASE_URL', 'file:./data/smart-ac.sqlite'),
    apiSecret: readString('API_SECRET'),
    transport: readTransport(process.env.TRANSPORT),
    mqttHost: process.env.MQTT_HOST ?? '127.0.0.1',
    mqttPort: readPort('MQTT_PORT', 1883),
    mqttUrl: readOptional('MQTT_URL'),
    mqttUsername: readOptional('MQTT_USERNAME'),
    mqttPassword: readOptional('MQTT_PASSWORD'),
    mqttControllerId: process.env.DEVICE_ID ?? 'ac-controller',
    mqttAckTimeoutMs: 8000,
    telegramBotToken: readOptional('TELEGRAM_BOT_TOKEN'),
    telegramAllowedUserIds: parseTelegramUserIds(process.env.TELEGRAM_ALLOWED_USER_IDS),
  };
}

export function parseTelegramUserIds(raw: string | undefined): number[] {
  if (raw === undefined || raw.trim() === '') {
    return [];
  }

  return raw.split(',').map((part) => {
    const trimmed = part.trim();
    const id = Number(trimmed);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`Invalid TELEGRAM_ALLOWED_USER_IDS entry: ${trimmed}`);
    }
    return id;
  });
}
