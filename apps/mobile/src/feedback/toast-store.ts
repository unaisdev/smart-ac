import { create } from 'zustand';

export type ToastTone = 'success' | 'warning' | 'error';

export interface StackedToast {
  id: string;
  tone: ToastTone;
  title: string;
  message: string;
}

interface ToastState {
  toasts: StackedToast[];
  push: (toast: Omit<StackedToast, 'id'>) => string;
  dismiss: (id: string) => void;
}

const AUTO_DISMISS_MS = 3200;
const MAX_VISIBLE = 4;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }].slice(-MAX_VISIBLE),
    }));

    setTimeout(() => {
      get().dismiss(id);
    }, AUTO_DISMISS_MS);

    return id;
  },

  dismiss: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));
