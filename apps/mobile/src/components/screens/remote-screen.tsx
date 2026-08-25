import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useDevicesStore } from '../../stores/devices-store';
import { createStyles } from '../../theme/create-styles';
import { colors, spacing, typography } from '../../theme/tokens';
import { formatDesiredSummary } from '../../utils/air-labels';
import { PowerButton } from '../base/power-button';
import { ScreenNames, type RootStackParamList } from '../navigation/screen-names';

type Props = NativeStackScreenProps<RootStackParamList, typeof ScreenNames.Remote>;

export const RemoteScreen = ({ route }: Props) => {
  const { deviceId } = route.params;
  const device = useDevicesStore((state) =>
    state.devices.find((item) => item.id === deviceId),
  );
  const isMutating = useDevicesStore((state) => state.isMutating);
  const errorMessage = useDevicesStore((state) => state.errorMessage);
  const setPower = useDevicesStore((state) => state.setPower);

  if (!device) {
    return (
      <View style={styles.screen}>
        <Text style={styles.error}>Dispositivo no encontrado</Text>
      </View>
    );
  }

  const { desiredState } = device;
  const summary = formatDesiredSummary(desiredState.power);

  const handleTogglePower = () => {
    void setPower(device.id, !desiredState.power);
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.name}>{device.name}</Text>
      <Text style={styles.summary}>Última orden: {summary}</Text>
      <Text style={styles.online}>
        {device.online ? '🟢 Controlador en línea' : '⚫ Controlador offline'}
      </Text>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <PowerButton
        isPoweredOn={desiredState.power}
        isDisabled={isMutating}
        onPress={handleTogglePower}
      />
    </View>
  );
};

const styles = createStyles({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.m,
    gap: spacing.m,
  },
  name: {
    ...typography.title,
    color: colors.text,
  },
  summary: {
    ...typography.body,
    color: colors.textMuted,
  },
  online: {
    ...typography.caption,
    color: colors.textMuted,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
