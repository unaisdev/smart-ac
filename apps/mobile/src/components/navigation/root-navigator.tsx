import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from '../../theme/tokens';
import { DeviceListScreen } from '../screens/device-list-screen';
import { RemoteScreen } from '../screens/remote-screen';
import { ScreenNames, type RootStackParamList } from './screen-names';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

export const RootNavigator = () => {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName={ScreenNames.DeviceList}
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name={ScreenNames.DeviceList}
          component={DeviceListScreen}
          options={{ title: 'Smart AC' }}
        />
        <Stack.Screen
          name={ScreenNames.Remote}
          component={RemoteScreen}
          options={{ title: 'Mando' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
