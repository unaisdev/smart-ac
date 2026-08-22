import { create } from 'zustand';
import type { AirConditionerView, AirMode, AirState, FanSpeed } from '@smart-ac/shared';
import { mergeAirState } from '@smart-ac/shared';

import { apiClient } from '../config/api-client';

interface DevicesState {
  devices: AirConditionerView[];
  isLoading: boolean;
  isMutating: boolean;
  /** `null` until the first API attempt finishes; then mirrors last request outcome. */
  isBackendReachable: boolean | null;
  errorMessage: string | null;
  loadDevices: () => Promise<void>;
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


export const useDevicesStore = create<DevicesState>((set, get) => ({
  devices: [],
  isLoading: false,
  isMutating: false,
  isBackendReachable: null,
  errorMessage: null,

  getDevice: (id) => get().devices.find((device) => device.id === id),

  loadDevices: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
      const devices = await apiClient.listAirConditioners();
      set({ devices, isLoading: false, isBackendReachable: true });
    } catch (error) {
      set({
        isLoading: false,
        isBackendReachable: false,
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
        isBackendReachable: true,
      }));
    } catch (error) {
      set({
        isMutating: false,
        isBackendReachable: false,
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
        isBackendReachable: true,
      }));
    } catch (error) {
      set({
        isMutating: false,
        isBackendReachable: false,
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
        isBackendReachable: true,
      }));
    } catch (error) {
      set({
        isMutating: false,
        isBackendReachable: false,
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
        isBackendReachable: true,
      }));
    } catch (error) {
      set({
        isMutating: false,
        isBackendReachable: false,
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
        isBackendReachable: true,
      }));
    } catch (error) {
      set({
        isMutating: false,
        isBackendReachable: false,
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
        isBackendReachable: true,
      }));
    } catch (error) {
      set({
        isMutating: false,
        isBackendReachable: false,
        errorMessage: error instanceof Error ? error.message : 'No se pudo actualizar el estado',
      });
    }
  },
}));
