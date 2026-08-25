import type { AirConditionerView } from '@smart-ac/shared';
import {
  createAirConditionerChangeSubscription,
  type AirConditionerChangeHandler,
  type SubscribeAirConditionerChangesOptions,
} from './subscribe-air-conditioner-changes';

export interface SmartAcApiClientOptions {
  baseUrl: string;
  apiSecret: string;
  fetchImpl?: typeof fetch;
}

export interface CommandResult extends AirConditionerView {
  commandSent: boolean;
  requestId: string;
}

export class SmartAcApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'SmartAcApiError';
  }
}

export class SmartAcApiClient {
  private readonly baseUrl: string;
  private readonly apiSecret: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: SmartAcApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiSecret = options.apiSecret;
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
  }

  listAirConditioners(): Promise<AirConditionerView[]> {
    return this.request<AirConditionerView[]>('GET', '/api/air-conditioners');
  }

  getAirConditioner(id: string): Promise<AirConditionerView> {
    return this.request<AirConditionerView>('GET', `/api/air-conditioners/${encodeURIComponent(id)}`);
  }

  setPower(id: string, power: boolean): Promise<CommandResult> {
    return this.request<CommandResult>('POST', `/api/air-conditioners/${encodeURIComponent(id)}/power`, {
      power,
    });
  }

  /**
   * Subscribe to live air-conditioner updates (SSE).
   */
  subscribeAirConditionerChanges(
    onChange: AirConditionerChangeHandler,
    options?: SubscribeAirConditionerChangesOptions,
  ): () => void {
    return createAirConditionerChangeSubscription({
      baseUrl: this.baseUrl,
      apiSecret: this.apiSecret,
      fetchImpl: this.fetchImpl,
      onChange,
      onError: options?.onError,
      onOpen: options?.onOpen,
      reconnectDelayMs: options?.reconnectDelayMs,
    });
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiSecret}`,
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let parsed: unknown = null;
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        parsed = text;
      }
    }

    if (!response.ok) {
      throw new SmartAcApiError(`API ${method} ${path} failed`, response.status, parsed);
    }

    return parsed as T;
  }
}
