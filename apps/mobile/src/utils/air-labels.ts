import type { AirMode, AirState, FanSpeed } from '@smart-ac/shared';

const MODE_LABELS: Record<AirMode, string> = {
  auto: 'AUTO',
  cool: '❄️ Frío',
  dry: '💧 Dry',
  heat: '🔥 Calor',
  fan: '🌀 Fan',
};

const MODE_SHORT: Record<AirMode, string> = {
  auto: 'AUTO',
  cool: '❄️ COOL',
  dry: '💧 DRY',
  heat: '🔥 HEAT',
  fan: '🌀 FAN',
};

const MODE_PLAIN: Record<AirMode, string> = {
  auto: 'AUTO',
  cool: 'COOL',
  dry: 'DRY',
  heat: 'HEAT',
  fan: 'FAN',
};

const FAN_LABELS: Record<FanSpeed, string> = {
  auto: '🌀 AUTO',
  low: 'LOW',
  medium: 'MED',
  high: 'HI',
};

const FAN_PLAIN: Record<FanSpeed, string> = {
  auto: 'AUTO',
  low: 'LOW',
  medium: 'MED',
  high: 'HI',
};

export function formatDesiredSummary(power: boolean, mode: AirMode, temperature: number): string {
  if (!power) {
    return '⏻ OFF';
  }
  return `${MODE_SHORT[mode]} · ${temperature}°C`;
}

/** Inline status under the device name on the home list (no emojis). */
export function formatActiveStateLine(state: AirState): string | null {
  if (!state.power) {
    return null;
  }

  const parts = [MODE_PLAIN[state.mode], `${state.temperature}°C`];

  if (state.fan !== 'auto') {
    parts.push(FAN_PLAIN[state.fan]);
  }
  if (state.swing) {
    parts.push('Swing');
  }
  if (state.turbo) {
    parts.push('Turbo');
  }
  if (state.eco) {
    parts.push('Eco');
  }
  if (state.clean) {
    parts.push('Clean');
  }
  if (state.led) {
    parts.push('LED');
  }

  return parts.join(' · ');
}

export function formatModeLabel(mode: AirMode): string {
  return MODE_LABELS[mode];
}

export function formatModeHero(mode: AirMode): string {
  return MODE_SHORT[mode];
}

export function formatFanLabel(fan: FanSpeed): string {
  return FAN_LABELS[fan];
}

export function deviceEmoji(deviceId: string, name?: string): string {
  const haystack = `${deviceId} ${name ?? ''}`.toLowerCase();
  if (haystack.includes('dorm')) {
    return '🛏';
  }
  if (haystack.includes('salon') || haystack.includes('salón') || haystack.includes('living')) {
    return '🛋';
  }
  return '❄️';
}

export function formatDeviceTitle(deviceId: string, name: string): string {
  return `${deviceEmoji(deviceId, name)} ${name}`;
}
