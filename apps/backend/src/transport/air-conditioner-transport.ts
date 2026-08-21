import type { AirState } from '@smart-ac/shared';

export interface AirConditionerTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  setState(deviceId: string, state: AirState): Promise<void>;
  getState(deviceId: string): Promise<AirState | undefined>;
}
