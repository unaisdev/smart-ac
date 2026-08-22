import { create } from 'zustand';
import type { AirConditionerSchedule, CreateScheduleInput } from '@smart-ac/shared';

import { apiClient } from '../config/api-client';

interface SchedulesState {
  schedules: AirConditionerSchedule[];
  isLoading: boolean;
  isMutating: boolean;
  errorMessage: string | null;
  loadSchedules: () => Promise<void>;
  createSchedule: (input: CreateScheduleInput) => Promise<AirConditionerSchedule | null>;
  updateSchedule: (
    id: string,
    input: CreateScheduleInput,
  ) => Promise<AirConditionerSchedule | null>;
  deleteSchedule: (id: string) => Promise<boolean>;
}

export const useSchedulesStore = create<SchedulesState>((set) => ({
  schedules: [],
  isLoading: false,
  isMutating: false,
  errorMessage: null,

  loadSchedules: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
      const schedules = await apiClient.listSchedules();
      set({ schedules, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        errorMessage: error instanceof Error ? error.message : 'No se pudieron cargar los programas',
      });
    }
  },

  createSchedule: async (input) => {
    set({ isMutating: true, errorMessage: null });
    try {
      const created = await apiClient.createSchedule(input);
      set((state) => ({
        schedules: [...state.schedules, created].sort((a, b) =>
          a.nextExecuteAt.localeCompare(b.nextExecuteAt),
        ),
        isMutating: false,
      }));
      return created;
    } catch (error) {
      set({
        isMutating: false,
        errorMessage: error instanceof Error ? error.message : 'No se pudo crear el programa',
      });
      return null;
    }
  },

  updateSchedule: async (id, input) => {
    set({ isMutating: true, errorMessage: null });
    try {
      const updated = await apiClient.updateSchedule(id, input);
      set((state) => ({
        schedules: state.schedules
          .map((item) => (item.id === id ? updated : item))
          .sort((a, b) => a.nextExecuteAt.localeCompare(b.nextExecuteAt)),
        isMutating: false,
      }));
      return updated;
    } catch (error) {
      set({
        isMutating: false,
        errorMessage: error instanceof Error ? error.message : 'No se pudo actualizar el programa',
      });
      return null;
    }
  },

  deleteSchedule: async (id) => {
    set({ isMutating: true, errorMessage: null });
    try {
      await apiClient.deleteSchedule(id);
      set((state) => ({
        schedules: state.schedules.filter((item) => item.id !== id),
        isMutating: false,
      }));
      return true;
    } catch (error) {
      set({
        isMutating: false,
        errorMessage: error instanceof Error ? error.message : 'No se pudo borrar el programa',
      });
      return false;
    }
  },
}));
