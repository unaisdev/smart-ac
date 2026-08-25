import { InlineKeyboard } from 'grammy';
import type { AirConditionerView } from '@smart-ac/shared';

export function homeKeyboard(airs: AirConditionerView[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const air of airs) {
    const icon = air.id === 'ac-dormitorio' ? '🛏' : '🛋';
    keyboard.text(`${icon} ${air.name}`, `s:${air.id}`).row();
  }
  return keyboard;
}

export function controlKeyboard(air: AirConditionerView): InlineKeyboard {
  const id = air.id;
  const powerLabel = air.desiredState.power ? '🔴 Apagar' : '🟢 Encender';
  const nextPower = air.desiredState.power ? '0' : '1';

  return new InlineKeyboard()
    .text(powerLabel, `p:${id}:${nextPower}`)
    .row()
    .text('🔄 Actualizar', `r:${id}`)
    .text('⬅️ Aires', 'l');
}
