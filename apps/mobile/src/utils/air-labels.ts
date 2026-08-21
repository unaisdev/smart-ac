import type { AirMode, FanSpeed } from '@smart-ac/shared';

const MODE_LABELS: Record<AirMode, string> = {
  auto: 'AUTO',
  cool: 'FRÍO',
  dry: 'DRY',
  heat: 'CALOR',
  fan: 'FAN',
};

const FAN_LABELS: Record<FanSpeed, string> = {
  auto: 'AUTO',
  low: 'LOW',
  medium: 'MED',
  high: 'HIGH',
};

export function formatDesiredSummary(power: boolean, mode: AirMode, temperature: number): string {
  if (!power) {
    return 'OFF';
  }
  return `${MODE_LABELS[mode]} · ${temperature}°C`;
}

export function formatModeLabel(mode: AirMode): string {
  return MODE_LABELS[mode];
}

export function formatFanLabel(fan: FanSpeed): string {
  return FAN_LABELS[fan];
}
