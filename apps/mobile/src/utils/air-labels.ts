import type { AirState } from '@smart-ac/shared';

export function formatDesiredSummary(power: boolean): string {
  return power ? 'ON' : 'OFF';
}

export function formatActiveStateLine(state: AirState): string {
  return formatDesiredSummary(state.power);
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
