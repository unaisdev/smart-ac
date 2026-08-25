import { create } from 'zustand';
import type { CommandResult } from '@smart-ac/api-client';
import type { AirConditionerView } from '@smart-ac/shared';

import { apiClient } from '../config/api-client';
import { showCommandError, showCommandSuccess } from '../feedback/command-toast';

interface DevicesState {
  devices: AirConditionerView[];
  isLoading: boolean;
  isMutating: boolean;
  /** `null` until the first API attempt finishes; then mirrors last request outcome. */
  isBackendReachable: boolean | null;
  isLiveSyncConnected: boolean;
  errorMessage: string | null;
  loadDevices: () => Promise<void>;
  applyRemoteDevice: (device: AirConditionerView) => void;
  startLiveSync: () => void;
  stopLiveSync: () => void;
  setPower: (id: string, power: boolean) => Promise<void>;
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

export const useDevicesStore = create<DevicesState>((set, get) => ({
  devices: [],
  isLoading: false,
  isMutating: false,
  isBackendReachable: null,
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
      set({ devices, isLoading: false, isBackendReachable: true });
    } catch (error) {
      const errorMessage = toErrorMessage(error, 'No se pudo cargar la lista');
      set({
        isLoading: false,
        isBackendReachable: false,
        errorMessage,
      });
      showCommandError(errorMessage);
    }
  },

  setPower: async (id, power) => {
    set({ isMutating: true, errorMessage: null });
    try {
      const result: CommandResult = await apiClient.setPower(id, power);
      set((state) => ({
        devices: upsertDevice(state.devices, result),
        isMutating: false,
        isBackendReachable: true,
        errorMessage: result.commandSent ? null : 'No se pudo enviar la orden al controlador',
      }));
      showCommandSuccess(result, { kind: 'power', power });
    } catch (error) {
      const errorMessage = toErrorMessage(error, 'No se pudo cambiar el power');
      set({ isMutating: false, isBackendReachable: false, errorMessage });
      showCommandError(errorMessage);
    }
  },
}));
