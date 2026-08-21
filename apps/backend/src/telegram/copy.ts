import type { AirConditionerView, AirMode, FanSpeed } from '@smart-ac/shared';

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

export function formatHomeText(airs: AirConditionerView[]): string {
  const lines = ['🏠 Mis aires', ''];
  for (const air of airs) {
    const icon = airIcon(air);
    lines.push(`${icon} ${air.name}`);
    lines.push(formatDesiredOneLiner(air));
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

export function formatControlText(air: AirConditionerView): string {
  const state = air.desiredState;
  const modeLine = state.power ? MODE_LABEL[state.mode] : '⏻ OFF';

  return [
    `${airIcon(air)} ${air.name}`,
    '',
    'Última orden:',
    modeLine,
    `🌡 ${state.temperature}°C`,
    `🌀 ${FAN_LABEL[state.fan]}`,
    `↕️ SWING ${state.swing ? 'ON' : 'OFF'}`,
    `⚡ TURBO ${state.turbo ? 'ON' : 'OFF'}`,
    `🌱 ECO ${state.eco ? 'ON' : 'OFF'}`,
  ].join('\n');
}

export function formatDesiredOneLiner(air: AirConditionerView): string {
  const state = air.desiredState;
  if (!state.power) {
    return '⏻ OFF';
  }
  return `${MODE_LABEL[state.mode]} · ${state.temperature}°C`;
}

export function formatCommandResult(air: AirConditionerView, commandSent: boolean): string {
  const note = commandSent
    ? 'Orden enviada (estado deseado, no confirmado por el aire).'
    : 'No se pudo enviar la orden.';
  return `${formatControlText(air)}\n\n${note}`;
}

function airIcon(air: AirConditionerView): string {
  if (air.id === 'ac-dormitorio' || air.location.toLowerCase().includes('dormitorio')) {
    return '🛏';
  }
  return '🛋';
}
