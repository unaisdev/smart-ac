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

  it('GET /api/air-conditioners/:id returns one unit', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/air-conditioners/ac-salon',
      headers: { authorization: 'Bearer test-secret' },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { id: string; desiredState: typeof DEFAULT_AIR_STATE };
    assert.equal(body.id, 'ac-salon');
    assert.deepEqual(body.desiredState, DEFAULT_AIR_STATE);
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
    assert.equal(body.reportedState, null);
  });

  it('POST power rejects a missing boolean', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/air-conditioners/ac-salon/power',
      headers: { authorization: 'Bearer test-secret' },
      payload: { power: 'on' },
    });
    assert.equal(response.statusCode, 400);
  });

  it('removed V1 routes return 404', async () => {
    const headers = { authorization: 'Bearer test-secret' };
    const removed = [
      { method: 'POST' as const, url: '/api/air-conditioners/ac-salon/state' },
      { method: 'POST' as const, url: '/api/air-conditioners/ac-salon/temperature' },
      { method: 'POST' as const, url: '/api/air-conditioners/ac-salon/mode' },
      { method: 'POST' as const, url: '/api/air-conditioners/ac-salon/fan' },
      { method: 'POST' as const, url: '/api/air-conditioners/ac-salon/swing' },
      { method: 'GET' as const, url: '/api/schedules' },
      { method: 'POST' as const, url: '/api/schedules' },
    ];

    for (const route of removed) {
      const response = await app.inject({ ...route, headers, payload: {} });
      assert.equal(response.statusCode, 404, route.url);
    }
  });
});
