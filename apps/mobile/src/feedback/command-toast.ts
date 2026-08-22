import type { CommandResult } from '@smart-ac/api-client';
import type { AirMode, AirState, FanSpeed } from '@smart-ac/shared';

import { formatFanLabel, formatModeLabel } from '../utils/air-labels';
import { useToastStore } from './toast-store';

export type CommandChange =
  | { kind: 'power'; power: boolean }
  | { kind: 'temperature'; temperature: number }
  | { kind: 'mode'; mode: AirMode }
  | { kind: 'fan'; fan: FanSpeed }
  | { kind: 'swing'; swing: boolean }
  | { kind: 'patch'; patch: Partial<AirState> };

function formatPower(power: boolean): string {
  return power ? 'ON' : 'OFF';
}

function formatChangeLabel(change: CommandChange): string {
  switch (change.kind) {
    case 'power':
      return `Power → ${formatPower(change.power)}`;
    case 'temperature':
      return `Temperatura → ${change.temperature}°C`;
    case 'mode':
      return `Modo → ${formatModeLabel(change.mode)}`;
    case 'fan':
      return `Ventilador → ${formatFanLabel(change.fan)}`;
    case 'swing':
      return `Swing → ${formatPower(change.swing)}`;
    case 'patch': {
      const entries = Object.entries(change.patch);
      if (entries.length === 0) {
        return 'Estado actualizado';
      }
      return entries
        .map(([key, value]) => {
          if (typeof value === 'boolean') {
            return `${key[0]?.toUpperCase() ?? ''}${key.slice(1)} → ${formatPower(value)}`;
          }
          return `${key} → ${String(value)}`;
        })
        .join(' · ');
    }
  }
}

function formatContextMessage(change: CommandChange, result: CommandResult): string {
  const changeLabel = formatChangeLabel(change);
  const powerNow = formatPower(result.desiredState.power);
  const device = result.name;

  if (change.kind === 'power') {
    return `${device}: ${changeLabel}`;
  }

  return `${device}: ${changeLabel} · ahora ${powerNow}`;
}

export function showCommandSuccess(result: CommandResult, change: CommandChange): void {
  const message = formatContextMessage(change, result);

  if (result.commandSent) {
    useToastStore.getState().push({
      tone: 'success',
      title: 'Orden recibida',
      message,
    });
    return;
  }

  const offlineNote = result.online
    ? 'Guardado, pero el controlador no confirmó el envío.'
    : 'Guardado. El controlador está offline.';

  useToastStore.getState().push({
    tone: 'warning',
    title: 'Orden no enviada',
    message: `${message} · ${offlineNote}`,
  });
}

export function showCommandError(message: string): void {
  useToastStore.getState().push({
    tone: 'error',
    title: 'Error al enviar',
    message,
  });
}
