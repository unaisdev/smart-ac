import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyLeadMinutes,
  formatClock,
  nextOccurrenceUtc,
  zonedLocalToUtc,
} from './schedule-time.ts';

const MADRID = 'Europe/Madrid';

describe('schedule time', () => {
  it('formats clocks with two digits', () => {
    assert.equal(formatClock(7, 0), '07:00');
    assert.equal(formatClock(8, 5), '08:05');
  });

  it('subtracts lead wrapping past midnight', () => {
    assert.deepEqual(applyLeadMinutes(8, 0, 60), { hour: 7, minute: 0 });
    assert.deepEqual(applyLeadMinutes(0, 15, 30), { hour: 23, minute: 45 });
    assert.deepEqual(applyLeadMinutes(8, 0, 0), { hour: 8, minute: 0 });
  });

  it('converts Madrid civil time to UTC in summer and winter', () => {
    assert.equal(zonedLocalToUtc(2026, 8, 22, 7, 0, MADRID).toISOString(), '2026-08-22T05:00:00.000Z');
    assert.equal(zonedLocalToUtc(2026, 1, 15, 7, 0, MADRID).toISOString(), '2026-01-15T06:00:00.000Z');
  });

  it('picks the next local occurrence, not a time already passed', () => {
    const before = new Date('2026-08-22T04:00:00.000Z');
    const after = new Date('2026-08-22T05:00:00.000Z');
    assert.equal(nextOccurrenceUtc(7, 0, before, MADRID).toISOString(), '2026-08-22T05:00:00.000Z');
    assert.equal(nextOccurrenceUtc(7, 0, after, MADRID).toISOString(), '2026-08-23T05:00:00.000Z');
  });
});
