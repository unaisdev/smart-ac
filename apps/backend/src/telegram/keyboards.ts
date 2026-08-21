import { InlineKeyboard } from 'grammy';
import type { AirConditionerView } from '@smart-ac/shared';

export function homeKeyboard(airs: AirConditionerView[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const air of airs) {
    const icon = air.id === 'ac-dormitorio' ? '🛏' : '🛋';
    keyboard.text(`${icon} ${air.name}`, `s:${air.id}`).row();
  }
  keyboard.text('⏰ Programar', 'prg:new').text('📋 Programas', 'prg:list');
  return keyboard;
}

export function controlKeyboard(air: AirConditionerView): InlineKeyboard {
  const id = air.id;
  const powerLabel = air.desiredState.power ? '🔴 Apagar' : '🟢 Encender';
  const nextPower = air.desiredState.power ? '0' : '1';

  return new InlineKeyboard()
    .text(powerLabel, `p:${id}:${nextPower}`)
    .row()
    .text('❄️ Frío', `m:${id}:cool`)
    .text('🔥 Calor', `m:${id}:heat`)
    .row()
    .text('💧 Dry', `m:${id}:dry`)
    .text('AUTO', `m:${id}:auto`)
    .row()
    .text('➖', `t:${id}:-`)
    .text(`${air.desiredState.temperature}°C`, `r:${id}`)
    .text('➕', `t:${id}:+`)
    .row()
    .text('🌀 AUTO', `f:${id}:auto`)
    .text('LOW', `f:${id}:low`)
    .text('MED', `f:${id}:medium`)
    .text('HI', `f:${id}:high`)
    .row()
    .text(air.desiredState.swing ? '↕️ Swing ON' : '↕️ Swing', `w:${id}`)
    .text(air.desiredState.turbo ? '⚡ Turbo ON' : '⚡ Turbo', `u:${id}`)
    .row()
    .text(air.desiredState.eco ? '🌱 Eco ON' : '🌱 Eco', `e:${id}`)
    .text(air.desiredState.led ? '💡 LED ON' : '💡 LED', `d:${id}`)
    .row()
    .text('🔄 Actualizar', `r:${id}`)
    .text('⬅️ Aires', 'l');
}
