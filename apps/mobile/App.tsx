import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/components/navigation/root-navigator';
import { ToastHost } from './src/feedback/toast-host';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <RootNavigator />
      <ToastHost />
    </SafeAreaProvider>
  );
}
