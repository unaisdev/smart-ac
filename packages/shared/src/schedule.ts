import type { AirState } from './air-state.ts';

export type ScheduleRepeat = 'once' | 'daily';

export interface AirConditionerSchedule {
  id: string;
  airConditionerId: string;
  enabled: boolean;
  repeat: ScheduleRepeat;
  targetHour: number;
  targetMinute: number;
  leadMinutes: number;
  executeHour: number;
  executeMinute: number;
  nextExecuteAt: string;
  lastFiredAt: string | null;
  state: AirState;
  createdAt: string;
}

export interface CreateScheduleInput {
  airConditionerId: string;
  repeat: ScheduleRepeat;
  targetHour: number;
  targetMinute: number;
  leadMinutes: number;
  state: AirState;
}

export function isScheduleRepeat(value: string): value is ScheduleRepeat {
  return value === 'once' || value === 'daily';
}
