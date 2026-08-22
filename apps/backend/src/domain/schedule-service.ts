import { randomUUID } from 'node:crypto';
import { isAirState, type AirState } from '@smart-ac/shared';
import type { SqliteDatabase } from '../db/client.ts';
import { NotFoundError } from '../http/errors.ts';
import type { AirConditionerSchedule, CreateScheduleInput } from './schedule.ts';
import { isScheduleRepeat } from './schedule.ts';
import { applyLeadMinutes, nextOccurrenceUtc } from './schedule-time.ts';

interface ScheduleRow {
  id: string;
  air_conditioner_id: string;
  enabled: number;
  repeat: string;
  target_hour: number;
  target_minute: number;
  lead_minutes: number;
  execute_hour: number;
  execute_minute: number;
  next_execute_at: string;
  last_fired_at: string | null;
  state_json: string;
  created_at: string;
}

export class ScheduleService {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly timeZone: string,
  ) {}

  list(): AirConditionerSchedule[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM schedules
         WHERE enabled = 1
         ORDER BY next_execute_at, id`,
      )
      .all() as ScheduleRow[];
    return rows.map((row) => toSchedule(row));
  }

  get(id: string): AirConditionerSchedule {
    const row = this.db.prepare(`SELECT * FROM schedules WHERE id = ?`).get(id) as
      | ScheduleRow
      | undefined;
    if (!row) {
      throw new NotFoundError(`Schedule not found: ${id}`);
    }
    return toSchedule(row);
  }

  create(input: CreateScheduleInput, now = new Date()): AirConditionerSchedule {
    this.assertAirExists(input.airConditionerId);
    assertClock(input.targetHour, input.targetMinute);
    assertLead(input.leadMinutes);

    const execute = applyLeadMinutes(input.targetHour, input.targetMinute, input.leadMinutes);
    const id = randomUUID();
    const createdAt = now.toISOString();
    const nextExecuteAt = nextOccurrenceUtc(execute.hour, execute.minute, now, this.timeZone).toISOString();

    this.db
      .prepare(
        `INSERT INTO schedules (
           id, air_conditioner_id, enabled, repeat,
           target_hour, target_minute, lead_minutes,
           execute_hour, execute_minute, next_execute_at, last_fired_at,
           state_json, created_at
         ) VALUES (
           @id, @airConditionerId, 1, @repeat,
           @targetHour, @targetMinute, @leadMinutes,
           @executeHour, @executeMinute, @nextExecuteAt, NULL,
           @stateJson, @createdAt
         )`,
      )
      .run({
        id,
        airConditionerId: input.airConditionerId,
        repeat: input.repeat,
        targetHour: input.targetHour,
        targetMinute: input.targetMinute,
        leadMinutes: input.leadMinutes,
        executeHour: execute.hour,
        executeMinute: execute.minute,
        nextExecuteAt,
        stateJson: JSON.stringify(input.state),
        createdAt,
      });

    return this.get(id);
  }

  update(id: string, input: CreateScheduleInput, now = new Date()): AirConditionerSchedule {
    this.get(id);
    this.assertAirExists(input.airConditionerId);
    assertClock(input.targetHour, input.targetMinute);
    assertLead(input.leadMinutes);

    const execute = applyLeadMinutes(input.targetHour, input.targetMinute, input.leadMinutes);
    const nextExecuteAt = nextOccurrenceUtc(execute.hour, execute.minute, now, this.timeZone).toISOString();

    this.db
      .prepare(
        `UPDATE schedules
         SET air_conditioner_id = @airConditionerId,
             repeat = @repeat,
             target_hour = @targetHour,
             target_minute = @targetMinute,
             lead_minutes = @leadMinutes,
             execute_hour = @executeHour,
             execute_minute = @executeMinute,
             next_execute_at = @nextExecuteAt,
             state_json = @stateJson,
             enabled = 1
         WHERE id = @id`,
      )
      .run({
        id,
        airConditionerId: input.airConditionerId,
        repeat: input.repeat,
        targetHour: input.targetHour,
        targetMinute: input.targetMinute,
        leadMinutes: input.leadMinutes,
        executeHour: execute.hour,
        executeMinute: execute.minute,
        nextExecuteAt,
        stateJson: JSON.stringify(input.state),
      });

    return this.get(id);
  }

  remove(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM schedules WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  due(now = new Date()): AirConditionerSchedule[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM schedules
         WHERE enabled = 1 AND next_execute_at <= @now
         ORDER BY next_execute_at, id`,
      )
      .all({ now: now.toISOString() }) as ScheduleRow[];
    return rows.map((row) => toSchedule(row));
  }

  markFired(id: string, now = new Date()): AirConditionerSchedule {
    const current = this.get(id);
    const lastFiredAt = now.toISOString();

    if (current.repeat === 'daily') {
      const nextExecuteAt = nextOccurrenceUtc(
        current.executeHour,
        current.executeMinute,
        now,
        this.timeZone,
      ).toISOString();
      this.db
        .prepare(
          `UPDATE schedules
           SET last_fired_at = @lastFiredAt, next_execute_at = @nextExecuteAt
           WHERE id = @id`,
        )
        .run({ id, lastFiredAt, nextExecuteAt });
      return this.get(id);
    }

    this.db.prepare(`DELETE FROM schedules WHERE id = ?`).run(id);
    return { ...current, enabled: false, lastFiredAt };
  }

  private assertAirExists(airConditionerId: string): void {
    const row = this.db
      .prepare(`SELECT id FROM air_conditioners WHERE id = ?`)
      .get(airConditionerId) as { id: string } | undefined;
    if (!row) {
      throw new NotFoundError(`Air conditioner not found: ${airConditionerId}`);
    }
  }
}

function assertClock(hour: number, minute: number): void {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error(`Invalid hour: ${hour}`);
  }
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error(`Invalid minute: ${minute}`);
  }
}

function assertLead(leadMinutes: number): void {
  if (!Number.isInteger(leadMinutes) || leadMinutes < 0 || leadMinutes > 12 * 60) {
    throw new Error(`Invalid leadMinutes: ${leadMinutes}`);
  }
}

function toSchedule(row: ScheduleRow): AirConditionerSchedule {
  if (!isScheduleRepeat(row.repeat)) {
    throw new Error(`Invalid schedule repeat: ${row.repeat}`);
  }
  return {
    id: row.id,
    airConditionerId: row.air_conditioner_id,
    enabled: row.enabled === 1,
    repeat: row.repeat,
    targetHour: row.target_hour,
    targetMinute: row.target_minute,
    leadMinutes: row.lead_minutes,
    executeHour: row.execute_hour,
    executeMinute: row.execute_minute,
    nextExecuteAt: row.next_execute_at,
    lastFiredAt: row.last_fired_at,
    state: parseState(row.state_json),
    createdAt: row.created_at,
  };
}

function parseState(json: string): AirState {
  const parsed: unknown = JSON.parse(json);
  if (!isAirState(parsed)) {
    throw new Error('Invalid stored schedule state');
  }
  return parsed;
}
