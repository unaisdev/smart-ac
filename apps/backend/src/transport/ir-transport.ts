import { randomUUID } from 'node:crypto';
import mqtt from 'mqtt';
import {
  isAirState,
  mqttCommandTopic,
  mqttStateTopic,
  mqttStatusTopic,
  type AirState,
  type MqttSetStateCommand,
  type MqttSetStateResponse,
} from '@smart-ac/shared';
import type { Config } from '../config.ts';
import type { AirConditionerTransport } from './air-conditioner-transport.ts';

export class TransportError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = 'TransportError';
    this.statusCode = statusCode;
  }
}

interface PendingAck {
  resolve: () => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class IrTransport implements AirConditionerTransport {
  private client: mqtt.MqttClient | undefined;
  private readonly lastSent = new Map<string, AirState>();
  private readonly pending = new Map<string, PendingAck>();
  private isOnline = false;

  constructor(private readonly config: Config) {}

  get controllerOnline(): boolean {
    return this.isOnline;
  }

  async connect(): Promise<void> {
    const url = this.config.mqttUrl ?? `mqtt://${this.config.mqttHost}:${this.config.mqttPort}`;

    this.client = await mqtt.connectAsync(url, {
      username: this.config.mqttUsername,
      password: this.config.mqttPassword,
      reconnectPeriod: 2000,
      connectTimeout: 10_000,
    });

    const controllerId = this.config.mqttControllerId;
    await this.client.subscribeAsync([
      mqttStateTopic(controllerId),
      mqttStatusTopic(controllerId),
    ]);

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload.toString());
    });

    this.client.on('close', () => {
      this.isOnline = false;
    });
  }

  async disconnect(): Promise<void> {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new TransportError('MQTT disconnected', 503));
    }
    this.pending.clear();

    if (this.client) {
      await this.client.endAsync();
      this.client = undefined;
    }
  }

  async setState(deviceId: string, state: AirState): Promise<void> {
    if (!this.client?.connected) {
      throw new TransportError('MQTT broker is not connected', 503);
    }

    const requestId = randomUUID();
    const command: MqttSetStateCommand = {
      deviceId,
      command: 'setState',
      state,
      requestId,
    };

    const ack = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new TransportError('MQTT command timed out waiting for ESP32 ack', 504));
      }, this.config.mqttAckTimeoutMs);
      this.pending.set(requestId, { resolve, reject, timer });
    });

    await this.client.publishAsync(
      mqttCommandTopic(this.config.mqttControllerId),
      JSON.stringify(command),
      { qos: 1 },
    );

    await ack;
    this.lastSent.set(deviceId, { ...state });
  }

  async getState(deviceId: string): Promise<AirState | undefined> {
    const state = this.lastSent.get(deviceId);
    return state === undefined ? undefined : { ...state };
  }

  private handleMessage(topic: string, raw: string): void {
    const controllerId = this.config.mqttControllerId;

    if (topic === mqttStatusTopic(controllerId)) {
      this.isOnline = parseOnline(raw);
      return;
    }

    if (topic !== mqttStateTopic(controllerId)) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    if (!isMqttSetStateResponse(parsed)) {
      return;
    }

    const pending = this.pending.get(parsed.requestId);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timer);
    this.pending.delete(parsed.requestId);

    if (parsed.success) {
      pending.resolve();
    } else {
      pending.reject(new TransportError('ESP32 reported command failure', 502));
    }
  }
}

function parseOnline(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed === 'online') {
    return true;
  }
  if (trimmed === 'offline') {
    return false;
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed !== null && typeof parsed === 'object' && 'online' in parsed) {
      return Boolean((parsed as { online: unknown }).online);
    }
  } catch {
    return false;
  }
  return false;
}

function isMqttSetStateResponse(value: unknown): value is MqttSetStateResponse {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.deviceId === 'string' &&
    typeof candidate.requestId === 'string' &&
    typeof candidate.success === 'boolean' &&
    isAirState(candidate.state)
  );
}
