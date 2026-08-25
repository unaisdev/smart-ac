import type { CommandResult } from '@smart-ac/api-client';

import { formatDesiredSummary } from '../utils/air-labels';
import { useToastStore } from './toast-store';

export interface CommandChange {
  kind: 'power';
  power: boolean;
}

function formatChangeLabel(change: CommandChange): string {
  return `Power → ${formatDesiredSummary(change.power)}`;
}

export function showCommandSuccess(result: CommandResult, change: CommandChange): void {
  const message = `${result.name}: ${formatChangeLabel(change)}`;

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
