import type { AirConditionerView } from '@smart-ac/shared';

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
  return [`${airIcon(air)} ${air.name}`, '', formatDesiredOneLiner(air)].join('\n');
}

export function formatDesiredOneLiner(air: AirConditionerView): string {
  return air.desiredState.power ? 'Última orden: ON' : 'Última orden: OFF';
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
