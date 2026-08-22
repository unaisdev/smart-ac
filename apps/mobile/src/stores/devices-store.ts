import { create } from 'zustand';
import type { CommandResult } from '@smart-ac/api-client';
import type { AirConditionerView, AirMode, AirState, FanSpeed } from '@smart-ac/shared';
import { mergeAirState } from '@smart-ac/shared';

import { apiClient } from '../config/api-client';
import {
  showCommandError,
  showCommandSuccess,
  type CommandChange,
} from '../feedback/command-toast';

interface DevicesState {
  devices: AirConditionerView[];
  isLoading: boolean;
  isMutating: boolean;
  isLiveSyncConnected: boolean;
  errorMessage: string | null;
  loadDevices: () => Promise<void>;
  applyRemoteDevice: (device: AirConditionerView) => void;
  startLiveSync: () => void;
  stopLiveSync: () => void;
  setPower: (id: string, power: boolean) => Promise<void>;
  setTemperature: (id: string, temperature: number) => Promise<void>;
  setMode: (id: string, mode: AirMode) => Promise<void>;
  setFan: (id: string, fan: FanSpeed) => Promise<void>;
  setSwing: (id: string, swing: boolean) => Promise<void>;
  patchDesired: (id: string, patch: Partial<AirState>) => Promise<void>;
  getDevice: (id: string) => AirConditionerView | undefined;
}

function upsertDevice(devices: AirConditionerView[], next: AirConditionerView): AirConditionerView[] {
  const view: AirConditionerView = {
    id: next.id,
    name: next.name,
    location: next.location,
    desiredState: next.desiredState,
    reportedState: next.reportedState,
    online: next.online,
  };
  const index = devices.findIndex((device) => device.id === view.id);
  if (index === -1) {
    return [...devices, view];
  }
  const copy = [...devices];
  copy[index] = view;
  return copy;
}

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

let stopSubscription: (() => void) | null = null;

export const useDevicesStore = create<DevicesState>((set, get) => {
  const runCommand = async (
    execute: () => Promise<CommandResult>,
    change: CommandChange,
    fallbackError: string,
  ): Promise<void> => {
    set({ isMutating: true, errorMessage: null });
    try {
      const result = await execute();
      set((state) => ({
        devices: upsertDevice(state.devices, result),
        isMutating: false,
        errorMessage: result.commandSent ? null : 'No se pudo enviar la orden al controlador',
      }));
      showCommandSuccess(result, change);
    } catch (error) {
      const errorMessage = toErrorMessage(error, fallbackError);
      set({ isMutating: false, errorMessage });
      showCommandError(errorMessage);
    }
  };

  return {
    devices: [],
    isLoading: false,
    isMutating: false,
    isLiveSyncConnected: false,
    errorMessage: null,

    getDevice: (id) => get().devices.find((device) => device.id === id),

    applyRemoteDevice: (device) => {
      set((state) => ({
        devices: upsertDevice(state.devices, device),
      }));
    },

    startLiveSync: () => {
      if (stopSubscription) {
        return;
      }

      stopSubscription = apiClient.subscribeAirConditionerChanges(
        (device) => {
          get().applyRemoteDevice(device);
        },
        {
          onOpen: () => {
            set({ isLiveSyncConnected: true });
          },
          onError: () => {
            set({ isLiveSyncConnected: false });
          },
        },
      );
    },

    stopLiveSync: () => {
      stopSubscription?.();
      stopSubscription = null;
      set({ isLiveSyncConnected: false });
    },

    loadDevices: async () => {
      set({ isLoading: true, errorMessage: null });
      try {
        const devices = await apiClient.listAirConditioners();
        set({ devices, isLoading: false });
      } catch (error) {
        const errorMessage = toErrorMessage(error, 'No se pudo cargar la lista');
        set({
          isLoading: false,
          errorMessage,
        });
        showCommandError(errorMessage);
      }
    },

    setPower: async (id, power) => {
      await runCommand(
        () => apiClient.setPower(id, power),
        { kind: 'power', power },
        'No se pudo cambiar el power',
      );
    },

    setTemperature: async (id, temperature) => {
      await runCommand(
        () => apiClient.setTemperature(id, temperature),
        { kind: 'temperature', temperature },
        'No se pudo cambiar la temperatura',
      );
    },

    setMode: async (id, mode) => {
      await runCommand(
        () => apiClient.setMode(id, mode),
        { kind: 'mode', mode },
        'No se pudo cambiar el modo',
      );
    },

    setFan: async (id, fan) => {
      await runCommand(
        () => apiClient.setFan(id, fan),
        { kind: 'fan', fan },
        'No se pudo cambiar el ventilador',
      );
    },

    setSwing: async (id, swing) => {
      await runCommand(
        () => apiClient.setSwing(id, swing),
        { kind: 'swing', swing },
        'No se pudo cambiar el swing',
      );
    },

    patchDesired: async (id, patch) => {
      const current = get().getDevice(id);
      if (!current) {
        const errorMessage = `Dispositivo no encontrado: ${id}`;
        set({ errorMessage });
        showCommandError(errorMessage);
        return;
      }

      const nextState = mergeAirState(current.desiredState, patch);
      await runCommand(
        () => apiClient.setState(id, nextState),
        { kind: 'patch', patch },
        'No se pudo actualizar el estado',
      );
    },
  };
});
