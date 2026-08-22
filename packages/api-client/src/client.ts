import type {
  AirConditionerSchedule,
  AirConditionerView,
  AirMode,
  AirState,
  CreateScheduleInput,
  FanSpeed,
} from '@smart-ac/shared';

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

  setState(id: string, state: AirState): Promise<CommandResult> {
    return this.request<CommandResult>('POST', `/api/air-conditioners/${encodeURIComponent(id)}/state`, state);
  }

  setPower(id: string, power: boolean): Promise<CommandResult> {
    return this.request<CommandResult>('POST', `/api/air-conditioners/${encodeURIComponent(id)}/power`, {
      power,
    });
  }

  setTemperature(id: string, temperature: number): Promise<CommandResult> {
    return this.request<CommandResult>(
      'POST',
      `/api/air-conditioners/${encodeURIComponent(id)}/temperature`,
      { temperature },
    );
  }

  setMode(id: string, mode: AirMode): Promise<CommandResult> {
    return this.request<CommandResult>('POST', `/api/air-conditioners/${encodeURIComponent(id)}/mode`, {
      mode,
    });
  }

  setFan(id: string, fan: FanSpeed): Promise<CommandResult> {
    return this.request<CommandResult>('POST', `/api/air-conditioners/${encodeURIComponent(id)}/fan`, {
      fan,
    });
  }

  setSwing(id: string, swing: boolean): Promise<CommandResult> {
    return this.request<CommandResult>('POST', `/api/air-conditioners/${encodeURIComponent(id)}/swing`, {
      swing,
    });
  }

  listSchedules(): Promise<AirConditionerSchedule[]> {
    return this.request<AirConditionerSchedule[]>('GET', '/api/schedules');
  }

  createSchedule(input: CreateScheduleInput): Promise<AirConditionerSchedule> {
    return this.request<AirConditionerSchedule>('POST', '/api/schedules', input);
  }

  updateSchedule(id: string, input: CreateScheduleInput): Promise<AirConditionerSchedule> {
    return this.request<AirConditionerSchedule>(
      'PUT',
      `/api/schedules/${encodeURIComponent(id)}`,
      input,
    );
  }

  deleteSchedule(id: string): Promise<void> {
    return this.request<void>('DELETE', `/api/schedules/${encodeURIComponent(id)}`);
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
