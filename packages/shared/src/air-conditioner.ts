import { isAirState, type AirState } from './air-state.ts';

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

export const AIR_CONDITIONER_CHANGED_EVENT = 'air-conditioner-changed' as const;

export interface AirConditionerChangedEvent {
  type: typeof AIR_CONDITIONER_CHANGED_EVENT;
  airConditioner: AirConditionerView;
}

export function isAirConditionerView(value: unknown): value is AirConditionerView {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.location === 'string' &&
    isAirState(candidate.desiredState) &&
    (candidate.reportedState === null || isAirState(candidate.reportedState)) &&
    typeof candidate.online === 'boolean'
  );
}

export function isAirConditionerChangedEvent(value: unknown): value is AirConditionerChangedEvent {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.type === AIR_CONDITIONER_CHANGED_EVENT &&
    isAirConditionerView(candidate.airConditioner)
  );
}

export const SEED_AIR_CONDITIONERS: readonly AirConditioner[] = [
  { id: 'ac-salon', name: 'Salón', location: 'Salón' },
  { id: 'ac-dormitorio', name: 'Dormitorio', location: 'Dormitorio' },
];

export const MQTT_CONTROLLER_ID = 'ac-controller';
