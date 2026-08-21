import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { DEFAULT_AIR_STATE } from '@smart-ac/shared';
import { openDatabase } from '../db/client.ts';
import { NotFoundError } from '../http/errors.ts';
import { MockAirConditionerTransport } from '../transport/mock-air-conditioner-transport.ts';
import { AirConditionerService } from './air-conditioner-service.ts';

describe('AirConditionerService', () => {
  const db = openDatabase(':memory:');
  const transport = new MockAirConditionerTransport();
  const service = new AirConditionerService(db, transport);

  after(() => {
    db.close();
  });

  before(async () => {
    await transport.connect();
  });

  it('lists seeded air conditioners with empty reportedState', () => {
    const list = service.list();
    assert.equal(list.length, 2);
    assert.equal(list[0]?.id, 'ac-dormitorio');
    assert.equal(list[1]?.id, 'ac-salon');
    for (const ac of list) {
      assert.deepEqual(ac.desiredState, DEFAULT_AIR_STATE);
      assert.equal(ac.reportedState, null);
      assert.equal(ac.online, false);
    }
  });

  it('sends a full state without copying it to reportedState', async () => {
    const next = {
      ...DEFAULT_AIR_STATE,
      power: true,
      mode: 'cool' as const,
      temperature: 24,
    };

    const result = await service.setState('ac-salon', next);
    assert.equal(result.commandSent, true);
    assert.deepEqual(result.desiredState, next);
    assert.equal(result.reportedState, null);

    const stored = service.get('ac-salon');
    assert.deepEqual(stored.desiredState, next);
    assert.equal(stored.reportedState, null);
  });

  it('patches power onto the last desired state', async () => {
    const result = await service.patchState('ac-dormitorio', { power: true });
    assert.equal(result.desiredState.power, true);
    assert.equal(result.desiredState.mode, DEFAULT_AIR_STATE.mode);
    assert.equal(result.reportedState, null);
  });

  it('throws NotFoundError for unknown ids', () => {
    assert.throws(() => service.get('ac-cocina'), NotFoundError);
  });
});
