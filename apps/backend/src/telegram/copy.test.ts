import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_AIR_STATE, type AirConditionerView } from '@smart-ac/shared';
import { isAuthorizedTelegramUser } from './auth.ts';
import { formatControlText, formatDesiredOneLiner, formatHomeText } from './copy.ts';

describe('isAuthorizedTelegramUser', () => {
  it('allows only listed numeric ids', () => {
    assert.equal(isAuthorizedTelegramUser(111, [111, 222]), true);
    assert.equal(isAuthorizedTelegramUser(333, [111, 222]), false);
  });
});

describe('telegram copy', () => {
  const salon: AirConditionerView = {
    id: 'ac-salon',
    name: 'Salón',
    location: 'Salón',
    desiredState: { ...DEFAULT_AIR_STATE, power: true, mode: 'cool', temperature: 24 },
    reportedState: null,
    online: false,
  };

  const bedroom: AirConditionerView = {
    id: 'ac-dormitorio',
    name: 'Dormitorio',
    location: 'Dormitorio',
    desiredState: { ...DEFAULT_AIR_STATE, power: false },
    reportedState: null,
    online: false,
  };

  it('shows last desired order, not confirmed AC state', () => {
    const text = formatControlText(salon);
    assert.match(text, /Última orden/);
    assert.doesNotMatch(text, /está encendido/);
    assert.match(text, /❄️ COOL/);
  });

  it('summarizes off units as OFF', () => {
    assert.equal(formatDesiredOneLiner(bedroom), '⏻ OFF');
  });

  it('lists both airs on the home screen', () => {
    const text = formatHomeText([salon, bedroom]);
    assert.match(text, /Salón/);
    assert.match(text, /Dormitorio/);
    assert.match(text, /OFF/);
  });
});
