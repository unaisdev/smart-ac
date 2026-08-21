import {
  DEFAULT_AIR_STATE,
  MAX_TEMPERATURE,
  MIN_TEMPERATURE,
  type AirMode,
  type AirState,
  type FanSpeed,
} from '@smart-ac/shared';
import type { ScheduleRepeat } from '../domain/schedule.ts';

export type WizardStep =
  | 'air'
  | 'time'
  | 'hour'
  | 'minute'
  | 'lead'
  | 'repeat'
  | 'state'
  | 'confirm';

export interface ScheduleDraft {
  step: WizardStep;
  airConditionerId?: string;
  targetHour?: number;
  targetMinute?: number;
  leadMinutes?: number;
  repeat?: ScheduleRepeat;
  pickingCustomTime: boolean;
  state: AirState;
}

export type ScheduleDraftAction =
  | { type: 'pick-air'; id: string }
  | { type: 'pick-time'; hour: number; minute: number }
  | { type: 'custom-time' }
  | { type: 'pick-hour'; hour: number }
  | { type: 'pick-minute'; minute: number }
  | { type: 'pick-lead'; minutes: number }
  | { type: 'pick-repeat'; repeat: ScheduleRepeat }
  | { type: 'patch-state'; patch: Partial<AirState> }
  | { type: 'temp-delta'; delta: 1 | -1 }
  | { type: 'to-confirm' }
  | { type: 'back' };

export const TIME_PRESETS: ReadonlyArray<{ hour: number; minute: number }> = [
  { hour: 6, minute: 0 },
  { hour: 7, minute: 0 },
  { hour: 7, minute: 30 },
  { hour: 8, minute: 0 },
  { hour: 8, minute: 30 },
  { hour: 9, minute: 0 },
  { hour: 18, minute: 0 },
  { hour: 22, minute: 0 },
];

export const LEAD_PRESETS = [0, 15, 30, 45, 60, 90, 120] as const;

export function createScheduleDraft(): ScheduleDraft {
  return {
    step: 'air',
    pickingCustomTime: false,
    state: { ...DEFAULT_AIR_STATE, power: true },
  };
}

export function reduceScheduleDraft(draft: ScheduleDraft, action: ScheduleDraftAction): ScheduleDraft {
  switch (action.type) {
    case 'pick-air':
      return { ...draft, airConditionerId: action.id, step: 'time', pickingCustomTime: false };
    case 'pick-time':
      return {
        ...draft,
        targetHour: action.hour,
        targetMinute: action.minute,
        pickingCustomTime: false,
        step: 'lead',
      };
    case 'custom-time':
      return { ...draft, pickingCustomTime: true, step: 'hour', targetHour: undefined, targetMinute: undefined };
    case 'pick-hour':
      return { ...draft, targetHour: action.hour, step: 'minute' };
    case 'pick-minute':
      return { ...draft, targetMinute: action.minute, step: 'lead' };
    case 'pick-lead':
      return { ...draft, leadMinutes: action.minutes, step: 'repeat' };
    case 'pick-repeat':
      return { ...draft, repeat: action.repeat, step: 'state' };
    case 'patch-state':
      return { ...draft, state: { ...draft.state, ...action.patch } };
    case 'temp-delta':
      return {
        ...draft,
        state: {
          ...draft.state,
          temperature: clampTemp(draft.state.temperature + action.delta),
        },
      };
    case 'to-confirm':
      return { ...draft, step: 'confirm' };
    case 'back':
      return goBack(draft);
  }
}

export function isCompleteDraft(
  draft: ScheduleDraft,
): draft is ScheduleDraft & {
  airConditionerId: string;
  targetHour: number;
  targetMinute: number;
  leadMinutes: number;
  repeat: ScheduleRepeat;
} {
  return (
    draft.airConditionerId !== undefined &&
    draft.targetHour !== undefined &&
    draft.targetMinute !== undefined &&
    draft.leadMinutes !== undefined &&
    draft.repeat !== undefined
  );
}

export class WizardSessions {
  private readonly drafts = new Map<number, ScheduleDraft>();

  start(chatId: number): ScheduleDraft {
    const draft = createScheduleDraft();
    this.drafts.set(chatId, draft);
    return draft;
  }

  get(chatId: number): ScheduleDraft | undefined {
    return this.drafts.get(chatId);
  }

  set(chatId: number, draft: ScheduleDraft): void {
    this.drafts.set(chatId, draft);
  }

  clear(chatId: number): void {
    this.drafts.delete(chatId);
  }
}

function goBack(draft: ScheduleDraft): ScheduleDraft {
  switch (draft.step) {
    case 'air':
      return draft;
    case 'time':
      return { ...draft, step: 'air' };
    case 'hour':
      return { ...draft, step: 'time', pickingCustomTime: false };
    case 'minute':
      return { ...draft, step: 'hour' };
    case 'lead':
      return {
        ...draft,
        step: draft.pickingCustomTime ? 'minute' : 'time',
      };
    case 'repeat':
      return { ...draft, step: 'lead' };
    case 'state':
      return { ...draft, step: 'repeat' };
    case 'confirm':
      return { ...draft, step: 'state' };
  }
}

function clampTemp(value: number): number {
  return Math.min(MAX_TEMPERATURE, Math.max(MIN_TEMPERATURE, value));
}

export function isMode(value: string | undefined): value is AirMode {
  return value === 'auto' || value === 'cool' || value === 'dry' || value === 'heat' || value === 'fan';
}

export function isFan(value: string | undefined): value is FanSpeed {
  return value === 'auto' || value === 'low' || value === 'medium' || value === 'high';
}
