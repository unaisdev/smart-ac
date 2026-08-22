import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import {
  AIR_CONDITIONER_CHANGED_EVENT,
  isAirConditionerChangedEvent,
} from '@smart-ac/shared';
import { buildApp } from '../app.ts';
import { testConfig } from '../test-config.ts';

describe('SSE /api/events', () => {
  const config = testConfig();
  let app: Awaited<ReturnType<typeof buildApp>>['app'];
  let db: Awaited<ReturnType<typeof buildApp>>['db'];
  let baseUrl = '';

  before(async () => {
    const built = await buildApp(config);
    app = built.app;
    db = built.db;
    await built.transport.connect();
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();
    assert.ok(address && typeof address === 'object');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await app.close();
    db.close();
  });

  it('rejects missing bearer', async () => {
    const response = await fetch(`${baseUrl}/api/events`);
    assert.equal(response.status, 401);
  });

  it('pushes air-conditioner-changed when desired state updates', async () => {
    const controller = new AbortController();
    const response = await fetch(`${baseUrl}/api/events`, {
      headers: {
        authorization: 'Bearer test-secret',
        accept: 'text/event-stream',
      },
      signal: controller.signal,
    });
    assert.equal(response.status, 200);
    assert.ok(response.body);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const waitForChange = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          throw new Error('SSE stream closed before change event');
        }
        buffer += decoder.decode(value, { stream: true });
        const match = buffer.match(/event: air-conditioner-changed\ndata: (.+)\n\n/);
        if (match?.[1]) {
          return JSON.parse(match[1]) as unknown;
        }
      }
    })();

    await new Promise((resolve) => setTimeout(resolve, 50));

    const powerResponse = await fetch(`${baseUrl}/api/air-conditioners/ac-salon/power`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-secret',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ power: true }),
    });
    assert.equal(powerResponse.status, 200);

    const payload = await Promise.race([
      waitForChange,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timed out waiting for SSE event')), 2000);
      }),
    ]);

    controller.abort();

    assert.equal(isAirConditionerChangedEvent(payload), true);
    if (!isAirConditionerChangedEvent(payload)) {
      return;
    }
    assert.equal(payload.type, AIR_CONDITIONER_CHANGED_EVENT);
    assert.equal(payload.airConditioner.id, 'ac-salon');
    assert.equal(payload.airConditioner.desiredState.power, true);
  });
});
