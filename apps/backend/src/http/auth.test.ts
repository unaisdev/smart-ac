import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isValidBearer } from './auth.ts';

describe('isValidBearer', () => {
  it('accepts the matching secret', () => {
    assert.equal(isValidBearer('Bearer test-secret', 'test-secret'), true);
  });

  it('rejects a wrong secret of the same length', () => {
    assert.equal(isValidBearer('Bearer test-secreX', 'test-secret'), false);
  });

  it('rejects missing or malformed headers', () => {
    assert.equal(isValidBearer(undefined, 'test-secret'), false);
    assert.equal(isValidBearer('test-secret', 'test-secret'), false);
    assert.equal(isValidBearer('Bearer ', 'test-secret'), false);
  });
});
