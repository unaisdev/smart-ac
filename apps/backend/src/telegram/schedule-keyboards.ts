import { InlineKeyboard } from 'grammy';
import type { AirConditionerView } from '@smart-ac/shared';
import type { AirConditionerSchedule } from '../domain/schedule.ts';
import { formatClock } from '../domain/schedule-time.ts';
import { formatLeadLabel } from './schedule-copy.ts';
import { LEAD_PRESETS, TIME_PRESETS, type ScheduleDraft } from './schedule-draft.ts';

export function wizardKeyboard(draft: ScheduleDraft, airs: AirConditionerView[]): InlineKeyboard {
  switch (draft.step) {
    case 'air':
      return airStepKeyboard(airs);
    case 'time':
      return timeStepKeyboard();
    case 'hour':
      return hourStepKeyboard();
    case 'minute':
      return minuteStepKeyboard();
    case 'lead':
      return leadStepKeyboard();
    case 'repeat':
      return repeatStepKeyboard();
    case 'state':
      return stateStepKeyboard(draft);
    case 'confirm':
      return confirmStepKeyboard();
  }
}

export function scheduleListKeyboard(
  schedules: AirConditionerSchedule[],
  airs: AirConditionerView[],
): InlineKeyboard {
  const names = new Map(airs.map((air) => [air.id, air.name]));
  const keyboard = new InlineKeyboard();
  for (const schedule of schedules) {
    const name = names.get(schedule.airConditionerId) ?? schedule.airConditionerId;
    const when = formatClock(schedule.executeHour, schedule.executeMinute);
    keyboard.text(`🗑 ${name} ${when}`, `prg:rm:${schedule.id}`).row();
  }
  keyboard.text('➕ Nuevo', 'prg:new').text('⬅️ Aires', 'prg:home');
  return keyboard;
}

function airStepKeyboard(airs: AirConditionerView[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const air of airs) {
    const icon = air.id === 'ac-dormitorio' ? '🛏' : '🛋';
    keyboard.text(`${icon} ${air.name}`, `prg:air:${air.id}`).row();
  }
  keyboard.text('❌ Cancelar', 'prg:ca');
  return keyboard;
}

function timeStepKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  TIME_PRESETS.forEach((preset, index) => {
    keyboard.text(formatClock(preset.hour, preset.minute), `prg:tm:${preset.hour}:${preset.minute}`);
    if (index % 2 === 1) {
      keyboard.row();
    }
  });
  keyboard.row().text('⏱ Otra hora', 'prg:ct').row().text('⬅️ Atrás', 'prg:bk').text('❌ Cancelar', 'prg:ca');
  return keyboard;
}

function hourStepKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (let hour = 0; hour < 24; hour += 1) {
    keyboard.text(String(hour).padStart(2, '0'), `prg:hr:${hour}`);
    if (hour % 4 === 3) {
      keyboard.row();
    }
  }
  keyboard.text('⬅️ Atrás', 'prg:bk').text('❌ Cancelar', 'prg:ca');
  return keyboard;
}

function minuteStepKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('00', 'prg:mn:0')
    .text('15', 'prg:mn:15')
    .text('30', 'prg:mn:30')
    .text('45', 'prg:mn:45')
    .row()
    .text('⬅️ Atrás', 'prg:bk')
    .text('❌ Cancelar', 'prg:ca');
}

function leadStepKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  LEAD_PRESETS.forEach((minutes, index) => {
    keyboard.text(formatLeadLabel(minutes), `prg:le:${minutes}`);
    if (index % 2 === 1) {
      keyboard.row();
    }
  });
  keyboard.row().text('⬅️ Atrás', 'prg:bk').text('❌ Cancelar', 'prg:ca');
  return keyboard;
}

function repeatStepKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📅 Todos los días', 'prg:rp:daily')
    .row()
    .text('1️⃣ Una vez', 'prg:rp:once')
    .row()
    .text('⬅️ Atrás', 'prg:bk')
    .text('❌ Cancelar', 'prg:ca');
}

function stateStepKeyboard(draft: ScheduleDraft): InlineKeyboard {
  const powerLabel = draft.state.power ? '🔴 Apagar' : '🟢 Encender';
  const nextPower = draft.state.power ? '0' : '1';

  return new InlineKeyboard()
    .text(powerLabel, `prg:pw:${nextPower}`)
    .row()
    .text('❄️ Frío', 'prg:md:cool')
    .text('🔥 Calor', 'prg:md:heat')
    .row()
    .text('💧 Dry', 'prg:md:dry')
    .text('AUTO', 'prg:md:auto')
    .row()
    .text('➖', 'prg:tp:-')
    .text(`${draft.state.temperature}°C`, 'prg:st')
    .text('➕', 'prg:tp:+')
    .row()
    .text('🌀 AUTO', 'prg:fn:auto')
    .text('LOW', 'prg:fn:low')
    .text('MED', 'prg:fn:medium')
    .text('HI', 'prg:fn:high')
    .row()
    .text(draft.state.swing ? '↕️ Swing ON' : '↕️ Swing', 'prg:tg:swing')
    .text(draft.state.turbo ? '⚡ Turbo ON' : '⚡ Turbo', 'prg:tg:turbo')
    .row()
    .text(draft.state.eco ? '🌱 Eco ON' : '🌱 Eco', 'prg:tg:eco')
    .text(draft.state.led ? '💡 LED ON' : '💡 LED', 'prg:tg:led')
    .row()
    .text('➡️ Continuar', 'prg:nx')
    .row()
    .text('⬅️ Atrás', 'prg:bk')
    .text('❌ Cancelar', 'prg:ca');
}

function confirmStepKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Guardar', 'prg:ok')
    .text('❌ Cancelar', 'prg:ca')
    .row()
    .text('⬅️ Atrás', 'prg:bk');
}
