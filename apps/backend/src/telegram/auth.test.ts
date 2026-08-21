import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseTelegramUserIds } from '../config.ts';

describe('parseTelegramUserIds', () => {
  it('parses a comma-separated whitelist', () => {
    assert.deepEqual(parseTelegramUserIds('123, 456'), [123, 456]);
  });

  it('returns empty when unset', () => {
    assert.deepEqual(parseTelegramUserIds(undefined), []);
    assert.deepEqual(parseTelegramUserIds(''), []);
  });

  it('rejects usernames', () => {
    assert.throws(() => parseTelegramUserIds('unai'), /Invalid TELEGRAM_ALLOWED_USER_IDS/);
  });
});
