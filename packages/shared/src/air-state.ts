export interface AirState {
  power: boolean;
}

export const DEFAULT_AIR_STATE: AirState = { power: false };

export function isAirState(value: unknown): value is AirState {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.power === 'boolean';
}

export function mergeAirState(base: AirState, patch: Partial<AirState>): AirState {
  return { ...base, ...patch };
}

export function parseAirState(value: unknown): AirState {
  if (!isAirState(value)) {
    throw new Error('Invalid AirState');
  }
  return value;
}
