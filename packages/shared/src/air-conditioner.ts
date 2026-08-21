import type { AirState } from './air-state.ts';

export interface AirConditioner {
  id: string;
  name: string;
  location: string;
}

export interface AirConditionerView {
  id: string;
  name: string;
  location: string;
  desiredState: AirState;
  reportedState: AirState | null;
  online: boolean;
}

export const SEED_AIR_CONDITIONERS: readonly AirConditioner[] = [
  { id: 'ac-salon', name: 'Salón', location: 'Salón' },
  { id: 'ac-dormitorio', name: 'Dormitorio', location: 'Dormitorio' },
];

export const MQTT_CONTROLLER_ID = 'ac-controller';
