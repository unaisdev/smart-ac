import type { AirConditionerView, AirMode, AirState, FanSpeed } from '@smart-ac/shared';
import type { AirConditionerSchedule } from '../domain/schedule.ts';
import { applyLeadMinutes, formatClock, zonedParts } from '../domain/schedule-time.ts';
import type { ScheduleDraft } from './schedule-draft.ts';

const MODE_LABEL: Record<AirMode, string> = {
  auto: 'AUTO',
  cool: '❄️ COOL',
  dry: '💧 DRY',
  heat: '🔥 HEAT',
  fan: '🌀 FAN',
};

const FAN_LABEL: Record<FanSpeed, string> = {
  auto: 'AUTO',
  low: 'LOW',
  medium: 'MED',
  high: 'HIGH',
};

export function formatLeadLabel(minutes: number): string {
  if (minutes === 0) {
    return 'A esa hora';
  }
  if (minutes < 60) {
    return `${minutes} min antes`;
  }
  const hours = minutes / 60;
  if (Number.isInteger(hours)) {
    return hours === 1 ? '1 h antes' : `${hours} h antes`;
  }
  const whole = Math.floor(hours);
  const rest = minutes % 60;
  return `${whole} h ${rest} min antes`;
}

export function formatStateOneLiner(state: AirState): string {
  if (!state.power) {
    return '⏻ OFF';
  }
  return `${MODE_LABEL[state.mode]} · ${state.temperature}°C · ${FAN_LABEL[state.fan]}`;
}

export function formatScheduleLine(schedule: AirConditionerSchedule, airName: string, now: Date, timeZone: string): string {
  const when = formatWhen(schedule);
  const next = formatNext(schedule.nextExecuteAt, now, timeZone);
  return `• ${airName} · ${when}\n  ${formatStateOneLiner(schedule.state)}\n  Próxima orden: ${next}`;
}

export function formatScheduleListText(
  schedules: AirConditionerSchedule[],
  airs: AirConditionerView[],
  now: Date,
  timeZone: string,
): string {
  if (schedules.length === 0) {
    return '📋 No hay programas.\n\nUsa /schedule para crear uno (p. ej. 1 h antes de las 08:00).';
  }

  const names = new Map(airs.map((air) => [air.id, air.name]));
  const lines = ['📋 Programas', ''];
  for (const schedule of schedules) {
    lines.push(formatScheduleLine(schedule, names.get(schedule.airConditionerId) ?? schedule.airConditionerId, now, timeZone));
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

export function formatWizardText(draft: ScheduleDraft, airs: AirConditionerView[]): string {
  const airName = airs.find((air) => air.id === draft.airConditionerId)?.name;
  const progress = formatProgress(draft, airName);

  switch (draft.step) {
    case 'air':
      return ['⏰ Programar aire', '', '¿Qué aire quieres programar?'].join('\n');
    case 'time':
      return [progress, '', '¿A qué hora quieres el ambiente?', '(p. ej. la hora a la que os levantáis)'].join('\n');
    case 'hour':
      return [progress, '', 'Elige la hora.'].join('\n');
    case 'minute':
      return [progress, '', 'Elige los minutos.'].join('\n');
    case 'lead':
      return [progress, '', '¿Con cuánta antelación enviamos la orden?'].join('\n');
    case 'repeat':
      return [progress, '', '¿Una sola vez o todos los días?'].join('\n');
    case 'state':
      return [
        progress,
        '',
        'Configura cómo debe quedar el aire.',
        formatStateDetails(draft.state),
        '',
        'Esto es la orden programada, no una confirmación del aparato.',
      ].join('\n');
    case 'confirm':
      return [
        '⏰ Confirmar programa',
        '',
        formatProgress(draft, airName),
        '',
        formatStateDetails(draft.state),
        '',
        'El backend enviará la orden a esa hora (estado deseado).',
      ].join('\n');
  }
}

export function formatScheduleSaved(airName: string, draft: ScheduleDraft): string {
  return [
    '✅ Programa guardado',
    '',
    formatProgress(draft, airName),
    formatStateDetails(draft.state),
  ].join('\n');
}

function formatProgress(draft: ScheduleDraft, airName: string | undefined): string {
  const lines = ['⏰ Programa'];
  if (airName) {
    lines.push(airName);
  }
  if (draft.targetHour !== undefined && draft.targetMinute !== undefined) {
    const target = formatClock(draft.targetHour, draft.targetMinute);
    if (draft.leadMinutes !== undefined) {
      const execute = applyLeadMinutes(draft.targetHour, draft.targetMinute, draft.leadMinutes);
      lines.push(`${formatLeadLabel(draft.leadMinutes)} de las ${target} → ${formatClock(execute.hour, execute.minute)}`);
    } else {
      lines.push(`Objetivo: ${target}`);
    }
  }
  if (draft.repeat) {
    lines.push(draft.repeat === 'daily' ? 'Todos los días' : 'Una vez');
  }
  return lines.join('\n');
}

function formatStateDetails(state: AirState): string {
  if (!state.power) {
    return '⏻ OFF';
  }
  return [
    MODE_LABEL[state.mode],
    `🌡 ${state.temperature}°C`,
    `🌀 ${FAN_LABEL[state.fan]}`,
    `↕️ SWING ${state.swing ? 'ON' : 'OFF'}`,
    `⚡ TURBO ${state.turbo ? 'ON' : 'OFF'}`,
    `🌱 ECO ${state.eco ? 'ON' : 'OFF'}`,
    `💡 LED ${state.led ? 'ON' : 'OFF'}`,
  ].join('\n');
}

function formatWhen(schedule: AirConditionerSchedule): string {
  const target = formatClock(schedule.targetHour, schedule.targetMinute);
  const execute = formatClock(schedule.executeHour, schedule.executeMinute);
  const repeat = schedule.repeat === 'daily' ? 'diario' : 'una vez';
  if (schedule.leadMinutes === 0) {
    return `${repeat} ${execute}`;
  }
  return `${repeat} ${execute} (${formatLeadLabel(schedule.leadMinutes)} de ${target})`;
}

function formatNext(iso: string, now: Date, timeZone: string): string {
  const at = new Date(iso);
  const parts = zonedParts(at, timeZone);
  const clock = formatClock(parts.hour, parts.minute);
  const today = zonedParts(now, timeZone);
  const isToday =
    parts.year === today.year && parts.month === today.month && parts.day === today.day;
  return isToday ? `hoy ${clock}` : `${parts.day}/${parts.month} ${clock}`;
}
