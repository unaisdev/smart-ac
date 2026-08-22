import { create } from 'zustand';
import type { AirConditionerView, AirMode, AirState, FanSpeed } from '@smart-ac/shared';
import { mergeAirState } from '@smart-ac/shared';

import { apiClient } from '../config/api-client';

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

let stopSubscription: (() => void) | null = null;

export const useDevicesStore = create<DevicesState>((set, get) => ({
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
      set({
        isLoading: false,
        errorMessage: error instanceof Error ? error.message : 'No se pudo cargar la lista',
      });
    }
  },

  setPower: async (id, power) => {
    set({ isMutating: true, errorMessage: null });
    try {
      const result = await apiClient.setPower(id, power);
      set((state) => ({
        devices: upsertDevice(state.devices, result),
        isMutating: false,
      }));
    } catch (error) {
      set({
        isMutating: false,
        errorMessage: error instanceof Error ? error.message : 'No se pudo cambiar el power',
      });
    }
  },

  setTemperature: async (id, temperature) => {
    set({ isMutating: true, errorMessage: null });
    try {
      const result = await apiClient.setTemperature(id, temperature);
      set((state) => ({
        devices: upsertDevice(state.devices, result),
        isMutating: false,
      }));
    } catch (error) {
      set({
        isMutating: false,
        errorMessage: error instanceof Error ? error.message : 'No se pudo cambiar la temperatura',
      });
    }
  },

  setMode: async (id, mode) => {
    set({ isMutating: true, errorMessage: null });
    try {
      const result = await apiClient.setMode(id, mode);
      set((state) => ({
        devices: upsertDevice(state.devices, result),
        isMutating: false,
      }));
    } catch (error) {
      set({
        isMutating: false,
        errorMessage: error instanceof Error ? error.message : 'No se pudo cambiar el modo',
      });
    }
  },

  setFan: async (id, fan) => {
    set({ isMutating: true, errorMessage: null });
    try {
      const result = await apiClient.setFan(id, fan);
      set((state) => ({
        devices: upsertDevice(state.devices, result),
        isMutating: false,
      }));
    } catch (error) {
      set({
        isMutating: false,
        errorMessage: error instanceof Error ? error.message : 'No se pudo cambiar el ventilador',
      });
    }
  },

  setSwing: async (id, swing) => {
    set({ isMutating: true, errorMessage: null });
    try {
      const result = await apiClient.setSwing(id, swing);
      set((state) => ({
        devices: upsertDevice(state.devices, result),
        isMutating: false,
      }));
    } catch (error) {
      set({
        isMutating: false,
        errorMessage: error instanceof Error ? error.message : 'No se pudo cambiar el swing',
      });
    }
  },

  patchDesired: async (id, patch) => {
    const current = get().getDevice(id);
    if (!current) {
      set({ errorMessage: `Dispositivo no encontrado: ${id}` });
      return;
    }

    set({ isMutating: true, errorMessage: null });
    try {
      const nextState = mergeAirState(current.desiredState, patch);
      const result = await apiClient.setState(id, nextState);
      set((state) => ({
        devices: upsertDevice(state.devices, result),
        isMutating: false,
      }));
    } catch (error) {
      set({
        isMutating: false,
        errorMessage: error instanceof Error ? error.message : 'No se pudo actualizar el estado',
      });
    }
  },
}));
