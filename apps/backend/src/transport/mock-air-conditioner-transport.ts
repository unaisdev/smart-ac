import type { AirState } from '@smart-ac/shared';
import type { AirConditionerTransport } from './air-conditioner-transport.ts';

export class MockAirConditionerTransport implements AirConditionerTransport {
  private readonly states = new Map<string, AirState>();

  async connect(): Promise<void> {}

  async disconnect(): Promise<void> {}

  async setState(deviceId: string, state: AirState): Promise<void> {
    this.states.set(deviceId, { ...state });
  }

  async getState(deviceId: string): Promise<AirState | undefined> {
    const state = this.states.get(deviceId);
    return state === undefined ? undefined : { ...state };
  }
}
