export const AIR_MODES = ['auto', 'cool', 'dry', 'heat', 'fan'] as const;
export type AirMode = (typeof AIR_MODES)[number];

export const FAN_SPEEDS = ['auto', 'low', 'medium', 'high'] as const;
export type FanSpeed = (typeof FAN_SPEEDS)[number];

export const MIN_TEMPERATURE = 16;
export const MAX_TEMPERATURE = 30;

export interface AirState {
  power: boolean;
  mode: AirMode;
  temperature: number;
  fan: FanSpeed;
  swing: boolean;
  turbo: boolean;
  eco: boolean;
  clean: boolean;
  led: boolean;
}

export const DEFAULT_AIR_STATE: AirState = {
  power: false,
  mode: 'cool',
  temperature: 24,
  fan: 'auto',
  swing: false,
  turbo: false,
  eco: false,
  clean: false,
  led: true,
};

export function isAirMode(value: unknown): value is AirMode {
  return typeof value === 'string' && (AIR_MODES as readonly string[]).includes(value);
}

export function isFanSpeed(value: unknown): value is FanSpeed {
  return typeof value === 'string' && (FAN_SPEEDS as readonly string[]).includes(value);
}

export function isTemperature(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_TEMPERATURE &&
    value <= MAX_TEMPERATURE
  );
}

export function isAirState(value: unknown): value is AirState {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.power === 'boolean' &&
    isAirMode(candidate.mode) &&
    isTemperature(candidate.temperature) &&
    isFanSpeed(candidate.fan) &&
    typeof candidate.swing === 'boolean' &&
    typeof candidate.turbo === 'boolean' &&
    typeof candidate.eco === 'boolean' &&
    typeof candidate.clean === 'boolean' &&
    typeof candidate.led === 'boolean'
  );
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
