import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useDevicesStore } from '../stores/devices-store';

/**
 * Keeps the Zustand device list in sync with backend `onChanged` events via SSE.
 * Connects while the app is in the foreground; disconnects in background to save battery.
 */
export function useLiveDeviceSync(): void {
  useEffect(() => {
    const start = () => {
      useDevicesStore.getState().startLiveSync();
    };
    const stop = () => {
      useDevicesStore.getState().stopLiveSync();
    };

    start();

    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        start();
        void useDevicesStore.getState().loadDevices();
      } else if (nextState === 'background') {
        // Do not stop on iOS `inactive` (Control Center, transitions) — that dropped SSE mid-use.
        stop();
      }
    };

    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => {
      subscription.remove();
      stop();
    };
  }, []);
}
