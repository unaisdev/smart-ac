import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { DEFAULT_AIR_STATE } from '@smart-ac/shared';
import { openDatabase } from '../db/client.ts';
import { MockAirConditionerTransport } from '../transport/mock-air-conditioner-transport.ts';
import { AirConditionerService } from './air-conditioner-service.ts';
import { ScheduleService } from './schedule-service.ts';

const MADRID = 'Europe/Madrid';
const COOL_MORNING = {
  ...DEFAULT_AIR_STATE,
  power: true,
  mode: 'cool' as const,
  temperature: 23,
};

describe('ScheduleService', () => {
  const db = openDatabase(':memory:');
  const transport = new MockAirConditionerTransport();
  const airs = new AirConditionerService(db, transport);
  const schedules = new ScheduleService(db, MADRID);

  after(() => {
    db.close();
  });

  it('creates a once schedule one hour before 08:00 Madrid', () => {
    const now = new Date('2026-08-22T04:00:00.000Z');
    const created = schedules.create(
      {
        airConditionerId: 'ac-dormitorio',
        repeat: 'once',
        targetHour: 8,
        targetMinute: 0,
        leadMinutes: 60,
        state: COOL_MORNING,
      },
      now,
    );

    assert.equal(created.executeHour, 7);
    assert.equal(created.executeMinute, 0);
    assert.equal(created.nextExecuteAt, '2026-08-22T05:00:00.000Z');
    assert.equal(created.enabled, true);
    assert.deepEqual(created.state, COOL_MORNING);
    assert.equal(airs.get('ac-dormitorio').desiredState.power, false);
  });

  it('lists only enabled schedules and removes by id', () => {
    const listed = schedules.list();
    assert.equal(listed.length, 1);
    const removed = schedules.remove(listed[0]!.id);
    assert.equal(removed, true);
    assert.equal(schedules.list().length, 0);
  });

  it('disables a once schedule after it fires', () => {
    const now = new Date('2026-08-22T04:00:00.000Z');
    const created = schedules.create(
      {
        airConditionerId: 'ac-salon',
        repeat: 'once',
        targetHour: 8,
        targetMinute: 0,
        leadMinutes: 60,
        state: COOL_MORNING,
      },
      now,
    );

    const dueAt = new Date('2026-08-22T05:00:00.000Z');
    assert.equal(schedules.due(new Date('2026-08-22T04:59:00.000Z')).length, 0);
    assert.equal(schedules.due(dueAt)[0]?.id, created.id);

    const fired = schedules.markFired(created.id, dueAt);
    assert.equal(fired.enabled, false);
    assert.equal(schedules.list().length, 0);
  });

  it('reschedules a daily program to the next local day', () => {
    const now = new Date('2026-08-22T04:00:00.000Z');
    const created = schedules.create(
      {
        airConditionerId: 'ac-dormitorio',
        repeat: 'daily',
        targetHour: 8,
        targetMinute: 0,
        leadMinutes: 60,
        state: COOL_MORNING,
      },
      now,
    );

    const fired = schedules.markFired(created.id, new Date('2026-08-22T05:00:00.000Z'));
    assert.equal(fired.enabled, true);
    assert.equal(fired.nextExecuteAt, '2026-08-23T05:00:00.000Z');
  });
});
