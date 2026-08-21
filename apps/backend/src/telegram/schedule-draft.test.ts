import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createScheduleDraft,
  isCompleteDraft,
  reduceScheduleDraft,
} from './schedule-draft.ts';
import { parseScheduleCallback } from './schedule-callback.ts';
import { formatLeadLabel } from './schedule-copy.ts';

describe('schedule wizard draft', () => {
  it('walks wake-up 08:00 with 1 h lead to a complete daily draft', () => {
    let draft = createScheduleDraft();
    draft = reduceScheduleDraft(draft, { type: 'pick-air', id: 'ac-dormitorio' });
    draft = reduceScheduleDraft(draft, { type: 'pick-time', hour: 8, minute: 0 });
    draft = reduceScheduleDraft(draft, { type: 'pick-lead', minutes: 60 });
    draft = reduceScheduleDraft(draft, { type: 'pick-repeat', repeat: 'daily' });
    draft = reduceScheduleDraft(draft, {
      type: 'patch-state',
      patch: { mode: 'cool', temperature: 23 },
    });
    draft = reduceScheduleDraft(draft, { type: 'to-confirm' });

    assert.equal(draft.step, 'confirm');
    assert.equal(isCompleteDraft(draft), true);
    if (!isCompleteDraft(draft)) {
      return;
    }
    assert.equal(draft.airConditionerId, 'ac-dormitorio');
    assert.equal(draft.targetHour, 8);
    assert.equal(draft.leadMinutes, 60);
    assert.equal(draft.repeat, 'daily');
    assert.equal(draft.state.temperature, 23);
    assert.equal(draft.state.power, true);
  });

  it('goes back from lead to time after a preset', () => {
    let draft = createScheduleDraft();
    draft = reduceScheduleDraft(draft, { type: 'pick-air', id: 'ac-salon' });
    draft = reduceScheduleDraft(draft, { type: 'pick-time', hour: 7, minute: 30 });
    draft = reduceScheduleDraft(draft, { type: 'pick-lead', minutes: 30 });
    draft = reduceScheduleDraft(draft, { type: 'back' });
    assert.equal(draft.step, 'lead');
    draft = reduceScheduleDraft(draft, { type: 'back' });
    assert.equal(draft.step, 'time');
  });
});

describe('schedule callbacks', () => {
  it('parses time, lead and delete payloads', () => {
    assert.deepEqual(parseScheduleCallback('prg:tm:8:0'), { type: 'pick-time', hour: 8, minute: 0 });
    assert.deepEqual(parseScheduleCallback('prg:le:60'), { type: 'pick-lead', minutes: 60 });
    assert.deepEqual(parseScheduleCallback('prg:rp:daily'), { type: 'pick-repeat', repeat: 'daily' });
    assert.equal(parseScheduleCallback('s:ac-salon'), undefined);
  });
});

describe('schedule copy', () => {
  it('labels lead times in Spanish', () => {
    assert.equal(formatLeadLabel(0), 'A esa hora');
    assert.equal(formatLeadLabel(15), '15 min antes');
    assert.equal(formatLeadLabel(60), '1 h antes');
    assert.equal(formatLeadLabel(90), '1 h 30 min antes');
  });
});
