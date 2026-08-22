import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { DEFAULT_AIR_STATE } from '@smart-ac/shared';
import { buildApp } from '../app.ts';
import { testConfig } from '../test-config.ts';

describe('HTTP API', () => {
  const config = testConfig();
  let app: Awaited<ReturnType<typeof buildApp>>['app'];
  let db: Awaited<ReturnType<typeof buildApp>>['db'];

  before(async () => {
    const built = await buildApp(config);
    app = built.app;
    db = built.db;
    await built.transport.connect();
  });

  after(async () => {
    await app.close();
    db.close();
  });

  it('GET /health does not require a secret', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true, transport: 'mock' });
  });

  it('GET /api/air-conditioners rejects missing bearer', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/air-conditioners' });
    assert.equal(response.statusCode, 401);
  });

  it('GET /api/air-conditioners returns both units', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/air-conditioners',
      headers: { authorization: 'Bearer test-secret' },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as Array<{ id: string; reportedState: unknown }>;
    assert.equal(body.length, 2);
    assert.equal(body.every((ac) => ac.reportedState === null), true);
  });

  it('POST power updates desiredState only', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/air-conditioners/ac-salon/power',
      headers: { authorization: 'Bearer test-secret' },
      payload: { power: true },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      commandSent: boolean;
      desiredState: typeof DEFAULT_AIR_STATE;
      reportedState: unknown;
    };
    assert.equal(body.commandSent, true);
    assert.equal(body.desiredState.power, true);
    assert.equal(body.desiredState.temperature, DEFAULT_AIR_STATE.temperature);
    assert.equal(body.reportedState, null);
  });

  it('POST state rejects a partial body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/air-conditioners/ac-salon/state',
      headers: { authorization: 'Bearer test-secret' },
      payload: { power: true },
    });
    assert.equal(response.statusCode, 400);
  });

  it('GET /api/schedules rejects missing bearer', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/schedules' });
    assert.equal(response.statusCode, 401);
  });

  it('POST /api/schedules creates, lists, and deletes a program', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/schedules',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        airConditionerId: 'ac-salon',
        repeat: 'once',
        targetHour: 8,
        targetMinute: 0,
        leadMinutes: 60,
        state: { ...DEFAULT_AIR_STATE, power: true, temperature: 24 },
      },
    });
    assert.equal(createResponse.statusCode, 200);
    const created = createResponse.json() as {
      id: string;
      executeHour: number;
      executeMinute: number;
      airConditionerId: string;
    };
    assert.equal(created.airConditionerId, 'ac-salon');
    assert.equal(created.executeHour, 7);
    assert.equal(created.executeMinute, 0);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/schedules',
      headers: { authorization: 'Bearer test-secret' },
    });
    assert.equal(listResponse.statusCode, 200);
    const listed = listResponse.json() as Array<{ id: string }>;
    assert.equal(listed.some((item) => item.id === created.id), true);

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/schedules/${created.id}`,
      headers: { authorization: 'Bearer test-secret' },
    });
    assert.equal(deleteResponse.statusCode, 204);

    const listAfter = await app.inject({
      method: 'GET',
      url: '/api/schedules',
      headers: { authorization: 'Bearer test-secret' },
    });
    const remaining = listAfter.json() as Array<{ id: string }>;
    assert.equal(remaining.some((item) => item.id === created.id), false);
  });

  it('POST /api/schedules rejects an invalid body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/schedules',
      headers: { authorization: 'Bearer test-secret' },
      payload: { airConditionerId: 'ac-salon', repeat: 'weekly' },
    });
    assert.equal(response.statusCode, 400);
  });
});
