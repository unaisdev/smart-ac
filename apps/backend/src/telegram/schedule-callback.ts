import { isFan, isMode } from './schedule-draft.ts';
import type { AirMode, FanSpeed } from '@smart-ac/shared';
import { isScheduleRepeat, type ScheduleRepeat } from '../domain/schedule.ts';

export type ScheduleCallback =
  | { type: 'new' }
  | { type: 'list' }
  | { type: 'home' }
  | { type: 'cancel' }
  | { type: 'back' }
  | { type: 'next' }
  | { type: 'stay' }
  | { type: 'save' }
  | { type: 'custom-time' }
  | { type: 'pick-air'; id: string }
  | { type: 'pick-time'; hour: number; minute: number }
  | { type: 'pick-hour'; hour: number }
  | { type: 'pick-minute'; minute: number }
  | { type: 'pick-lead'; minutes: number }
  | { type: 'pick-repeat'; repeat: ScheduleRepeat }
  | { type: 'power'; power: boolean }
  | { type: 'mode'; mode: AirMode }
  | { type: 'temp'; delta: 1 | -1 }
  | { type: 'fan'; fan: FanSpeed }
  | { type: 'toggle'; field: 'swing' | 'turbo' | 'eco' | 'led' }
  | { type: 'remove'; id: string };

export function parseScheduleCallback(data: string): ScheduleCallback | undefined {
  if (!data.startsWith('prg:')) {
    return undefined;
  }

  const parts = data.split(':');
  const kind = parts[1];
  if (!kind) {
    return undefined;
  }

  switch (kind) {
    case 'new':
      return { type: 'new' };
    case 'list':
      return { type: 'list' };
    case 'home':
      return { type: 'home' };
    case 'ca':
      return { type: 'cancel' };
    case 'bk':
      return { type: 'back' };
    case 'nx':
      return { type: 'next' };
    case 'st':
      return { type: 'stay' };
    case 'ok':
      return { type: 'save' };
    case 'ct':
      return { type: 'custom-time' };
    case 'air': {
      const id = parts[2];
      return id ? { type: 'pick-air', id } : undefined;
    }
    case 'tm': {
      const hour = parseBoundedInt(parts[2], 0, 23);
      const minute = parseBoundedInt(parts[3], 0, 59);
      if (hour === undefined || minute === undefined) {
        return undefined;
      }
      return { type: 'pick-time', hour, minute };
    }
    case 'hr': {
      const hour = parseBoundedInt(parts[2], 0, 23);
      return hour === undefined ? undefined : { type: 'pick-hour', hour };
    }
    case 'mn': {
      const minute = parseBoundedInt(parts[2], 0, 59);
      return minute === undefined ? undefined : { type: 'pick-minute', minute };
    }
    case 'le': {
      const minutes = parseBoundedInt(parts[2], 0, 12 * 60);
      return minutes === undefined ? undefined : { type: 'pick-lead', minutes };
    }
    case 'rp': {
      const repeat = parts[2];
      if (!repeat || !isScheduleRepeat(repeat)) {
        return undefined;
      }
      return { type: 'pick-repeat', repeat };
    }
    case 'pw': {
      const raw = parts[2];
      if (raw !== '0' && raw !== '1') {
        return undefined;
      }
      return { type: 'power', power: raw === '1' };
    }
    case 'md': {
      const mode = parts[2];
      if (!isMode(mode)) {
        return undefined;
      }
      return { type: 'mode', mode };
    }
    case 'tp': {
      const dir = parts[2];
      if (dir !== '+' && dir !== '-') {
        return undefined;
      }
      return { type: 'temp', delta: dir === '+' ? 1 : -1 };
    }
    case 'fn': {
      const fan = parts[2];
      if (!isFan(fan)) {
        return undefined;
      }
      return { type: 'fan', fan };
    }
    case 'tg': {
      const field = parts[2];
      if (field !== 'swing' && field !== 'turbo' && field !== 'eco' && field !== 'led') {
        return undefined;
      }
      return { type: 'toggle', field };
    }
    case 'rm': {
      const id = parts.slice(2).join(':');
      return id ? { type: 'remove', id } : undefined;
    }
    default:
      return undefined;
  }
}

function parseBoundedInt(raw: string | undefined, min: number, max: number): number | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    return undefined;
  }
  return value;
}
